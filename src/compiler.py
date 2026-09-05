"""
WasmBox Compilation Engine
==========================
R2 (Compiler Engineer) deliverable — Week 1 + Week 2.

Takes raw, untrusted Python source submitted by a tenant and turns it into a
self-contained "plugin package": a small directory (or, as of Week 2, a
single portable artifact file) with the validated source plus a manifest,
ready for R1's Wasmtime runtime to load and execute inside the sandboxed
CPython-WASI module.

Design note (see docs/01-toolchain-research.md and docs/05-pipeline-design.md
for the full rationale): we do NOT recompile a bespoke .wasm binary per
plugin. We compile once — the shared CPython-3.12-WASI interpreter — and
"compilation" per plugin means validating + packaging source that the shared
runtime interprets inside a fresh, isolated sandbox instance each run. This
is the same pattern used by production untrusted-code sandboxes (Extism,
Wasmer plugins) and is what makes the sub-5ms cold-start target in the spec
realistic. Week 2's "output executable .wasm binary" task is implemented as
finalizing this plugin package into a single distributable artifact file
(see docs/06-week2-packaging.md) rather than a new native binary per plugin.
"""

from __future__ import annotations

import ast
import hashlib
import json
import shutil
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

ENTRYPOINT_FILENAME = "main.py"
MANIFEST_FILENAME = "manifest.json"
RUNTIME_ID = "python-3.12.0-wasi"
PLUGIN_FORMAT_VERSION = "1.0"
ARTIFACT_SUFFIX = ".wasmboxpkg"

# Import names that are pointless to allow at parse time: WASI already denies
# filesystem/network access at the sandbox boundary (that's R3's job in
# Week 3), but rejecting obviously-hostile imports here gives fast,
# cheap feedback to the plugin author before we ever spin up a sandbox.
DISALLOWED_IMPORTS = {"socket", "subprocess", "ctypes", "multiprocessing"}

MAX_SOURCE_BYTES = 256 * 1024  # 256 KB — generous for a plugin, cheap to reject early


class PluginValidationError(Exception):
    """Base class for all compile-time validation failures.

    Every subclass carries a stable `error_code` so callers (the API,
    Friday's task) can map failures to structured JSON responses instead of
    parsing exception message text.
    """

    error_code = "validation_error"


class EmptySourceError(PluginValidationError):
    error_code = "empty_source"


class SourceTooLargeError(PluginValidationError):
    error_code = "source_too_large"


class EncodingError(PluginValidationError):
    error_code = "invalid_encoding"


class SyntaxValidationError(PluginValidationError):
    error_code = "syntax_error"


class DisallowedImportError(PluginValidationError):
    error_code = "disallowed_import"


@dataclass
class CompiledPlugin:
    name: str
    plugin_dir: Path
    source_sha256: str
    entrypoint: Path
    manifest_path: Path
    format_version: str = PLUGIN_FORMAT_VERSION


def _static_check(source: str, filename: str) -> ast.AST:
    if not source.strip():
        raise EmptySourceError("Plugin source is empty")

    try:
        tree = ast.parse(source, filename=filename)
    except SyntaxError as exc:
        raise SyntaxValidationError(f"Syntax error in plugin source: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names = [alias.name.split(".")[0] for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module:
            names = [node.module.split(".")[0]]
        else:
            continue
        blocked = DISALLOWED_IMPORTS.intersection(names)
        if blocked:
            raise DisallowedImportError(
                f"Disallowed import(s) {sorted(blocked)} at line {node.lineno}"
            )
    return tree


def compile_source(source_bytes: bytes, output_dir: Path, plugin_name: str) -> CompiledPlugin:
    """Validate raw source bytes and package them as a plugin under `output_dir`.

    This is the core entrypoint used directly by the Week 2 API (Monday's
    task) — it takes bytes off the wire rather than requiring a file on
    disk, which `compile_plugin` (the Week 1 CLI wrapper) still uses.
    """
    if len(source_bytes) > MAX_SOURCE_BYTES:
        raise SourceTooLargeError(
            f"Plugin source is {len(source_bytes)} bytes, exceeds {MAX_SOURCE_BYTES} byte limit"
        )

    try:
        source = source_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise EncodingError(f"Plugin source must be valid UTF-8: {exc}") from exc

    _static_check(source, filename=f"{plugin_name}.py")

    output_dir = Path(output_dir)
    plugin_dir = output_dir / plugin_name
    plugin_dir.mkdir(parents=True, exist_ok=True)

    entrypoint = plugin_dir / ENTRYPOINT_FILENAME
    entrypoint.write_text(source, encoding="utf-8")

    source_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
    manifest = {
        "name": plugin_name,
        "entrypoint": ENTRYPOINT_FILENAME,
        "source_sha256": source_hash,
        "runtime": RUNTIME_ID,
        "format_version": PLUGIN_FORMAT_VERSION,
    }
    manifest_path = plugin_dir / MANIFEST_FILENAME
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    return CompiledPlugin(
        name=plugin_name,
        plugin_dir=plugin_dir,
        source_sha256=source_hash,
        entrypoint=entrypoint,
        manifest_path=manifest_path,
    )


def compile_plugin(source_path: Path, output_dir: Path, plugin_name: str) -> CompiledPlugin:
    """Week 1 CLI wrapper: validate a source *file* and package it."""
    source_bytes = Path(source_path).read_bytes()
    return compile_source(source_bytes, Path(output_dir), plugin_name)


def package_artifact(plugin_dir: Path, artifact_dir: Path) -> Path:
    """Finalize a compiled plugin directory into a single portable artifact file.

    Week 2 Wednesday deliverable ("output executable .wasm binary"), adapted
    to our architecture: instead of a new native binary per plugin, the
    "build output" is a single `.wasmboxpkg` zip containing exactly the
    manifest + validated source. It's what actually gets distributed/stored
    per tenant, and what `unpack_artifact` below turns back into something
    `runner.PluginRunner` can execute.
    """
    plugin_dir = Path(plugin_dir)
    artifact_dir = Path(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = plugin_dir / MANIFEST_FILENAME
    if not manifest_path.exists():
        raise FileNotFoundError(f"{plugin_dir} is not a compiled plugin (missing manifest.json)")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    artifact_path = artifact_dir / f"{manifest['name']}{ARTIFACT_SUFFIX}"
    with zipfile.ZipFile(artifact_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(manifest_path, arcname=MANIFEST_FILENAME)
        zf.write(plugin_dir / manifest["entrypoint"], arcname=manifest["entrypoint"])

    return artifact_path


def unpack_artifact(artifact_path: Path, output_dir: Path) -> Path:
    """Reverse of `package_artifact`: extract a `.wasmboxpkg` back into a
    plugin directory the runner can preopen and execute."""
    artifact_path = Path(artifact_path)
    output_dir = Path(output_dir)

    with zipfile.ZipFile(artifact_path, "r") as zf:
        manifest = json.loads(zf.read(MANIFEST_FILENAME))
        plugin_dir = output_dir / manifest["name"]
        if plugin_dir.exists():
            shutil.rmtree(plugin_dir)
        plugin_dir.mkdir(parents=True)
        zf.extractall(plugin_dir)

    return plugin_dir


def _main() -> int:
    if len(sys.argv) != 4:
        print(f"usage: {sys.argv[0]} <source.py> <output_dir> <plugin_name>", file=sys.stderr)
        return 2
    source_path, output_dir, plugin_name = sys.argv[1:4]
    try:
        plugin = compile_plugin(Path(source_path), Path(output_dir), plugin_name)
    except PluginValidationError as exc:
        print(f"compile failed [{exc.error_code}]: {exc}", file=sys.stderr)
        return 1
    print(f"compiled -> {plugin.plugin_dir} (sha256={plugin.source_sha256[:12]}...)")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
