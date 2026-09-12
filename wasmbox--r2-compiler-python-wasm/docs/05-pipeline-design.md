# Compiler Pipeline Design (Friday, Week 1)

## Flow

```
 untrusted source (.py)
        |
        v
 [compiler.py]  compile_plugin()
   - ast.parse()            -> reject on SyntaxError
   - reject disallowed imports (socket, subprocess, ctypes, multiprocessing)
   - write plugins/<name>/main.py
   - write plugins/<name>/manifest.json  (name, entrypoint, sha256, runtime id)
        |
        v
 plugin package (directory)
        |
        v
 [runner.py]  PluginRunner.run(plugin_dir)
   - Engine/Module/Linker built ONCE at process start (shared runtime,
     python-3.12.0.wasm, loaded from runtime/)
   - per call: new Store + WasiConfig
       - argv = ["python", "/plugin/main.py"]
       - preopen_dir(plugin_dir -> "/plugin")   <- ONLY this directory visible
       - stdout/stderr captured to files
   - instantiate + call _start()
   - return ExecutionResult(stdout, stderr, elapsed_ms, ok)
```

## Why compile-once / run-many

Instantiating a `Module` from the 26 MB `python-3.12.0.wasm` involves
validating and compiling real WASM bytecode — that's the expensive part.
We pay it exactly once per process (in `PluginRunner.__init__`). Running a
plugin after that is "just" instantiating a fresh `Store` against the
already-compiled `Module`, which is cheap — our local runs land around
30–50 ms end-to-end including CPython's own interpreter startup, most of
which is CPython initializing itself, not Wasmtime overhead.

## What this validates vs. what it doesn't (yet)

This week's pipeline proves the **shape** of the whole system works:
source in, sandboxed execution, output out. It intentionally does **not**
yet cover:

- Deep filesystem/network denial proof — WASI already has no socket
  imports and only the plugin's own directory is preopened, but **R3
  formally attacks this** in the Mid-Project security audit (Week 2).
- Memory/instruction limits (`while True: pass` style abuse) — that's
  **R1's Week 3** task, configuring Wasmtime's fuel/memory metering on the
  `Store`.
- Host function bridging for authorized side effects (e.g. writing to a
  specific DB row) — **R4's** Week 1–4 work, layered on top of this same
  `Linker`.

Those all build directly on `PluginRunner`'s `Engine`/`Module`/`Linker`
setup — nothing here needs to change shape for them to plug in.

## Known trade-offs

- The vendored runtime is **26 MB**; that's why it's fetched via
  `scripts/fetch_runtime.sh` and gitignored rather than committed.
- Static import-blocking in `compiler.py` is a cheap first-pass filter, not
  a security boundary — don't rely on it in place of R3's sandbox-level
  enforcement.
- `_start()` raising on a clean `exit(0)` is expected `wasmtime-py`
  behavior for WASI programs; we treat stderr content, not the exception,
  as the real failure signal (see `runner.py`).
