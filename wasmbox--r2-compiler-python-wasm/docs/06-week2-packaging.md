# Week 2: API & Packaging Design

## Monday — `/plugins` endpoint

`src/api.py` wraps `compiler.compile_source()` (a new byte-string entrypoint
added this week, alongside Week 1's file-based `compile_plugin()`) in a
FastAPI app. Rationale for a new `compile_source`: Week 1's CLI reads a
`.py` file off disk, but a real tenant submits source over HTTP — forcing
every submission through a temp file would be pure overhead.

`POST /plugins` returns `201` with the plugin's hash/artifact name, or `422`
with a structured `{error_code, message}` body on validation failure — see
Friday, below.

## Tuesday — packaging with the shared interpreter

Nothing changes about *which* interpreter a plugin runs on: every plugin's
`manifest.json` still pins `"runtime": "python-3.12.0-wasi"` exactly as in
Week 1. What's new is `PLUGIN_FORMAT_VERSION` — bumping this lets us
change the manifest schema later (e.g. adding resource-limit metadata for
R1's Week 3 fuel/memory work) without silently breaking old compiled
plugins; `unpack_artifact` can check it before handing a plugin to the
runner.

## Wednesday — "output executable .wasm binary" → `package_artifact`

As agreed: we do not compile a new native `.wasm` per plugin (see
`docs/01-toolchain-research.md` for why that's not realistic). Instead,
`package_artifact()` zips `manifest.json` + `main.py` into a single
`<name>.wasmboxpkg` file — a genuine build *artifact*: one file, content-
addressed by the manifest's `source_sha256`, downloadable via
`GET /plugins/{name}/artifact`, and re-expandable anywhere via
`unpack_artifact()` before `runner.PluginRunner.run()` executes it.

This is the honest equivalent of "the compiler's output" for this
architecture: a portable, versioned unit a tenant (or CI, or R1's runtime
host) can move around and execute without needing the original compile step
again.

## Thursday — varied sample scripts

Added four samples beyond `hello_world.py` (`loop_sum.py`,
`function_call.py`, `string_processing.py`, `list_and_dict.py`) covering
loops, function calls, string methods, and dict/aggregate operations.
`tests/test_api_and_compiler_v2.py::test_varied_samples_compile_and_run` is
parametrized across all four — proving the pipeline handles real control
flow and stdlib usage, not just a single `print()`.

## Friday — structured compiler errors

`compiler.py` now has a small exception hierarchy
(`EmptySourceError`, `SourceTooLargeError`, `EncodingError`,
`SyntaxValidationError`, `DisallowedImportError`), each with a stable
`error_code`. The API maps any `PluginValidationError` subclass straight to
a `422` response body: `{"error_code": ..., "message": ...}`. This means a
frontend (R5) can switch on `error_code` to show a specific hint ("your
file is too large", "syntax error on line N") instead of dumping a raw
Python traceback at the plugin author.

## What's still open for next week

- R1's fuel/memory limits aren't wired into `manifest.json` yet — Week 3's
  natural extension point is adding a `resource_limits` block to the
  manifest schema (format_version bump) that `runner.py` reads and applies
  to the `Store` before running.
- The API has no auth/multi-tenancy boundary yet — fine for a portfolio
  demo, not fine for anything real; that's out of scope for R2 specifically
  but worth flagging for whoever owns the developer portal end-to-end.
