"""
WasmBox Compilation Engine.

R2 (Compiler Engineer) deliverable — Week 1 + Week 2.

Takes raw, untrusted Python source submitted by a tenant and turns it into a
self-contained "plugin package": a small directory (or, as of Week 2, a
single portable artifact file) with the validated source plus a manifest,
ready for R1's Wasmtime runtime to load and execute inside the sandboxed
CPython-WASI module.

Design note: we do NOT recompile a bespoke .wasm binary per plugin. We compile
once — the shared CPython-3.12-WASI interpreter — and "compilation" per plugin
means validating + packaging source that the shared runtime interprets inside a
fresh, isolated sandbox instance each run. This is the same pattern used by
production untrusted-code sandboxes (Extism, Wasmer plugins).

Week 2's "output executable .wasm binary" task is implemented as finalizing this
plugin package into a single distributable artifact file rather than a new native
binary per plugin.
"""

from __future__ import annotations

import ast
import hashlib
import json
import shutil
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ENTRYPOINT_FILENAME = "main.py"
MANIFEST_FILENAME = "manifest.json"
RUNTIME_ID = "python-3.12.0-wasi"
PLUGIN_FORMAT_VERSION = "2.0"  # 2.0: manifest now carries resource_limits (Week 3)
ARTIFACT_SUFFIX = ".wasmboxpkg"

# Week 3 resource limits (see docs/07-week3-resource-limits.md).
# Defaults follow the brief's "Resource Constraints" week: a strict memory cap
# and a deterministic instruction budget that terminates infinite loops
# (e.g. `while True: pass`) instead of letting them hang the host.
#
# max_memory_bytes: cap on the plugin's WASM linear memory. Measured against
#   the pinned CPython-3.12-WASI runtime, the interpreter alone uses ~10 MB,
#   so the brief's literal "10 MB" cap leaves zero room for plugin data (an
#   8 MB allocation already fails). 32 MB is the smallest power-of-two that
#   gives real headroom while still stopping memory bombs early.
# max_fuel: deterministic instruction budget. Interpreter boot + a hello-world
#   plugin consumes ~250M fuel on the pinned runtime; 1G gives ~4x headroom
#   while still terminating an infinite loop within ~100 ms of wall time.
# timeout_ms: declared wall-clock target from the brief (50 ms). Fuel is the
#   enforcement mechanism today; a wall-clock watchdog (Wasmtime epoch
#   interruption) is R1's Week 3 follow-up, reading this same field.
MAX_MEMORY_BYTES = 32 * 1024 * 1024
MAX_FUEL = 1_000_000_000
TIMEOUT_MS = 50

DEFAULT_RESOURCE_LIMITS: dict[str, int] = {
    "max_memory_bytes": MAX_MEMORY_BYTES,
    "max_fuel": MAX_FUEL,
    "timeout_ms": TIMEOUT_MS,
}

# (min, max) inclusive bounds for each overridable limit.
RESOURCE_LIMIT_BOUNDS: dict[str, tuple[int, int]] = {
    "max_memory_bytes": (1 * 1024 * 1024, 4 * 1024 * 1024 * 1024),  # 1 MB .. 4 GB (wasm32 max)
    "max_fuel": (1, 10**12),
    "timeout_ms": (1, 60_000),
}

# Import names that are pointless to allow at parse time: WASI already denies
# filesystem/network access at the sandbox boundary (that's R3's job in
# Week 3), but rejecting obviously-hostile imports here gives fast,
# cheap feedback to the plugin author before we ever spin up a sandbox.
DISALLOWED_IMPORTS: frozenset[str] = frozenset({"socket", "subprocess", "ctypes", "multiprocessing"})

MAX_SOURCE_BYTES = 256 * 1024  # 256 KB — generous for a plugin, cheap to reject early

# Week 3 (Wed): warn (don't reject) once source exceeds this fraction of the
# hard byte cap. Kept as a ratio so the warning threshold tracks the cap
# automatically instead of going stale if MAX_SOURCE_BYTES ever changes.
SOURCE_SIZE_WARNING_RATIO = 0.8


# ---------------------------------------------------------------------------
# Validation errors — each with a stable error_code for structured API responses
# ---------------------------------------------------------------------------


class PluginValidationError(Exception):
    """Base class for all compile-time validation failures.

    Every subclass carries a stable `error_code` so callers (the API,
    Friday's task) can map failures to structured JSON responses instead of
    parsing exception message text.
    """

    error_code: str = "validation_error"


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


class ResourceLimitError(PluginValidationError):
    error_code = "invalid_resource_limits"


# ---------------------------------------------------------------------------
# Compiler warnings — non-fatal notices, unlike errors they don't stop compilation
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CompilerWarning:
    """A non-fatal compile-time notice surfaced to the plugin author.

    Mirrors the structured `error_code` pattern used by errors: each warning
    carries a stable `code` plus a human-readable `message`, so callers (the
    API, R5's frontend) can switch on the code instead of parsing text.
    """

    code: str
    message: str


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class CompiledPlugin:
    """A validated, packaged plugin ready for execution or distribution."""

    name: str
    plugin_dir: Path
    source_sha256: str
    entrypoint: Path
    manifest_path: Path
    format_version: str = PLUGIN_FORMAT_VERSION
    resource_limits: dict[str, int] = field(default_factory=lambda: dict(DEFAULT_RESOURCE_LIMITS))
    warnings: list[CompilerWarning] = field(default_factory=list)


@dataclass(frozen=True)
class ResourceLimitBounds:
    """Valid range (inclusive) for a single resource limit key."""

    min_value: int
    max_value: int


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def validate_resource_limits(
    limits: dict[str, int] | None,
) -> dict[str, int]:
    """Merge user-supplied limit overrides over the defaults, validating each.

    Unknown keys, non-integers, and out-of-bounds values raise
    `ResourceLimitError` so the API can surface them as structured 422s.

    Args:
        limits: Optional dict of limit overrides. When None or empty, returns
            a copy of the defaults.

    Returns:
        A validated dict with all three limit keys present.

    Raises:
        ResourceLimitError: If any key is unknown, not a positive integer,
            or outside its valid range.
    """
    merged = dict(DEFAULT_RESOURCE_LIMITS)

    if not limits:
        return merged

    unknown_keys = set(limits) - set(RESOURCE_LIMIT_BOUNDS)
    if unknown_keys:
        raise ResourceLimitError(
            f"Unknown resource limit key(s): {sorted(unknown_keys)}"
        )

    for key, value in limits.items():
        if isinstance(value, bool) or not isinstance(value, int):
            raise ResourceLimitError(
                f"Resource limit '{key}' must be a positive integer, got {value!r}"
            )
        min_val, max_val = RESOURCE_LIMIT_BOUNDS[key]
        if value < min_val or value > max_val:
            raise ResourceLimitError(
                f"Resource limit '{key}' must be between {min_val} and {max_val}, got {value}"
            )
        merged[key] = value

    return merged


def _extract_import_names(node: ast.Import | ast.ImportFrom) -> list[str]:
    """Return the top-level package names imported by an AST import node.

    For `import socket` → ["socket"]
    For `import socket as sock` → ["socket"]
    For `from http.client import urlopen` → ["http"]
    """
    if isinstance(node, ast.Import):
        return [alias.name.split(".")[0] for alias in node.names]
    # ImportFrom with a module (e.g. `from http.client import ...`)
    if isinstance(node, ast.ImportFrom) and node.module:
        return [node.module.split(".")[0]]
    return []


def validate_source_syntax_and_imports(source: str, filename: str) -> ast.AST:
    """Parse source to an AST and reject disallowed imports.

    Performs two checks in a single pass over the AST:

    1. Syntax validation — raises `SyntaxValidationError` for invalid Python.
    2. Import gating — raises `DisallowedImportError` for banned top-level
       imports (socket, subprocess, ctypes, multiprocessing).

    Args:
        source: The Python source to validate.
        filename: Used in error messages to identify the source (e.g. "plugin.py").

    Returns:
        The parsed AST if validation passes.

    Raises:
        EmptySourceError: If source is empty or whitespace-only.
        SyntaxValidationError: If source fails to parse.
        DisallowedImportError: If a banned import is detected.
    """
    if not source.strip():
        raise EmptySourceError("Plugin source is empty")

    try:
        tree = ast.parse(source, filename=filename)
    except SyntaxError as exc:
        raise SyntaxValidationError(f"Syntax error in plugin source: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            import_names = _extract_import_names(node)
            blocked = DISALLOWED_IMPORTS.intersection(import_names)
            if blocked:
                raise DisallowedImportError(
                    f"Disallowed import(s) {sorted(blocked)} at line {node.lineno}"
                )

    return tree


# ---------------------------------------------------------------------------
# Core compilation entrypoints
# ---------------------------------------------------------------------------


def compile_source(
    source_bytes: bytes,
    output_dir: Path,
    plugin_name: str,
    resource_limits: dict[str, int] | None = None,
) -> CompiledPlugin:
    """Validate raw source bytes and package them as a plugin under `output_dir`.

    This is the core entrypoint used directly by the Week 2 API (Monday's
    task) — it takes bytes off the wire rather than requiring a file on
    disk, which `compile_plugin` (the Week 1 CLI wrapper) still uses.

    `resource_limits` (Week 3) optionally overrides the per-plugin limits
    written into the manifest's `resource_limits` block, which the runner
    enforces at execution time. Defaults apply when omitted.

    Args:
        source_bytes: Raw Python source as bytes (from HTTP body, file, etc.).
        output_dir: Directory under which the plugin directory will be created.
        plugin_name: Sanitized plugin name used for the subdirectory and artifact.
        resource_limits: Optional per-plugin resource limit overrides.

    Returns:
        A CompiledPlugin describing the created plugin directory and its manifest.

    Raises:
        SourceTooLargeError: If source_bytes exceeds MAX_SOURCE_BYTES.
        EncodingError: If source_bytes is not valid UTF-8.
        EmptySourceError: If source is empty or whitespace-only.
        SyntaxValidationError: If source fails to parse.
        DisallowedImportError: If a banned import is detected.
        ResourceLimitError: If resource_limits contains invalid values.
    """
    limits = validate_resource_limits(resource_limits)

    _validate_source_size(source_bytes)
    warnings = _collect_source_warnings(source_bytes)
    source = _decode_source(source_bytes)
    validate_source_syntax_and_imports(source, filename=f"{plugin_name}.py")

    plugin_dir = _create_plugin_directory(output_dir, plugin_name)
    entrypoint = _write_entrypoint(plugin_dir, source)
    source_hash = _compute_source_hash(source)
    manifest_path = _write_manifest(plugin_dir, plugin_name, source_hash, limits)

    return CompiledPlugin(
        name=plugin_name,
        plugin_dir=plugin_dir,
        source_sha256=source_hash,
        entrypoint=entrypoint,
        manifest_path=manifest_path,
        resource_limits=limits,
        warnings=warnings,
    )


def compile_plugin(source_path: Path, output_dir: Path, plugin_name: str) -> CompiledPlugin:
    """Week 1 CLI wrapper: validate a source *file* and package it.

    Convenience wrapper around compile_source that reads from a file on disk.

    Args:
        source_path: Path to the Python source file.
        output_dir: Directory under which the plugin directory will be created.
        plugin_name: Sanitized plugin name used for the subdirectory and artifact.

    Returns:
        A CompiledPlugin describing the created plugin directory.
    """
    source_bytes = Path(source_path).read_bytes()
    return compile_source(source_bytes, Path(output_dir), plugin_name)


# ---------------------------------------------------------------------------
# Packaging: single-file artifacts
# ---------------------------------------------------------------------------


def package_artifact(plugin_dir: Path, artifact_dir: Path) -> Path:
    """Finalize a compiled plugin directory into a single portable artifact file.

    Week 2 Wednesday deliverable ("output executable .wasm binary"), adapted
    to our architecture: instead of a new native binary per plugin, the
    "build output" is a single `.wasmboxpkg` zip containing exactly the
    manifest + validated source. It's what actually gets distributed/stored
    per tenant, and what `unpack_artifact` below turns back into something
    `runner.PluginRunner` can execute.

    Args:
        plugin_dir: Path to the compiled plugin directory (must contain manifest.json).
        artifact_dir: Directory where the artifact file will be written.

    Returns:
        Path to the created `.wasmboxpkg` artifact.

    Raises:
        FileNotFoundError: If plugin_dir does not contain a manifest.json.
    """
    plugin_dir = Path(plugin_dir)
    artifact_dir = Path(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = plugin_dir / MANIFEST_FILENAME
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"{plugin_dir} is not a compiled plugin (missing manifest.json)"
        )

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    artifact_path = artifact_dir / f"{manifest['name']}{ARTIFACT_SUFFIX}"

    with zipfile.ZipFile(artifact_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(manifest_path, arcname=MANIFEST_FILENAME)
        zf.write(plugin_dir / manifest["entrypoint"], arcname=manifest["entrypoint"])

    return artifact_path


def unpack_artifact(artifact_path: Path, output_dir: Path) -> Path:
    """Reverse of `package_artifact`: extract a `.wasmboxpkg` back into a
    plugin directory the runner can preopen and execute.

    Args:
        artifact_path: Path to the `.wasmboxpkg` zip artifact.
        output_dir: Directory where the extracted plugin directory will be placed.

    Returns:
        Path to the extracted plugin directory.

    Raises:
        ValueError: If the artifact uses a newer format version we don't support.
    """
    artifact_path = Path(artifact_path)
    output_dir = Path(output_dir)

    with zipfile.ZipFile(artifact_path, "r") as zf:
        manifest = json.loads(zf.read(MANIFEST_FILENAME))

        # Forward-compatibility guard: refuse artifacts produced by a newer
        # format we don't understand yet. Older formats (e.g. 1.0, without
        # resource_limits) still unpack fine; the runner applies defaults.
        version = manifest.get("format_version", PLUGIN_FORMAT_VERSION)
        current_major = int(PLUGIN_FORMAT_VERSION.split(".")[0])
        artifact_major = int(version.split(".")[0])
        if artifact_major > current_major:
            raise ValueError(
                f"Artifact format {version} is newer than supported {PLUGIN_FORMAT_VERSION}"
            )

        plugin_dir = output_dir / manifest["name"]
        if plugin_dir.exists():
            shutil.rmtree(plugin_dir)
        plugin_dir.mkdir(parents=True)
        zf.extractall(plugin_dir)

    return plugin_dir


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _validate_source_size(source_bytes: bytes) -> None:
    """Raise SourceTooLargeError if the source exceeds the byte limit."""
    if len(source_bytes) > MAX_SOURCE_BYTES:
        raise SourceTooLargeError(
            f"Plugin source is {len(source_bytes)} bytes, "
            f"exceeds {MAX_SOURCE_BYTES} byte limit"
        )


def _collect_source_warnings(source_bytes: bytes) -> list[CompilerWarning]:
    """Return non-fatal warnings for source that is valid but concerning.

    Called after `_validate_source_size` (which rejects the truly oversized),
    so this only fires for source that fits — warning the author they're
    closing in on the cap while compilation still succeeds.

    Args:
        source_bytes: Raw Python source as bytes.

    Returns:
        A list of CompilerWarning; empty for source under the warning threshold.
    """
    warnings: list[CompilerWarning] = []
    size = len(source_bytes)
    warning_threshold = int(MAX_SOURCE_BYTES * SOURCE_SIZE_WARNING_RATIO)
    if size > warning_threshold:
        warnings.append(
            CompilerWarning(
                code="source_near_size_limit",
                message=(
                    f"Plugin source is {size} bytes, above the {warning_threshold} byte "
                    f"warning threshold ({SOURCE_SIZE_WARNING_RATIO:.0%} of the "
                    f"{MAX_SOURCE_BYTES} byte hard limit)"
                ),
            )
        )
    return warnings


def _decode_source(source_bytes: bytes) -> str:
    """Decode source bytes as UTF-8, raising EncodingError on failure."""
    try:
        return source_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise EncodingError(f"Plugin source must be valid UTF-8: {exc}") from exc


def _create_plugin_directory(output_dir: Path, plugin_name: str) -> Path:
    """Create the plugin subdirectory and return its path."""
    output_dir = Path(output_dir)
    plugin_dir = output_dir / plugin_name
    plugin_dir.mkdir(parents=True, exist_ok=True)
    return plugin_dir


def _write_entrypoint(plugin_dir: Path, source: str) -> Path:
    """Write the validated source to main.py inside the plugin directory."""
    entrypoint = plugin_dir / ENTRYPOINT_FILENAME
    entrypoint.write_text(source, encoding="utf-8")
    return entrypoint


def _compute_source_hash(source: str) -> str:
    """Return the SHA-256 hex digest of the source."""
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def _write_manifest(
    plugin_dir: Path,
    plugin_name: str,
    source_hash: str,
    limits: dict[str, int],
) -> Path:
    """Write manifest.json and return its path."""
    manifest = {
        "name": plugin_name,
        "entrypoint": ENTRYPOINT_FILENAME,
        "source_sha256": source_hash,
        "runtime": RUNTIME_ID,
        "format_version": PLUGIN_FORMAT_VERSION,
        "resource_limits": limits,
    }
    manifest_path = plugin_dir / MANIFEST_FILENAME
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest_path


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------


def _main() -> int:
    """CLI entrypoint for direct invocation via `python3 src/compiler.py ...`."""
    if len(sys.argv) != 4:
        print(
            f"usage: {sys.argv[0]} <source.py> <output_dir> <plugin_name>",
            file=sys.stderr,
        )
        return 2

    source_path, output_dir, plugin_name = sys.argv[1:4]
    try:
        plugin = compile_plugin(Path(source_path), Path(output_dir), plugin_name)
    except PluginValidationError as exc:
        print(
            f"compile failed [{exc.error_code}]: {exc}",
            file=sys.stderr,
        )
        return 1

    print(
        f"compiled -> {plugin.plugin_dir} "
        f"(sha256={plugin.source_sha256[:12]}...)"
    )
    for warning in plugin.warnings:
        print(f"warning [{warning.code}]: {warning.message}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
