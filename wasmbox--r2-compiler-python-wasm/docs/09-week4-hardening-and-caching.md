# Week 4: Pipeline Hardening & Compilation Caching (Mon–Tue, R2)

Two compiler-side deliverables this week:

| Day | Brief task | What shipped |
|---|---|---|
| Mon | Finalize compiler pipeline hardening | Plugin-name, manifest, and artifact validation (`src/compiler.py`) |
| Tue | Add caching for repeated compilations | Content-addressed LRU cache (`src/compile_cache.py` + `src/api.py`) |

Neither day changes the public compile/run contract from Week 3; both close
gaps that only matter once the pipeline faces hostile or repetitive input.

## Monday — hardening

### The gap

Everything reaching the compiler is tenant-controlled: the **plugin name**, the
**manifest** we write (and later re-read), and — on the distribution path — the
**`.wasmboxpkg` archive**. Before this week only the API's Pydantic model
validated a name. `compile_source`/`compile_plugin` (CLI and programmatic
entrypoints) and `unpack_artifact` trusted theirs, which meant:

- `plugin_name="../../x"` wrote a plugin directory *outside* `output_dir`;
- a crafted artifact with `../` members could extract outside the plugin
  directory (classic **zip-slip**), and a tiny archive could decompress to
  gigabytes (**decompression bomb**);
- a missing/malformed manifest surfaced as a raw `KeyError`/`AttributeError`.

### The fix

One validation layer, used by every entrypoint:

- `validate_plugin_name()` — the name rule lives in one place as
  `PLUGIN_NAME_PATTERN = r"[A-Za-z0-9_-]{1,64}"`. `api.py` imports the pattern
  into its request model, so the HTTP layer and the compiler can never drift
  apart. Rejects `..`, `/`, absolute paths, backslashes, dots, spaces, and
  over-long names.
- `_parse_manifest()` — validates a decoded manifest's shape (JSON object,
  required keys, safe `name`/`entrypoint`, well-formed `format_version`) and
  returns a typed `ParsedManifest`. Used by both `package_artifact` (file) and
  `unpack_artifact` (archive member).
- `_verify_archive()` — before extracting anything, rejects any member whose
  resolved path escapes the plugin directory, and any archive whose members sum
  past `MAX_ARTIFACT_UNCOMPRESSED_BYTES` (4× the source cap, generous for
  manifest + one source file).

New structured errors, matching the existing `error_code` convention:

| Error | `error_code` | Raised when |
|---|---|---|
| `InvalidPluginNameError` | `invalid_plugin_name` | name is not a safe identifier |
| `ArtifactIntegrityError` | `invalid_artifact` | manifest/archive is malformed or unsafe |

### Design notes

- **Validate at the boundary, not the call site.** Putting the name check
  inside `compile_source` means the Week 1 CLI wrapper (`compile_plugin`) and
  any future caller get it for free; there is no second place to remember.
- **Reuse, don't duplicate.** `materialize()` (Tuesday) rebuilds from a cached
  artifact by calling `unpack_artifact`, so it inherits the zip-slip and bomb
  guards rather than re-implementing extraction.
- **`is_relative_to` over string prefix checks.** `(base / member).resolve()
  .is_relative_to(base)` compares resolved paths, which is immune to
  `a/../b`, doubled slashes, and absolute members in a way that
  `str.startswith` is not.

## Tuesday — compilation caching

### What is cached, and why a content hash

Compiling the same source twice repeats work that is deterministic for the same
inputs: size checks, UTF-8 decode, `ast.parse`, the import scan, SHA-256, and
deflate. `compile_cache.compilation_key()` hashes exactly those determinative
inputs:

```
sha256( source_sha256, plugin_name, sorted(resource_limits), format_version )
```

- **Content-addressed, not name-addressed.** Keying on the name would serve
  stale bytes when a tenant edits a plugin without renaming it. Keying on the
  content means an edit always misses and recompiles.
- **`sort_keys`/sorted limits.** Two requests that differ only in dict order
  are the same request and hit the same entry.
- **Location-independent.** An entry stores the manifest, the warnings, and the
  packaged artifact **bytes** — not a path — so a hit can be materialized into
  any output directory. That is what makes the cache reusable beyond the API.

### Hit vs. miss

```
POST /plugins
   key = compilation_key(...)
   entry = compile_cache.get(key)
   if entry is None:               # MISS: validate + compile + package
       entry = _compile_and_package(request)
       compile_cache.put(key, entry)
   artifact = materialize(entry)   # HIT: write bytes + unpack (reuses guards)
   return _to_response(entry)
```

A hit skips validation and packaging entirely but still leaves the same disk
state a fresh compile would: the `.wasmboxpkg` artifact and the unpacked plugin
directory. Validation failures are never cached, so a bad request keeps
returning `422` instead of a stale success (keys are only written after a
successful compile).

### Eviction and observability

`CompileCache` is a bounded LRU (`OrderedDict` + `move_to_end`), default
`DEFAULT_MAX_ENTRIES = 128`; `max_entries=0` disables it (every lookup misses).
`cache.stats` exposes `hits`, `misses`, `stores`, and `evictions`, and
`cache.clear()` empties entries and resets counters — the hook a future R6
metrics/metrics endpoint or a test harness needs.

### Why the cache lives at the API, not inside `compile_source`

`compile_source` is a pure-ish function of `(source, output_dir, name, limits)`
and is expected to *write* into the caller's `output_dir`. Caching inside it
would force `output_dir` into the key (defeating reuse across directories) or
silently skip writes callers rely on. Putting the cache at the HTTP boundary —
where identical retries and resubmits actually happen — keeps the compiler
function honest and the optimization visible. The cache itself is a separate
module, so any batch/CI caller can reuse it without going through HTTP.

## Interface (unchanged from Week 3)

```
POST /plugins
  body:    {"name": str, "source": str, "resource_limits"?: {...}}
  201:     {name, source_sha256, format_version, artifact_filename,
            resource_limits, warnings: [{code, message}]}
  422:     {detail: {error_code, message}}     # includes invalid_plugin_name
GET  /plugins/{name}/artifact -> <name>.wasmboxpkg
GET  /healthz -> {"status": "ok"}
```

The only observable difference for a valid request is that the second identical
submission returns faster and skips re-compilation; the response body is
byte-for-byte the same.

## What the tests cover

- `tests/test_pipeline_hardening_v4.py` — safe vs. unsafe names (parameterized),
  traversal rejected *before* any directory is written, CLI surfacing
  `invalid_plugin_name`, manifest validation in `package_artifact` (bad name,
  entrypoint traversal, missing key, malformed version, missing entrypoint
  file), and `unpack_artifact` rejection of zip-slip, absolute members,
  decompression bombs, missing/non-object manifests, and newer format versions,
  plus a valid round trip.
- `tests/test_compile_cache_v4.py` — key determinism and input sensitivity,
  hit/miss/LRU/disable semantics, `snapshot`/`materialize` round trip, and API
  behavior: repeated POST compiles once, a changed source/limits recompiles, a
  hit rebuilds the artifact and plugin directory, the cached artifact downloads
  identically, and failures are never cached.

Run everything: `python3 -m pytest tests/ -v`

## Open items

- Per-run peak memory is still not captured (R5/R6's metric).
- `timeout_ms` remains metadata only; enforcement is fuel-based (R1's watchdog).
- Cache is in-process only; a multi-worker deployment would want a shared
  store (Redis/disk) behind the same `CompileCache` interface.
- `warnings` are restored from cache but the cache key does not include any
  future warning-threshold config; revisit if thresholds ever become dynamic.
