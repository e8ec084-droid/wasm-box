"""
Week 3 tests (Wednesday: compiler warnings for oversized code; Thursday:
regression tests for the compiler changes).

Covers:
  - non-fatal `source_near_size_limit` warning when source nears the byte cap
  - the exact warning threshold boundary (at -> no warning, over -> warning)
  - warned plugins still compile and run (warning is not an error)
  - the hard cap is still a hard error (warning doesn't replace rejection)
  - warnings surfaced on the CLI and the API response
  - regression: warnings and custom resource_limits compose, manifest untouched
"""

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import api as api_module  # noqa: E402
import compiler as compiler_module  # noqa: E402
from compiler import (  # noqa: E402
    MAX_SOURCE_BYTES,
    SOURCE_SIZE_WARNING_RATIO,
    SourceTooLargeError,
    compile_source,
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


WARNING_THRESHOLD = int(MAX_SOURCE_BYTES * SOURCE_SIZE_WARNING_RATIO)


def _source_of_size(size: int) -> bytes:
    """Return valid Python source of exactly `size` bytes.

    `x = 1\n` seeds real code, then `#` bytes pad to the target size. A
    giant comment line is a single token, so a near-cap plugin still parses
    (and runs) instantly instead of burning fuel on thousands of statements.
    """
    prefix = b"x = 1\n"
    return prefix + b"#" * (size - len(prefix))


# ------------------------------------------------------------- Wednesday ---

def test_small_source_has_no_warnings(tmp_path):
    plugin = compile_source(b"print('x')\n", tmp_path, "small")

    assert plugin.warnings == []


def test_source_over_threshold_warns(tmp_path):
    plugin = compile_source(_source_of_size(WARNING_THRESHOLD + 1), tmp_path, "warned")

    assert len(plugin.warnings) == 1
    warning = plugin.warnings[0]
    assert warning.code == "source_near_size_limit"
    assert str(WARNING_THRESHOLD) in warning.message


def test_source_exactly_at_threshold_does_not_warn(tmp_path):
    # Boundary: the warning fires strictly *over* the threshold, so source
    # sitting exactly on it compiles silently.
    plugin = compile_source(_source_of_size(WARNING_THRESHOLD), tmp_path, "at_edge")

    assert plugin.warnings == []


def test_warned_plugin_still_compiles_and_runs(runner, tmp_path):
    # A warning is non-fatal: the plugin packages and executes normally.
    plugin = compile_source(_source_of_size(WARNING_THRESHOLD + 1), tmp_path, "big_but_fine")

    assert plugin.warnings
    assert plugin.entrypoint.exists()
    result = runner.run(plugin.plugin_dir)
    assert result.ok, f"stderr: {result.stderr}"


def test_hard_cap_is_still_an_error(tmp_path):
    # Regression: the new warning must not soften the existing rejection.
    oversized = _source_of_size(MAX_SOURCE_BYTES + 1)

    with pytest.raises(SourceTooLargeError):
        compile_source(oversized, tmp_path, "too_big")


def test_cli_prints_warnings_to_stderr(tmp_path, monkeypatch, capsys):
    source_path = tmp_path / "big.py"
    source_path.write_bytes(_source_of_size(WARNING_THRESHOLD + 1))
    monkeypatch.setattr(
        sys, "argv", ["compiler.py", str(source_path), str(tmp_path / "out"), "big_cli"]
    )

    exit_code = compiler_module._main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "warning" in captured.err
    assert "source_near_size_limit" in captured.err


def test_api_returns_warnings(client):
    resp = client.post(
        "/plugins",
        json={"name": "big", "source": _source_of_size(WARNING_THRESHOLD + 1).decode()},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert len(body["warnings"]) == 1
    assert body["warnings"][0]["code"] == "source_near_size_limit"


def test_api_returns_no_warnings_for_small_source(client):
    resp = client.post("/plugins", json={"name": "small", "source": "print('x')\n"})

    assert resp.status_code == 201
    assert resp.json()["warnings"] == []


# ------------------------------------------------------------- Thursday ----

def test_warnings_compose_with_custom_resource_limits(tmp_path):
    # Regression: the warning feature and Week 3 resource_limits overrides
    # must work together without either stepping on the other.
    plugin = compile_source(
        _source_of_size(WARNING_THRESHOLD + 1),
        tmp_path,
        "composed",
        resource_limits={"max_fuel": 5_000_000_000},
    )

    assert plugin.warnings
    assert plugin.resource_limits["max_fuel"] == 5_000_000_000
    manifest = json.loads(plugin.manifest_path.read_text(encoding="utf-8"))
    assert manifest["resource_limits"]["max_fuel"] == 5_000_000_000
    # Warnings are compile-time feedback, deliberately NOT part of the artifact.
    assert "warnings" not in manifest


def test_manifest_shape_unchanged_for_warned_plugin(tmp_path):
    # Regression: a warned plugin's manifest is byte-for-byte the same shape
    # as any other plugin's — warnings live on the result, not the artifact.
    plugin = compile_source(_source_of_size(WARNING_THRESHOLD + 1), tmp_path, "shape")

    manifest = json.loads(plugin.manifest_path.read_text(encoding="utf-8"))
    assert set(manifest) == {"name", "entrypoint", "source_sha256", "runtime", "format_version", "resource_limits"}
    assert manifest["format_version"] == "2.0"