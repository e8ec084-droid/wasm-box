# Week 3: Resource Limits Interface (Monday, R2 — Compiler Engineer)

The brief's Week 3 ("Resource Constraints & Memory Metrics") requires strict,
enforced limits on plugin execution: cap memory allocation, and terminate an
infinite `while True:` loop instead of letting it hang the host. This doc
records the Day 1 interface decision — the `resource_limits` manifest block
and how the pipeline consumes it — and the measured numbers behind the
defaults.

## The manifest schema (format_version 2.0)

Every compiled plugin's `manifest.json` now carries a `resource_limits`
block. `PLUGIN_FORMAT_VERSION` bumped `1.0 -> 2.0` for exactly this change
(see `docs/06-week2-packaging.md`, "What's still open for next week").

```json
{
  "name": "greet",
  "entrypoint": "main.py",
  "source_sha256": "...",
  "runtime": "python-3.12.0-wasi",
  "format_version": "2.0",
  "resource_limits": {
    "max_memory_bytes": 33554432,
    "max_fuel": 1000000000,
    "timeout_ms": 50
  }
}
```

| Key | Default | Meaning | Enforced by |
|---|---|---|---|
| `max_memory_bytes` | 32 MiB | Hard cap on the plugin's WASM linear memory (`Store.set_limits`) | runner today |
| `max_fuel` | 1,000,000,000 | Deterministic instruction budget (`Store.set_fuel`); exhaustion traps | runner today |
| `timeout_ms` | 50 | Declared wall-clock target from the brief | **not yet** — R1's watchdog (epoch interruption) reads this field |

### Why the defaults are what they are (measured, not guessed)

All numbers below were measured against the pinned `python-3.12.0.wasm`
runtime under wasmtime-py 48 on this machine:

- Interpreter boot + `hello_world` consumes **~248.5M fuel** and peaks at
  **~10.0 MB** of linear memory.
- A `while True: pass` loop burns fuel at **~10.3M fuel/ms**, i.e. it is
  killed *deterministically* by an instruction budget, never by guessing at
  wall time.
- The brief's literal **10 MB cap is not viable**: CPython's own baseline is
  ~10 MB, so an 8 MB plugin allocation already fails under it. 32 MiB is the
  smallest power-of-two that gives real plugin headroom (~20 MB) while still
  stopping memory bombs early.
- `max_fuel = 1G` gives ~4x headroom over a healthy plugin while terminating
  an infinite loop ~73 ms after interpreter startup (~125 ms wall here).
  Fuel is machine-independent (instruction count); wall-clock varies with
  hardware, which is why the 50 ms target lives as *metadata* (`timeout_ms`)
  for R1's wall-clock watchdog rather than being baked into the fuel number.

### Per-plugin overrides

`compile_source()` / `POST /plugins` accept an optional `resource_limits`
dict; each provided key overrides the default, the rest merge in. Validation
(`ResourceLimitError`, API `422` with `error_code=invalid_resource_limits`):

- unknown keys rejected
- values must be positive integers (bounds: memory 1 MiB–4 GiB, fuel 1–1e12,
  timeout 1–60 000 ms)

## Enforcement (runner)

`runner.py` enables fuel consumption on the shared engine (`Config.consume_fuel`)
once, then per run:

1. reads `resource_limits` from the plugin manifest (defaults if absent, so
   pre-2.0 artifacts still run);
2. `store.set_fuel(max_fuel)` and `store.set_limits(memory_size=max_memory_bytes)`
   before instantiation;
3. attributes termination to a limit via the canonical trap messages:
   `"all fuel consumed by WebAssembly"` -> `limit_hit="fuel"`,
   `"memory size limit exceeded"` -> `limit_hit="memory"`;
4. reports `limit_hit` and `fuel_consumed` on `ExecutionResult` (ok=False on
   a limit hit, so a killed infinite loop is not mistaken for success).

The memory cap surfaces inside the sandbox as CPython's own `MemoryError`
(graceful traceback + exit 1) rather than a host crash — verified with a
128 MB allocation under the 32 MB cap.

## Role handoffs / what this enables

- **R1 (Wed):** wall-clock watchdog reading `timeout_ms` (epoch interruption
  or thread + join), on top of today's fuel enforcement.
- **R3:** stress tests — fuel-exhaustion edge cases, memory-bomb plugins —
  now have a defined, enforced contract to attack.
- **R5/R6:** `limit_hit`, `fuel_consumed`, and `elapsed_ms` are the raw
  metrics for the "limit violation" UI and the Week 3 QA log.

## Open items

- Per-run *peak* memory is not yet captured (runner would need to hold the
  instance memory handle) — R5/R6's "RAM consumed" metric is the follow-up.
- `timeout_ms` is metadata only today; enforcement is fuel-based.
- No auth/multi-tenancy on the API (out of scope, as in Week 2).