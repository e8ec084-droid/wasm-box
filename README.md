# WasmBox — Compilation Engine (R2)

Week 1 deliverable for the **Compiler Engineer (Python→WASM)** role on
Project 3 ("WasmBox": Secure Multi-Tenant Plugin Sandbox).

Takes untrusted Python plugin source, validates it, and runs it fully
sandboxed inside a WASI-compiled CPython 3.12 interpreter via Wasmtime —
no filesystem or network access outside an explicitly preopened plugin
directory.

## Quickstart

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Fetch the shared WASI Python runtime (not committed — 26 MB)
bash scripts/fetch_runtime.sh

# Compile a sample plugin
python3 src/compiler.py samples/hello_world.py plugins hello_world

# Run it, sandboxed
python3 src/runner.py plugins/hello_world

# Full test suite
python3 -m pytest tests/ -v
```

Expected output:
```
Hello from inside the WASM sandbox!
[37.44 ms, ok=True]
```

## Layout

```
src/compiler.py    - validates + packages untrusted source (compile_plugin)
src/runner.py       - loads the shared runtime, executes a plugin sandboxed
samples/            - example plugin source
plugins/             - compiled plugin output (gitignored, generated)
scripts/fetch_runtime.sh - reproducible vendored-runtime fetch + checksum
runtime/             - vendored python-3.12.0.wasm (gitignored, fetched)
tests/               - pytest suite: compile + execute + rejection cases
docs/                - Monday's toolchain research, Friday's pipeline design
```

## Design decisions

See [`docs/01-toolchain-research.md`](docs/01-toolchain-research.md) for
why we standardized on a prebuilt CPython-WASI runtime instead of Pyodide
or a from-scratch compiler, and
[`docs/05-pipeline-design.md`](docs/05-pipeline-design.md) for how the
pieces fit together and what next week's roles (R1, R3, R4) build on top
of this.

## Status: Week 1 (Compiler Engineer track)

- [x] Mon — Researched Python→WASM toolchains, documented decision
- [x] Tue — Reproducible build toolchain (`scripts/fetch_runtime.sh`)
- [x] Wed — Compiled first plugin end-to-end (`hello_world`)
- [x] Thu — Tested compiled output execution (`tests/test_hello_world.py`)
- [x] Fri — Documented the compiler pipeline design
