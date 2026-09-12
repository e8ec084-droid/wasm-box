"""
Thursday deliverable: "Test compiled output execution."

Proves the pipeline end to end: raw Python source -> compiler.compile_plugin
-> runner.PluginRunner -> real stdout captured back out of the sandbox.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from compiler import PluginValidationError, compile_plugin  # noqa: E402
from runner import PluginRunner  # noqa: E402

SAMPLES_DIR = ROOT / "samples"


@pytest.fixture(scope="module")
def runner():
    return PluginRunner()


def test_compile_hello_world(tmp_path):
    plugin = compile_plugin(SAMPLES_DIR / "hello_world.py", tmp_path, "hello_world")

    assert plugin.entrypoint.exists()
    assert plugin.entrypoint.read_text() == (SAMPLES_DIR / "hello_world.py").read_text()
    assert plugin.manifest_path.exists()
    assert len(plugin.source_sha256) == 64  # sha256 hex digest


def test_execute_hello_world(runner, tmp_path):
    plugin = compile_plugin(SAMPLES_DIR / "hello_world.py", tmp_path, "hello_world")

    result = runner.run(plugin.plugin_dir)

    assert result.ok
    assert result.stdout == "Hello from inside the WASM sandbox!\n"
    assert result.elapsed_ms < 2000  # generous CI bound; local runs are ~30-50ms


def test_compile_rejects_syntax_error(tmp_path):
    bad_source = tmp_path / "bad.py"
    bad_source.write_text("def broken(:\n    pass\n")

    with pytest.raises(PluginValidationError):
        compile_plugin(bad_source, tmp_path / "out", "bad_plugin")


def test_compile_rejects_disallowed_import(tmp_path):
    bad_source = tmp_path / "sneaky.py"
    bad_source.write_text("import socket\nsocket.socket()\n")

    with pytest.raises(PluginValidationError):
        compile_plugin(bad_source, tmp_path / "out", "sneaky_plugin")
