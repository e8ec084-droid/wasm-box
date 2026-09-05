# WasmBox — Compilation Engine (R2)

Week 1 + Week 2 deliverables for the **Compiler Engineer (Python→WASM)**
role on Project 3 ("WasmBox": Secure Multi-Tenant Plugin Sandbox).

Takes untrusted Python plugin source, validates it, packages it into a
portable artifact, and runs it fully sandboxed inside a WASI-compiled
CPython 3.12 interpreter via Wasmtime — no filesystem or network access
outside an explicitly preopened plugin directory.

## Quickstart

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Fetch the shared WASI Python runtime (not committed — 26 MB)
bash scripts/fetch_runtime.sh

# --- CLI workflow (Week 1) ---
python3 src/compiler.py samples/hello_world.py plugins hello_world
python3 src/runner.py plugins/hello_world

# --- API workflow (Week 2) ---
cd src && uvicorn api:app --reload
# in another terminal:
curl -X POST http://127.0.0.1:8000/plugins \
  -H "Content-Type: application/json" \
  -d '{"name": "greet", "source": "print(2 + 2)"}'
curl -O -J http://127.0.0.1:8000/plugins/greet/artifact

# Full test suite (34 tests: Week 1 + Week 2 + Week 3)
python3 -m pytest tests/ -v
```

Expected CLI output:
```
Hello from inside the WASM sandbox!
[37.44 ms, ok=True]
```

Expected API response:
```json
{"name":"greet","source_sha256":"...","format_version":"2.0","artifact_filename":"greet.wasmboxpkg","resource_limits":{"max_memory_bytes":33554432,"max_fuel":1000000000,"timeout_ms":50}}
```

## Layout

```
src/compiler.py       - validates + packages untrusted source, .wasmboxpkg artifacts
src/api.py            - FastAPI endpoint wrapping the compiler (Week 2)
src/runner.py         - loads the shared runtime, executes a plugin sandboxed
samples/              - example plugin source (hello_world + 4 varied scripts)
plugins/              - compiled plugin output (gitignored, generated)
artifacts/            - packaged .wasmboxpkg files (gitignored, generated)
scripts/fetch_runtime.sh - reproducible vendored-runtime fetch + checksum
runtime/              - vendored python-3.12.0.wasm (gitignored, fetched)
tests/                - pytest suite: compile, execute, API, error cases
docs/                 - toolchain research + pipeline/packaging design docs
```

## Design decisions

- [`docs/01-toolchain-research.md`](docs/01-toolchain-research.md) — why we
  standardized on a prebuilt CPython-WASI runtime instead of Pyodide or a
  from-scratch compiler.
- [`docs/05-pipeline-design.md`](docs/05-pipeline-design.md) — how compile
  and execute fit together, and what R1/R3/R4 build on top of this.
- [`docs/06-week2-packaging.md`](docs/06-week2-packaging.md) — the API
  design, the `.wasmboxpkg` artifact format, and structured compiler errors.
- [`docs/07-week3-resource-limits.md`](docs/07-week3-resource-limits.md) —
  the `resource_limits` manifest schema and how fuel/memory limits are
  enforced in the runner.

## Status: Week 1 (Compiler Engineer track)

- [x] Mon — Researched Python→WASM toolchains, documented decision
- [x] Tue — Reproducible build toolchain (`scripts/fetch_runtime.sh`)
- [x] Wed — Compiled first plugin end-to-end (`hello_world`)
- [x] Thu — Tested compiled output execution (`tests/test_hello_world.py`)
- [x] Fri — Documented the compiler pipeline design

## Status: Week 2 (Compiler & Execution Pipeline track)

- [x] Mon — `POST /plugins` API endpoint accepting raw Python source (`src/api.py`)
- [x] Tue — Manifest format versioning (`PLUGIN_FORMAT_VERSION`) tying plugins to the shared runtime
- [x] Wed — `.wasmboxpkg` single-file artifact packaging (`package_artifact`/`unpack_artifact`)
- [x] Thu — Compiler tested against 4 varied sample scripts (loops, functions, strings, dicts)
- [x] Fri — Structured compiler error codes (`error_code` on every `PluginValidationError`), surfaced as API 422s

## Status: Week 3 (Resource Constraints track)

- [x] Mon — `resource_limits` block in the manifest (format v2.0); runner enforces fuel + memory limits; `while True:` plugins terminate instead of hanging (see `docs/07-week3-resource-limits.md`)
- [ ] Tue — Test compiled plugins against limits
- [ ] Wed — Handle compiler warnings for oversized code
- [ ] Thu — Regression test compiler changes
- [ ] Fri — Document limits interface
