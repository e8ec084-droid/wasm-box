# Week 3: Resource Limits Interface (Friday, R2 — Compiler Engineer)

This is the Week 3 wrap-up doc: the complete, user-facing interface for
resource limits — how a tenant declares them, how the compiler carries
them, how the runner enforces them, and the new compile-time *warnings*
for oversized code. Enforcement mechanics and the measured default values
live in [`docs/07-week3-resource-limits.md`](07-week3-resource-limits.md);
this doc is the "what can I call and what do I get back" reference.

## 1. Declaring limits (compile time)

Every plugin carries a `resource_limits` block in its `manifest.json`
(format_version `2.0`). Defaults apply when the tenant says nothing:

```json
{
  "resource_limits": {
    "max_memory_bytes": 33554432,
    "max_fuel": 1000000000,
    "timeout_ms": 50
  }
}
```

| Key | Default | Meaning | Enforced by |
|---|---|---|---|
| `max_memory_bytes` | 32 MiB | Hard cap on WASM linear memory | runner (`Store.set_limits`) |
| `max_fuel` | 1,000,000,000 | Deterministic instruction budget; exhaustion traps | runner (`Store.set_fuel`) |
| `timeout_ms` | 50 | Declared wall-clock target from the brief | metadata only (R1's watchdog reads it) |

### Overriding per plugin

Both compile entrypoints accept an optional `resource_limits` dict; each key
overrides the default, the rest merge in. Anything invalid
(unknown key, non-integer, out of bounds) is rejected up front with
`ResourceLimitError` (`error_code=invalid_resource_limits`, API `422`) —
fail fast at compile time, never discover a bad limit mid-execution.

- `compile_source(..., resource_limits=...)` — the programmatic entrypoint
- `POST /plugins` JSON body `resource_limits` field — the HTTP entrypoint

Bounds: memory 1 MiB–4 GiB, fuel 1–10^12, timeout 1–60 000 ms.

## 2. Enforcement (run time)

`runner.PluginRunner.run()` reads the limits from the unpacked plugin's
manifest (defaults if the block is absent, so pre-2.0 artifacts still run),
then before instantiation:

1. `store.set_fuel(max_fuel)` — instruction budget
2. `store.set_limits(memory_size=max_memory_bytes)` — memory cap

A terminated run is attributed via canonical trap messages
(`"all fuel consumed by WebAssembly"` → `limit_hit="fuel"`,
`"memory size limit exceeded"` → `limit_hit="memory"`) and reported on
`ExecutionResult` alongside `fuel_consumed` (initial budget minus what
remains). A limit hit sets `ok=False`, so an infinite `while True:` loop
is a deterministic failed run, never a hang and never a false success.

## 3. Compiler warnings for oversized code (Wednesday)

Separate from hard errors: source that *fits* but is getting large compiles
successfully with a non-fatal warning. The threshold is a ratio of the hard
cap — `SOURCE_SIZE_WARNING_RATIO = 0.8` — so it scales automatically if
`MAX_SOURCE_BYTES` ever changes.

```python
@dataclass(frozen=True)
class CompilerWarning:
    code: str      # stable code, e.g. "source_near_size_limit"
    message: str   # human-readable explanation
```

Warnings never block compilation and are **not** written into the artifact
manifest (they're feedback for the author, not metadata for the runtime).
They surface in three places:

| Surface | How it appears |
|---|---|
| `CompiledPlugin.warnings` | `list[CompilerWarning]` on the compile result |
| CLI (`src/compiler.py`) | `warning [source_near_size_limit]: ...` on stderr |
| API (`POST /plugins`) | `"warnings": [{"code": ..., "message": ...}]` in the `201` body |

Example response:

```json
{
  "name": "big",
  "format_version": "2.0",
  "resource_limits": { ... },
  "warnings": [
    {"code": "source_near_size_limit",
     "message": "Plugin source is 212992 bytes, above the 209715 byte warning threshold (80% of the 262144 byte hard limit)"}
  ]
}
```

The `code` mirrors the `error_code` pattern already used for errors, so the
frontend (R5) can switch on it rather than parse message text.

## 4. Full API contract

```
POST /plugins
  body:    {"name": str, "source": str, "resource_limits"?: {...}}
  201:     {name, source_sha256, format_version, artifact_filename,
            resource_limits, warnings: [{code, message}]}
  422:     {detail: {error_code, message}}     # validation failure
  422:     pydantic field errors              # bad name/source shape
GET  /plugins/{name}/artifact -> <name>.wasmboxpkg
GET  /healthz -> {"status": "ok"}
```

## 5. What the tests cover

- `tests/test_resource_limits_v3.py` — manifest block, override merging,
  invalid-limit rejection, API echo/422, and *runtime* enforcement:
  infinite loop killed by fuel, memory bomb without host crash, tight custom
  fuel/memory caps actually biting (not just stored), and limits surviving
  the full `compile → package → unpack → run` artifact round trip.
- `tests/test_compiler_warnings_v3.py` — the warning threshold boundary
  (at → silent, over → warns), warned plugins still compiling and running,
  the hard cap still rejecting (warning ≠ softened error), CLI + API
  surfacing, and regressions: warnings compose with custom resource_limits,
  and the manifest shape is unchanged.

Run everything: `python3 -m pytest tests/ -v`

## Open items (unchanged from Monday)

- Per-run *peak* memory isn't captured yet — R5/R6's "RAM consumed" metric.
- `timeout_ms` is metadata only; enforcement is fuel-based (R1's watchdog).
- No auth/multi-tenancy on the API (out of scope, as in Week 2).