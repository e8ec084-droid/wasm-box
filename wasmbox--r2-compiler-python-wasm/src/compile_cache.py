"""Content-addressed cache for repeated plugin compilations.

Week 4 (Tuesday) deliverable: "Add caching for repeated compilations."

Compiling the same source twice is pure waste — validation, AST parsing, the
import scan, hashing, and deflate are all deterministic for identical inputs.
This module memoizes the *result* of one compile+package under a hash of those
inputs, so a repeat request is served without recomputing any of it.

The cache is deliberately content-addressed (not keyed by plugin name) and
location-independent: an entry holds the manifest plus the packaged artifact
bytes, so a hit can be materialized into any output directory. That keeps the
cache reusable by today's API and by any future batch/CI caller without
coupling it to a storage location.
"""

from __future__ import annotations

import hashlib
import json
from collections import OrderedDict
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from compiler import (
    ARTIFACT_SUFFIX,
    PLUGIN_FORMAT_VERSION,
    CompiledPlugin,
    CompilerWarning,
    unpack_artifact,
)

DEFAULT_MAX_ENTRIES = 128


@dataclass(frozen=True)
class CachedCompilation:
    """A location-independent snapshot of one successful compile+package."""

    manifest: dict[str, object]
    warnings: tuple[CompilerWarning, ...]
    artifact_bytes: bytes

    @property
    def name(self) -> str:
        return str(self.manifest["name"])

    @property
    def artifact_filename(self) -> str:
        return f"{self.name}{ARTIFACT_SUFFIX}"


@dataclass
class CacheStats:
    """Hit/miss counters, so callers can report cache effectiveness."""

    hits: int = 0
    misses: int = 0
    stores: int = 0
    evictions: int = 0


def compilation_key(
    source_bytes: bytes,
    plugin_name: str,
    resource_limits: Mapping[str, int] | None = None,
) -> str:
    """Return the cache key for one compile request.

    The key hashes every input that can change the output: the source, the
    plugin name, the resource-limit overrides, and the format version we emit.
    `sort_keys` makes it independent of key insertion order.

    Args:
        source_bytes: Raw Python source as bytes.
        plugin_name: The requested plugin name.
        resource_limits: Optional limit overrides (as submitted, unmerged).

    Returns:
        A 64-character hex SHA-256 digest.
    """
    payload = {
        "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
        "name": plugin_name,
        "resource_limits": dict(sorted((resource_limits or {}).items())),
        "format_version": PLUGIN_FORMAT_VERSION,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class CompileCache:
    """Bounded LRU cache mapping compilation keys to packaged results.

    Args:
        max_entries: Entries to retain before evicting the least-recently-used.
            `0` disables caching entirely (every lookup misses), which is handy
            for tests and for callers that want compile-only semantics.
    """

    def __init__(self, max_entries: int = DEFAULT_MAX_ENTRIES) -> None:
        self.max_entries = max(0, max_entries)
        self.stats = CacheStats()
        self._entries: OrderedDict[str, CachedCompilation] = OrderedDict()

    @property
    def enabled(self) -> bool:
        return self.max_entries > 0

    def get(self, key: str) -> CachedCompilation | None:
        """Return the cached compilation for `key`, or None on a miss."""
        entry = self._entries.get(key) if self.enabled else None
        if entry is None:
            self.stats.misses += 1
            return None
        self._entries.move_to_end(key)
        self.stats.hits += 1
        return entry

    def put(self, key: str, entry: CachedCompilation) -> None:
        """Store `entry` under `key`, evicting the least-recently-used if full."""
        if not self.enabled:
            return
        self._entries[key] = entry
        self._entries.move_to_end(key)
        self.stats.stores += 1
        while len(self._entries) > self.max_entries:
            self._entries.popitem(last=False)
            self.stats.evictions += 1

    def clear(self) -> None:
        """Drop every entry and reset the counters."""
        self._entries.clear()
        self.stats = CacheStats()

    def __len__(self) -> int:
        return len(self._entries)


def snapshot(plugin: CompiledPlugin, artifact_path: Path) -> CachedCompilation:
    """Capture a compiled plugin and its packaged artifact as a cache entry."""
    manifest = json.loads(plugin.manifest_path.read_text(encoding="utf-8"))
    return CachedCompilation(
        manifest=manifest,
        warnings=tuple(plugin.warnings),
        artifact_bytes=Path(artifact_path).read_bytes(),
    )


def materialize(entry: CachedCompilation, output_dir: Path, artifact_dir: Path) -> Path:
    """Recreate a cached compilation's files on disk and return the artifact path.

    A hit skips validation and packaging but must leave the same on-disk state
    a fresh compile would: the `.wasmboxpkg` artifact plus the unpacked plugin
    directory. Reusing `unpack_artifact` keeps extraction — and its zip-slip
    guards — in exactly one place.
    """
    artifact_dir = Path(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_dir / entry.artifact_filename
    artifact_path.write_bytes(entry.artifact_bytes)
    unpack_artifact(artifact_path, Path(output_dir))
    return artifact_path
