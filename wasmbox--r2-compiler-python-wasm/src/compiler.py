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
import re
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

# Week 4 (Mon) hardening. A plugin name is used verbatim as a directory name
# and an artifact filename, so it is restricted to a short, path-neutral
# alphabet. `compiler.py` owns this rule; `api.py` reuses the same pattern on
# its request model so the two validation layers can never drift apart.
PLUGIN_NAME_PATTERN = r"[A-Za-z0-9_-]{1,64}"
_PLUGIN_NAME_RE = re.compile(PLUGIN_NAME_PATTERN)
_FORMAT_VERSION_RE = re.compile(r"\d+\.\d+")

# Keys every plugin manifest must carry for the runner/packager to trust it.
REQUIRED_MANIFEST_KEYS: frozenset[str] = frozenset(
    {"name", "entrypoint", "source_sha256", "runtime", "format_version"}
)

# A packaged plugin is one manifest plus one source file, so it legitimately
# decompresses to a little over MAX_SOURCE_BYTES. Anything beyond this is
# treated as a decompression bomb and refused instead of extracted.
MAX_ARTIFACT_UNCOMPRESSED_BYTES = 4 * MAX_SOURCE_BYTES


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


class InvalidPluginNameError(PluginValidationError):
    error_code = "invalid_plugin_name"


class ArtifactIntegrityError(PluginValidationError):
    """Raised when a plugin directory or `.wasmboxpkg` artifact is malformed.

    Covers missing/mismatched manifest fields and archives whose members would
    escape the extraction directory (zip-slip) or expand unreasonably large.
    """

    error_code = "invalid_artifact"


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


@dataclass(frozen=True)
class ParsedManifest:
    """The manifest fields the packager/unpacker rely on, already validated."""

    name: str
    entrypoint: str
    format_version: str
    major_version: int


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


def validate_plugin_name(plugin_name: object) -> str:
    """Return `plugin_name` if it is a safe plugin name, otherwise raise.

    Every compile entrypoint funnels through here, closing the path-traversal
    hole left open by trusting a tenant-supplied name as a directory/filename.

    Args:
        plugin_name: Candidate name from the CLI, the API, or a manifest.

    Returns:
        The name unchanged, narrowed to `str`.

    Raises:
        InvalidPluginNameError: If the name is not a string matching
            PLUGIN_NAME_PATTERN.
    """
    is_valid_name = (
        isinstance(plugin_name, str)
        and _PLUGIN_NAME_RE.fullmatch(plugin_name) is not None
    )
    if not is_valid_name:
        raise InvalidPluginNameError(
            f"Plugin name must match {PLUGIN_NAME_PATTERN}, got {plugin_name!r}"
        )
    return plugin_name


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
        InvalidPluginNameError: If plugin_name is unsafe as a directory/filename.
        SourceTooLargeError: If source_bytes exceeds MAX_SOURCE_BYTES.
        EncodingError: If source_bytes is not valid UTF-8.
        EmptySourceError: If source is empty or whitespace-only.
        SyntaxValidationError: If source fails to parse.
        DisallowedImportError: If a banned import is detected.
        ResourceLimitError: If resource_limits contains invalid values.
    """
    plugin_name = validate_plugin_name(plugin_name)
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
        ArtifactIntegrityError: If the manifest is malformed or its entrypoint
            is unsafe/missing on disk.
    """
    plugin_dir = Path(plugin_dir)
    artifact_dir = Path(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = plugin_dir / MANIFEST_FILENAME
    manifest = _load_manifest_file(manifest_path)
    entrypoint_path = plugin_dir / manifest.entrypoint
    if not entrypoint_path.is_file():
        raise ArtifactIntegrityError(
            f"Manifest entrypoint {manifest.entrypoint!r} is missing from {plugin_dir}"
        )

    artifact_path = artifact_dir / f"{manifest.name}{ARTIFACT_SUFFIX}"
    with zipfile.ZipFile(artifact_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(manifest_path, arcname=MANIFEST_FILENAME)
        zf.write(entrypoint_path, arcname=manifest.entrypoint)

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
        manifest = _load_archive_manifest(zf)

        # Forward-compatibility guard: refuse artifacts produced by a newer
        # format we don't understand yet. Older formats (e.g. 1.0, without
        # resource_limits) still unpack fine; the runner applies defaults.
        current_major = _current_format_major()
        if manifest.major_version > current_major:
            raise ValueError(
                f"Artifact format {manifest.format_version} is newer than "
                f"supported {PLUGIN_FORMAT_VERSION}"
            )

        plugin_dir = output_dir / manifest.name
        _verify_archive(zf, plugin_dir)
        if plugin_dir.exists():
            shutil.rmtree(plugin_dir)
        plugin_dir.mkdir(parents=True)
        zf.extractall(plugin_dir)

    return plugin_dir


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _current_format_major() -> int:
    """Return the major component of the format version we produce."""
    return int(PLUGIN_FORMAT_VERSION.split(".", maxsplit=1)[0])


def _require_format_version(value: object) -> str:
    """Return a `"<major>.<minor>"` version string, else raise."""
    is_valid_version = (
        isinstance(value, str) and _FORMAT_VERSION_RE.fullmatch(value) is not None
    )
    if not is_valid_version:
        raise ArtifactIntegrityError(f"Malformed format_version: {value!r}")
    return value


def _validate_entrypoint_name(entrypoint: object) -> str:
    """Return a bare `<name>.py` entrypoint filename, else raise.

    The entrypoint is joined onto a directory and stored inside the artifact,
    so it must not contain directories, traversal segments, or an absolute path.
    """
    is_bare_python_file = (
        isinstance(entrypoint, str)
        and entrypoint.endswith(".py")
        and Path(entrypoint).name == entrypoint
    )
    if not is_bare_python_file:
        raise ArtifactIntegrityError(
            f"Manifest entrypoint must be a bare .py filename, got {entrypoint!r}"
        )
    return entrypoint


def _parse_manifest(raw_manifest: object) -> ParsedManifest:
    """Validate a decoded manifest's shape and return its trusted fields.

    Raises:
        ArtifactIntegrityError: If the manifest is not an object, is missing a
            required key, or carries an unsafe name/entrypoint/version.
    """
    if not isinstance(raw_manifest, dict):
        raise ArtifactIntegrityError("Manifest must be a JSON object")

    missing_keys = sorted(REQUIRED_MANIFEST_KEYS - set(raw_manifest))
    if missing_keys:
        raise ArtifactIntegrityError(
            f"Manifest is missing required key(s): {missing_keys}"
        )

    format_version = _require_format_version(raw_manifest["format_version"])
    return ParsedManifest(
        name=validate_plugin_name(raw_manifest["name"]),
        entrypoint=_validate_entrypoint_name(raw_manifest["entrypoint"]),
        format_version=format_version,
        major_version=int(format_version.split(".", maxsplit=1)[0]),
    )


def _load_manifest_file(manifest_path: Path) -> ParsedManifest:
    """Read and validate a plugin directory's `manifest.json`.

    Raises:
        FileNotFoundError: If the manifest file does not exist.
        ArtifactIntegrityError: If the manifest is unreadable or malformed.
    """
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"{manifest_path.parent} is not a compiled plugin (missing {MANIFEST_FILENAME})"
        )
    try:
        raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise ArtifactIntegrityError(f"Manifest is not valid JSON: {exc}") from exc
    return _parse_manifest(raw_manifest)


def _load_archive_manifest(archive: zipfile.ZipFile) -> ParsedManifest:
    """Read and validate the manifest stored inside an artifact archive.

    Raises:
        ArtifactIntegrityError: If the archive has no readable or malformed manifest.
    """
    try:
        raw_manifest = json.loads(archive.read(MANIFEST_FILENAME))
    except (KeyError, ValueError) as exc:
        raise ArtifactIntegrityError(
            f"Artifact has no readable {MANIFEST_FILENAME}: {exc}"
        ) from exc
    return _parse_manifest(raw_manifest)


def _verify_archive(archive: zipfile.ZipFile, destination: Path) -> None:
    """Reject unsafe artifacts before any bytes are written to disk.

    Guards against two classes of hostile archive:

    1. Zip-slip — a member path that resolves outside `destination`.
    2. Decompression bombs — an archive whose members expand past
       MAX_ARTIFACT_UNCOMPRESSED_BYTES.

    Raises:
        ArtifactIntegrityError: If any member escapes `destination` or the
            archive expands too large.
    """
    members = archive.infolist()
    uncompressed_total = sum(member.file_size for member in members)
    if uncompressed_total > MAX_ARTIFACT_UNCOMPRESSED_BYTES:
        raise ArtifactIntegrityError(
            f"Artifact expands to {uncompressed_total} bytes, above the "
            f"{MAX_ARTIFACT_UNCOMPRESSED_BYTES} byte limit"
        )

    base_dir = Path(destination).resolve()
    for member in members:
        if not (base_dir / member.filename).resolve().is_relative_to(base_dir):
            raise ArtifactIntegrityError(
                f"Artifact member {member.filename!r} escapes {base_dir}"
            )


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
