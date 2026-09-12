"""
Week 3 tests (Monday: "adjust compiler to respect resource-limit metadata").

Covers:
  - the manifest carrying a `resource_limits` block (format_version 2.0)
  - per-plugin overrides and rejection of invalid limits
  - the runner enforcing the fuel budget (infinite loops terminate)
  - the runner enforcing the memory cap without crashing the host
  - the API accepting/echoing resource_limits and 422ing on bad ones
"""

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import api as api_module  # noqa: E402
from compiler import (  # noqa: E402
    DEFAULT_RESOURCE_LIMITS,
    PLUGIN_FORMAT_VERSION,
    ResourceLimitError,
    compile_source,
    package_artifact,
    unpack_artifact,
)
from runner import PluginRunner  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(api_module, "PLUGINS_DIR", tmp_path / "plugins")
    monkeypatch.setattr(api_module, "ARTIFACTS_DIR", tmp_path / "artifacts")
    return TestClient(api_module.app)


@pytest.fixture(scope="module")
def runner():
    return PluginRunner()


# ------------------------------------------------------------ Monday -------

def test_manifest_carries_default_resource_limits(tmp_path):
    plugin = compile_source(b"print('x')\n", tmp_path, "limited")

    manifest = json.loads(plugin.manifest_path.read_text(encoding="utf-8"))
    assert manifest["format_version"] == PLUGIN_FORMAT_VERSION == "2.0"
    assert manifest["resource_limits"] == DEFAULT_RESOURCE_LIMITS
    assert manifest["resource_limits"]["max_memory_bytes"] > 0
    assert manifest["resource_limits"]["max_fuel"] > 0
    assert manifest["resource_limits"]["timeout_ms"] == 50


def test_custom_resource_limits_override(tmp_path):
    custom = {"max_memory_bytes": 64 * 1024 * 1024, "max_fuel": 2_000_000_000, "timeout_ms": 250}
    plugin = compile_source(b"print('x')\n", tmp_path, "custom", resource_limits=custom)

    manifest = json.loads(plugin.manifest_path.read_text(encoding="utf-8"))
    assert manifest["resource_limits"] == custom
    assert plugin.resource_limits == custom


def test_partial_override_merges_with_defaults(tmp_path):
    plugin = compile_source(b"print('x')\n", tmp_path, "partial", resource_limits={"max_fuel": 123})

    manifest = json.loads(plugin.manifest_path.read_text(encoding="utf-8"))
    limits = manifest["resource_limits"]
    assert limits["max_fuel"] == 123
    assert limits["max_memory_bytes"] == DEFAULT_RESOURCE_LIMITS["max_memory_bytes"]


@pytest.mark.parametrize(
    "bad_limits",
    [
        {"max_bogus": 100},
        {"max_fuel": "lots"},
        {"max_fuel": -5},
        {"max_fuel": 0},
        {"max_memory_bytes": 1},            # below the 1 MB floor
        {"timeout_ms": 999999},             # above the 60 s ceiling
        {"max_memory_bytes": 8.5},          # non-integer
    ],
)
def test_invalid_resource_limits_rejected(tmp_path, bad_limits):
    with pytest.raises(ResourceLimitError):
        compile_source(b"print('x')\n", tmp_path, "bad", resource_limits=bad_limits)


def test_api_accepts_and_echoes_resource_limits(client):
    resp = client.post(
        "/plugins",
        json={"name": "greet", "source": "print('hi')\n", "resource_limits": {"max_fuel": 5_000_000_000}},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["format_version"] == "2.0"
    assert body["resource_limits"]["max_fuel"] == 5_000_000_000
    assert body["resource_limits"]["max_memory_bytes"] == DEFAULT_RESOURCE_LIMITS["max_memory_bytes"]


def test_api_rejects_invalid_resource_limits(client):
    resp = client.post(
        "/plugins",
        json={"name": "bad", "source": "print('hi')\n", "resource_limits": {"max_fuel": -1}},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"]["error_code"] == "invalid_resource_limits"


def test_artifact_round_trip_preserves_resource_limits(tmp_path):
    plugin = compile_source(b"print('x')\n", tmp_path / "plugins", "roundtrip", resource_limits={"max_fuel": 7})
    artifact = package_artifact(plugin.plugin_dir, tmp_path / "artifacts")
    restored = unpack_artifact(artifact, tmp_path / "restored")

    manifest = json.loads((restored / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["resource_limits"]["max_fuel"] == 7


# ------------------------------------------------------------ Tuesday ------

def test_while_true_loop_terminates_via_fuel(runner, tmp_path):
    plugin = compile_source(b"while True:\n    pass\n", tmp_path, "infinite")

    result = runner.run(plugin.plugin_dir)

    assert result.limit_hit == "fuel"
    assert result.ok is False
    assert result.elapsed_ms < 2000  # deterministic kill, not a hang
    assert result.fuel_consumed == DEFAULT_RESOURCE_LIMITS["max_fuel"]  # budget fully spent


def test_normal_plugin_still_runs_under_default_limits(runner, tmp_path):
    plugin = compile_source(b"print(2 + 2)\n", tmp_path, "healthy")

    result = runner.run(plugin.plugin_dir)

    assert result.ok, f"stderr: {result.stderr}"
    assert result.stdout == "4\n"
    assert result.limit_hit is None
    assert 0 < result.fuel_consumed < DEFAULT_RESOURCE_LIMITS["max_fuel"]


def test_memory_bomb_fails_gracefully_without_crashing_host(runner, tmp_path):
    # 128 MB request against the 32 MB default cap -> MemoryError inside the
    # sandbox, host process must survive and report a failed run.
    plugin = compile_source(
        b"x = bytearray(128 * 1024 * 1024)\nprint(len(x))\n", tmp_path, "mem_bomb"
    )

    result = runner.run(plugin.plugin_dir)

    assert result.ok is False
    assert "MemoryError" in result.stderr