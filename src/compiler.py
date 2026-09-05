"""
WasmBox Compilation Engine
==========================
R2 (Compiler Engineer) deliverable — Week 1.

Takes raw, untrusted Python source submitted by a tenant and turns it into a
self-contained "plugin package": a small directory with the validated source
plus a manifest, ready for R1's Wasmtime runtime to load and execute inside
the sandboxed CPython-WASI module.

Design note (see docs/01-toolchain-research.md and docs/05-pipeline-design.md
for the full rationale): we do NOT recompile a bespoke .wasm binary per
plugin. We compile once — the shared CPython-3.12-WASI interpreter — and
"compilation" per plugin means validating + packaging source that the shared
runtime interprets inside a fresh, isolated sandbox instance each run. This
is the same pattern used by production untrusted-code sandboxes (Extism,
Wasmer plugins) and is what makes the sub-5ms cold-start target in the spec
realistic.
"""

from __future__ import annotations

import ast
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

ENTRYPOINT_FILENAME = "main.py"
MANIFEST_FILENAME = "manifest.json"
RUNTIME_ID = "python-3.12.0-wasi"

# Import names that are pointless to allow at parse time: WASI already denies
# filesystem/network access at the sandbox boundary (that's R3's job in
# Week 3), but rejecting obviously-hostile imports here gives fast,
# cheap feedback to the plugin author before we ever spin up a sandbox.
DISALLOWED_IMPORTS = {"socket", "subprocess", "ctypes", "multiprocessing"}


class PluginValidationError(Exception):
    """Raised when untrusted source fails static validation."""


@dataclass
class CompiledPlugin:
    name: str
    plugin_dir: Path
    source_sha256: str
    entrypoint: Path
    manifest_path: Path


def _static_check(source: str, filename: str) -> ast.AST:
    try:
        tree = ast.parse(source, filename=filename)
    except SyntaxError as exc:
        raise PluginValidationError(f"Syntax error in plugin source: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names = [alias.name.split(".")[0] for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module:
            names = [node.module.split(".")[0]]
        else:
            continue
        blocked = DISALLOWED_IMPORTS.intersection(names)
        if blocked:
            raise PluginValidationError(
                f"Disallowed import(s) {sorted(blocked)} at line {node.lineno}"
            )
    return tree


def compile_plugin(source_path: Path, output_dir: Path, plugin_name: str) -> CompiledPlugin:
    """Validate `source_path` and package it as a plugin under `output_dir`."""
    source_path = Path(source_path)
    output_dir = Path(output_dir)

    source = source_path.read_text(encoding="utf-8")
    _static_check(source, filename=source_path.name)

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


def _main() -> int:
    if len(sys.argv) != 4:
        print(f"usage: {sys.argv[0]} <source.py> <output_dir> <plugin_name>", file=sys.stderr)
        return 2
    source_path, output_dir, plugin_name = sys.argv[1:4]
    try:
        plugin = compile_plugin(Path(source_path), Path(output_dir), plugin_name)
    except PluginValidationError as exc:
        print(f"compile failed: {exc}", file=sys.stderr)
        return 1
    print(f"compiled -> {plugin.plugin_dir} (sha256={plugin.source_sha256[:12]}...)")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
