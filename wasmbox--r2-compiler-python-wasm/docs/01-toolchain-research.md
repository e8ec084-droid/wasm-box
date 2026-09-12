# Toolchain Research: Python → WASM (Monday, Week 1)

## Options evaluated

### 1. Pyodide
CPython + the scientific stack compiled to WASM via Emscripten, targeting
the browser. Pros: mature, huge package ecosystem. Cons: built for
`wasm32-emscripten` + a JS glue layer, not for a headless server-side
sandbox driven by Wasmtime. Emscripten's browser-oriented runtime brings a
lot of dead weight (DOM shims, virtual filesystem layers) we don't need,
and the standard embedding path is a browser `<script>` tag, not
`wasmtime-py`.

### 2. Custom Rust toolchain (compile a Python-subset AST to WAT/Rust)
Write our own compiler that lowers a restricted Python grammar to
WebAssembly text format, or transpiles to Rust and compiles with
`rustc --target wasm32-wasi`. Pros: smallest possible binaries, full
control over the sandbox surface. Cons: this is a multi-month language
implementation project (parser, type/semantic checks, codegen,
stdlib subset) — completely out of scope for a 4-week build, and it would
mean re-implementing large parts of CPython's semantics badly.

### 3. Standalone CPython built for `wasm32-wasi` (chosen)
The [`webassembly-language-runtimes`](https://github.com/vmware-labs/webassembly-language-runtimes)
project publishes a prebuilt, pinned CPython 3.12.0 binary targeting WASI
(`python-3.12.0.wasm`, built with `wasi-sdk-20`). It runs as a normal WASI
module under Wasmtime: no browser, no JS glue, `argv`/`stdin`/`stdout`/
preopened directories all work exactly the way `wasmtime-py`'s `WasiConfig`
expects.

## Decision

**Use the prebuilt CPython-3.12-WASI module as the one shared runtime**,
loaded once by R1's Wasmtime host. "Compiling" an individual plugin does
**not** mean producing a new `.wasm` binary per plugin — it means:

1. Statically validating the untrusted Python source (syntax, obviously
   hostile imports).
2. Packaging it as a small plugin directory (`main.py` + `manifest.json`).
3. Handing that directory to the shared runtime at execution time as a
   preopened WASI directory, with a brand-new `Store`/instance per run so
   plugin executions never share interpreter state.

This is the same shape used by production untrusted-code sandboxes (Extism,
Wasmer's plugin model): one audited, compiled-once runtime; many isolated,
cheap executions of different input source. It's what makes sub-5ms cold
starts (the spec's target) realistic — we're not paying compiler cost on
every plugin call, only interpreter-startup cost inside an already-compiled
module.

Full design writeup: [`05-pipeline-design.md`](./05-pipeline-design.md).
