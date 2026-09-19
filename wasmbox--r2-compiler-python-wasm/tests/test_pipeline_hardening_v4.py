"""
Week 4 tests (Monday: "Finalize compiler pipeline hardening").

Covers the trust boundary the pipeline now enforces on the three things an
attacker controls — the plugin name, the manifest, and the artifact archive:

  - plugin-name validation at every compile entrypoint (path traversal closed)
  - manifest structural validation in both package and unpack
  - zip-slip rejection on unpack (members may not escape the plugin directory)
  - decompression-bomb rejection on unpack
  - a valid compile/package/unpack round trip still works unchanged
"""

import json
import sys
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import compiler as compiler_module  # noqa: E402
from compiler import (  # noqa: E402
    MAX_ARTIFACT_UNCOMPRESSED_BYTES,
    ArtifactIntegrityError,
    InvalidPluginNameError,
    compile_source,
    package_artifact,
    unpack_artifact,
    validate_plugin_name,
)

# ------------------------------------------------------------------ fixtures --


def _valid_manifest(**overrides: object) -> dict[str, object]:
    """A well-formed manifest; pass overrides to make one specific field bad."""
    manifest: dict[str, object] = {
        "name": "good",
        "entrypoint": "main.py",
        "source_sha256": "0" * 64,
        "runtime": "python-3.12.0-wasi",
        "format_version": "2.0",
        "resource_limits": {
            "max_memory_bytes": 33554432,
            "max_fuel": 1000000000,
            "timeout_ms": 50,
        },
    }
    return manifest | overrides


def _write_plugin_dir(base: Path, manifest: dict[str, object]) -> Path:
    """Create a plugin directory on disk from `manifest`."""
    plugin_dir = base / "plugin"
    plugin_dir.mkdir(parents=True, exist_ok=True)
    (plugin_dir / "main.py").write_text("print(1)\n", encoding="utf-8")
    (plugin_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return plugin_dir


def _write_artifact(path: Path, members: dict[str, bytes]) -> Path:
    """Build a `.wasmboxpkg`-shaped zip from raw member name -> bytes."""
    with zipfile.ZipFile(path, "w") as zf:
        for member_name, data in members.items():
            zf.writestr(member_name, data)
    return path


def _manifest_member(**overrides: object) -> dict[str, bytes]:
    return {"manifest.json": json.dumps(_valid_manifest(**overrides)).encode("utf-8")}


# --------------------------------------------------------- plugin names (Mon) --


@pytest.mark.parametrize("name", ["a", "abc", "a-b_c", "Plugin_1", "A" * 64, "123"])
def test_accepts_safe_names(name: str) -> None:
    assert validate_plugin_name(name) == name


@pytest.mark.parametrize(
    "name",
    [
        "",
        " ",
        "..",
        ".",
        "../evil",
        "a/b",
        "/etc/passwd",
        "..\\evil",
        "with space",
        "a.b",
        "A" * 65,
        None,
        7,
    ],
)
def test_rejects_unsafe_names(name: object) -> None:
    with pytest.raises(InvalidPluginNameError):
        validate_plugin_name(name)


def test_compile_source_rejects_traversal_before_writing_anything(tmp_path: Path) -> None:
    output_dir = tmp_path / "out"

    with pytest.raises(InvalidPluginNameError):
        compile_source(b"print(1)\n", output_dir, "../escaped")

    # Neither the output directory nor the escape target may exist.
    assert not output_dir.exists()
    assert not (tmp_path / "escaped").exists()


def test_cli_reports_invalid_name(tmp_path: Path, monkeypatch, capsys) -> None:
    source_path = tmp_path / "p.py"
    source_path.write_text("print(1)\n", encoding="utf-8")
    monkeypatch.setattr(
        sys,
        "argv",
        ["compiler.py", str(source_path), str(tmp_path / "out"), "../evil"],
    )

    exit_code = compiler_module._main()

    assert exit_code == 1
    assert "invalid_plugin_name" in capsys.readouterr().err


# -------------------------------------------------------- manifest hardening --


def test_package_rejects_manifest_name_traversal(tmp_path: Path) -> None:
    plugin_dir = _write_plugin_dir(tmp_path, _valid_manifest(name="../evil"))

    with pytest.raises(InvalidPluginNameError):
        package_artifact(plugin_dir, tmp_path / "artifacts")


def test_package_rejects_entrypoint_traversal(tmp_path: Path) -> None:
    plugin_dir = _write_plugin_dir(tmp_path, _valid_manifest(entrypoint="../secret.py"))

    with pytest.raises(ArtifactIntegrityError, match="bare .py"):
        package_artifact(plugin_dir, tmp_path / "artifacts")


def test_package_rejects_missing_required_key(tmp_path: Path) -> None:
    manifest = _valid_manifest()
    del manifest["runtime"]
    plugin_dir = _write_plugin_dir(tmp_path, manifest)

    with pytest.raises(ArtifactIntegrityError, match="missing required key"):
        package_artifact(plugin_dir, tmp_path / "artifacts")


def test_package_rejects_malformed_format_version(tmp_path: Path) -> None:
    plugin_dir = _write_plugin_dir(tmp_path, _valid_manifest(format_version="two"))

    with pytest.raises(ArtifactIntegrityError, match="format_version"):
        package_artifact(plugin_dir, tmp_path / "artifacts")


def test_package_rejects_missing_entrypoint_file(tmp_path: Path) -> None:
    plugin_dir = _write_plugin_dir(tmp_path, _valid_manifest(entrypoint="other.py"))

    with pytest.raises(ArtifactIntegrityError, match="missing from"):
        package_artifact(plugin_dir, tmp_path / "artifacts")


def test_package_raises_file_not_found_without_manifest(tmp_path: Path) -> None:
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()

    with pytest.raises(FileNotFoundError):
        package_artifact(empty_dir, tmp_path / "artifacts")


# -------------------------------------------------------- artifact hardening --


def test_unpack_rejects_zip_slip_member(tmp_path: Path) -> None:
    artifact = _write_artifact(
        tmp_path / "evil.wasmboxpkg",
        _manifest_member() | {"../escaped.txt": b"pwned"},
    )
    restore_dir = tmp_path / "restore"

    with pytest.raises(ArtifactIntegrityError, match="escapes"):
        unpack_artifact(artifact, restore_dir)

    assert not (tmp_path / "escaped.txt").exists()
    assert not (restore_dir / "good").exists()


def test_unpack_rejects_absolute_member_path(tmp_path: Path) -> None:
    artifact = _write_artifact(
        tmp_path / "abs.wasmboxpkg",
        _manifest_member() | {"/tmp/escaped.txt": b"pwned"},
    )

    with pytest.raises(ArtifactIntegrityError, match="escapes"):
        unpack_artifact(artifact, tmp_path / "restore")


def test_unpack_rejects_decompression_bomb(tmp_path: Path) -> None:
    bomb = b"\0" * (MAX_ARTIFACT_UNCOMPRESSED_BYTES + 1)
    artifact = _write_artifact(
        tmp_path / "bomb.wasmboxpkg",
        _manifest_member() | {"big.bin": bomb},
    )

    with pytest.raises(ArtifactIntegrityError, match="expands to"):
        unpack_artifact(artifact, tmp_path / "restore")


def test_unpack_rejects_archive_without_manifest(tmp_path: Path) -> None:
    artifact = _write_artifact(tmp_path / "bare.wasmboxpkg", {"main.py": b"print(1)\n"})

    with pytest.raises(ArtifactIntegrityError, match="no readable manifest"):
        unpack_artifact(artifact, tmp_path / "restore")


def test_unpack_rejects_non_object_manifest(tmp_path: Path) -> None:
    artifact = _write_artifact(
        tmp_path / "list.wasmboxpkg",
        {"manifest.json": b"[1, 2, 3]"},
    )

    with pytest.raises(ArtifactIntegrityError, match="JSON object"):
        unpack_artifact(artifact, tmp_path / "restore")


def test_unpack_rejects_newer_format_version(tmp_path: Path) -> None:
    artifact = _write_artifact(
        tmp_path / "future.wasmboxpkg",
        _manifest_member(format_version="3.0"),
    )

    with pytest.raises(ValueError, match="newer than supported"):
        unpack_artifact(artifact, tmp_path / "restore")


# ----------------------------------------------------------------- regression --


def test_valid_round_trip_still_works(tmp_path: Path) -> None:
    plugin = compile_source(b"print('round trip')\n", tmp_path / "plugins", "roundtrip")
    artifact = package_artifact(plugin.plugin_dir, tmp_path / "artifacts")

    restored = unpack_artifact(artifact, tmp_path / "restored")

    assert (restored / "main.py").read_text(encoding="utf-8") == "print('round trip')\n"
