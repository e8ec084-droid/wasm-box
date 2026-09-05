"""
Tests covering:
  - Monday:   the /plugins API endpoint compiles + packages source
  - Tuesday:  the packaged plugin references the shared runtime correctly
  - Wednesday: package_artifact/unpack_artifact round-trip to a real .wasmboxpkg
  - Thursday: varied sample scripts (not just hello_world) run correctly
  - Friday:   structured error responses for bad input
"""

import sys
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import api as api_module  # noqa: E402
from compiler import (  # noqa: E402
    DisallowedImportError,
    EmptySourceError,
    EncodingError,
    MAX_SOURCE_BYTES,
    SourceTooLargeError,
    SyntaxValidationError,
    compile_source,
    package_artifact,
    unpack_artifact,
)
from runner import PluginRunner  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Point the API's plugin/artifact dirs at a scratch directory per test
    # so tests never collide with each other or with real compiled plugins.
    monkeypatch.setattr(api_module, "PLUGINS_DIR", tmp_path / "plugins")
    monkeypatch.setattr(api_module, "ARTIFACTS_DIR", tmp_path / "artifacts")
    return TestClient(api_module.app)


@pytest.fixture(scope="module")
def runner():
    return PluginRunner()


# ---------------------------------------------------------------- Monday --

def test_compile_endpoint_success(client):
    resp = client.post("/plugins", json={"name": "greet", "source": "print('hi there')\n"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "greet"
    assert len(body["source_sha256"]) == 64
    assert body["artifact_filename"] == "greet.wasmboxpkg"


def test_compile_endpoint_rejects_bad_name(client):
    resp = client.post("/plugins", json={"name": "not a valid name!", "source": "print(1)"})
    assert resp.status_code == 422  # pydantic pattern validation, not our own error path


def test_healthz(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# --------------------------------------------------------------- Friday --

def test_compile_endpoint_reports_syntax_error(client):
    resp = client.post("/plugins", json={"name": "broken", "source": "def f(:\n"})
    assert resp.status_code == 422
    assert resp.json()["detail"]["error_code"] == "syntax_error"


def test_compile_endpoint_reports_disallowed_import(client):
    resp = client.post("/plugins", json={"name": "sneaky", "source": "import socket\n"})
    assert resp.status_code == 422
    assert resp.json()["detail"]["error_code"] == "disallowed_import"


def test_compile_source_rejects_empty(tmp_path):
    with pytest.raises(EmptySourceError):
        compile_source(b"   \n\n  ", tmp_path, "empty")


def test_compile_source_rejects_oversized(tmp_path):
    huge = b"x = 1\n" * (MAX_SOURCE_BYTES // 5)
    with pytest.raises(SourceTooLargeError):
        compile_source(huge, tmp_path, "huge")


def test_compile_source_rejects_bad_encoding(tmp_path):
    with pytest.raises(EncodingError):
        compile_source(b"\xff\xfe\x00\x01not-utf8", tmp_path, "badenc")


def test_download_missing_artifact_404(client):
    resp = client.get("/plugins/does-not-exist/artifact")
    assert resp.status_code == 404


# ------------------------------------------------------------ Wed / Tue --

def test_package_and_unpack_round_trip(tmp_path):
    plugin = compile_source(b"print('round trip ok')\n", tmp_path / "plugins", "roundtrip")
    artifact_path = package_artifact(plugin.plugin_dir, tmp_path / "artifacts")

    assert artifact_path.exists()
    assert artifact_path.suffix == ".wasmboxpkg"
    with zipfile.ZipFile(artifact_path) as zf:
        assert set(zf.namelist()) == {"manifest.json", "main.py"}

    restored_dir = unpack_artifact(artifact_path, tmp_path / "restored")
    assert (restored_dir / "main.py").read_text() == "print('round trip ok')\n"


# -------------------------------------------------------------- Thursday --

VARIED_SAMPLES = {
    "loop_sum": (
        "total = 0\n"
        "for i in range(10):\n"
        "    total += i\n"
        "print(total)\n"
    ),
    "function_call": (
        "def square(n):\n"
        "    return n * n\n"
        "print(square(7))\n"
    ),
    "string_processing": (
        "words = 'the quick brown fox'.split()\n"
        "print(' '.join(w.upper() for w in words))\n"
    ),
    "list_and_dict": (
        "data = {'a': 1, 'b': 2, 'c': 3}\n"
        "print(sum(data.values()))\n"
    ),
}

EXPECTED_OUTPUT = {
    "loop_sum": "45\n",
    "function_call": "49\n",
    "string_processing": "THE QUICK BROWN FOX\n",
    "list_and_dict": "6\n",
}


@pytest.mark.parametrize("sample_name", VARIED_SAMPLES.keys())
def test_varied_samples_compile_and_run(runner, tmp_path, sample_name):
    source = VARIED_SAMPLES[sample_name]
    plugin = compile_source(source.encode("utf-8"), tmp_path, sample_name)

    result = runner.run(plugin.plugin_dir)

    assert result.ok, f"stderr: {result.stderr}"
    assert result.stdout == EXPECTED_OUTPUT[sample_name]
