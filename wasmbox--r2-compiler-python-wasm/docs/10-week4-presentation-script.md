# Week 4 Presentation Script — R2 Compiler Engineer (Mon–Tue)

A speaking aid for presenting the Week 4 hardening + caching work.
Target: **5–6 minutes**, then Q&A.

- **Audience:** team / mentor project review.
- **Message:** two deliverables, one shape — *risk → fix → proof*.
- **Tone:** calm, concrete, first-person. No selling, no apologising,
  no reading code aloud.

---

## 0. Ten minutes before you speak

**Open these four things, in this order:**

1. Editor at `src/compiler.py` → `validate_plugin_name` + `_verify_archive`
2. Editor at `src/compile_cache.py` → `compilation_key` + `CompileCache`
3. Editor at `src/api.py` → `compile_plugin_endpoint`
4. Terminal: `cd wasmbox--r2-compiler-python-wasm`, venv activated

**Prep checklist**

- [ ] Pre-load the demo commands into shell history so you only press ↑.
- [ ] Dry-run both CLI commands once (warms the WASI runtime, no stutter).
- [ ] Terminal font ≥ 16pt, dark theme; editor font 15–16pt.
- [ ] Fold every file so only the relevant function is visible — never scroll live.
- [ ] Keep expected outputs pasted in a notes pane as a fallback if a live command misbehaves.
- [ ] Have the 2-minute fallback in mind (drop architecture + cache demo).

---

## 1. The script

### `0:00 – 0:35` · Open — thesis first

> "Thanks. I'm [name], the Compiler Engineer on WasmBox — I own the
> Python-to-WASM compilation pipeline. A tenant sends Python source, my
> compiler validates and packages it into a `.wasmboxpkg`, and R1's runtime
> executes it in the sandbox.
>
> So almost everything I touch is untrusted. My last two days were two jobs:
> **finish hardening that pipeline against hostile input**, and **stop it from
> redoing work it already did**. I'll show you the risk I closed, the design I
> chose, and the tests that prove it."

### `0:35 – 1:00` · One-line architecture

> **ON SCREEN:** README diagram, or the `POST /plugins` flow.
>
> "One sentence on the flow: source comes in over HTTP → validated → written as
> `main.py` plus a manifest → zipped into an artifact. Three things there are
> attacker-controlled: the **name**, the **manifest**, and the **artifact
> archive** itself. Monday was about those three."

### `1:00 – 2:40` · Monday — pipeline hardening

> **ON SCREEN:** terminal. Run:
> `python3 src/compiler.py samples/hello_world.py plugins '../evil'`
>
> "This is the hole I found. A plugin name becomes a directory name and a
> filename — but only the API was checking it. If anything called the compiler
> directly, this name wrote *outside* the output directory. Path traversal."

Expected output:

```
compile failed [invalid_plugin_name]: Plugin name must match [A-Za-z0-9_-]{1,64}, got '../evil'
```

> **ON SCREEN:** `compiler.py` → `validate_plugin_name`.
>
> "The fix is one rule in one place: `PLUGIN_NAME_PATTERN` and
> `validate_plugin_name`, called at the very top of `compile_source`. That means
> the CLI, the API, and any future caller all get it — there's no second place
> to remember. The API imports the *same* pattern into its request model, so the
> two layers can't drift apart."

> **ON SCREEN:** `compiler.py` → `_verify_archive`, highlight the
> `is_relative_to` line.
>
> "Second target: the artifact. `unpack_artifact` used to call
> `zipfile.extractall`, which trusts whatever paths are inside the zip. So a
> crafted artifact could carry `../` members and write outside the plugin
> directory — classic zip-slip — or decompress to gigabytes. Now every member is
> resolved and rejected if it escapes, and the archive is refused if it expands
> past a cap.
>
> The detail I'd point at: I compare *resolved paths* with `is_relative_to`,
> not string prefixes. `a/../b` defeats a prefix check; it doesn't defeat a
> resolved one."

### `2:40 – 4:40` · Tuesday — compilation caching

> **ON SCREEN:** `compile_cache.py` → `compilation_key`.
>
> "Tuesday's task was caching for repeated compilations. Same source in, same
> artifact out — but we were redoing the size checks, the AST parse, the import
> scan, hashing, and deflate on every submit.
>
> The key is a hash of four things: the source's SHA-256, the plugin name, the
> *sorted* resource limits, and the format version. The design question is why I
> keyed on content and not the name."

*Pause — this is the key moment.*

> "Because renaming isn't editing. If a tenant edits the source and keeps the
> name, a name-keyed cache hands back stale bytes. Content-keyed, any edit is a
> guaranteed miss. And sorting the limits means two requests that differ only in
> dictionary order are the same request."

> **ON SCREEN:** `api.py` → the endpoint.
>
> "The flow is short: compute the key, look it up. On a miss we compile,
> package, and store. On a hit we skip all of that and just materialize — write
> the artifact bytes and unpack.
>
> The important part: the hit path calls the *same* `unpack_artifact` from
> Monday. So the fast path inherits the zip-slip and bomb guards instead of
> opening a second, unguarded extraction path."

> **ON SCREEN:** `python3 -m pytest tests/test_compile_cache_v4.py -q`
>
> "It's a bounded LRU — 128 entries by default, zero disables it — and it
> exposes hits, misses, stores, and evictions, so R6 can scrape it later."

**If asked why the cache isn't inside `compile_source`:**

> "Because `compile_source` is expected to write into the caller's output
> directory. A cache inside it would have to include that path in the key —
> which kills reuse across directories — or silently skip writes callers depend
> on. The HTTP boundary is also where identical retries actually happen."

### `4:40 – 5:15` · Verification

> **ON SCREEN:** `python3 -m pytest tests/ -q` → show `96 passed`.
>
> "Proof. Ninety-six tests pass — forty-eight were there before, forty-eight are
> new. Hardening: parameterized name cases, traversal rejected *before* any
> directory is written, zip-slip, absolute members, decompression bombs,
> malformed manifests. Caching: key determinism, LRU eviction, a second
> identical request compiles exactly once, a changed source recompiles, the
> cached artifact downloads byte-identically, and failed validations are never
> cached.
>
> End to end, I also compiled and ran `hello_world` through the CLI to the
> sandbox — it printed its expected output."

### `5:15 – 5:40` · Close

> "So: a trust boundary the pipeline enforces itself, and a cache that doesn't
> compromise it. Next for me is Wednesday — final compiler testing — then bug
> fixes and the final documentation. Happy to go deeper on any of it."

---

## 2. Screen choreography (what to show, what to skip)

| Beat | Show | Do **not** show |
|---|---|---|
| Open | README / architecture diagram | scrolling code |
| Threat | terminal: traversal command failing | the whole `compiler.py` |
| Fix | `validate_plugin_name` (≈6 lines) | directory tree |
| Artifact | `_verify_archive` (≈10 lines) | full `unpack_artifact` |
| Cache design | `compilation_key` (≈10 lines) | `CompileCache` internals |
| Cache flow | `api.py` endpoint (≈8 lines) | Pydantic models |
| Proof | `pytest -q` summary line | verbose per-test output |

**Rule:** never scroll. Pre-select the function before you begin, collapse the
rest, and let the highlight do the pointing.

---

## 3. Numbers cheat-sheet (memorise)

| Fact | Value |
|---|---|
| Tests passing | **96** (48 new) |
| Plugin name rule | `[A-Za-z0-9_-]{1,64}` |
| Artifact expansion cap | **1 MiB** (4 × 256 KB source cap) |
| Cache default size | **128** entries; `0` disables |
| Cache key inputs | **4** — source hash, name, sorted limits, format version |
| New error codes | `invalid_plugin_name`, `invalid_artifact` |

---

## 4. Q&A rapid-fire

- **Why not `functools.lru_cache`?** Can't bound per-instance, can't
  inspect/reset, no hit/miss stats for R6, awkward for byte payloads.
- **Why SHA-256?** We already hash the source for the manifest; it's
  collision-resistant and cheap at plugin sizes.
- **What happens with multiple workers?** In-process today; the interface is
  small enough to put Redis/disk behind later — it's in the open items.
- **Could an attacker poison the cache?** Only successful compiles are stored,
  and the key includes the content hash, so a stored entry is exactly the bytes
  that passed validation.
- **Did you change anyone else's code?** No — R1's runtime and R4's
  `host_bridge` are untouched; only R2's compiler/API plus new files.
- **Is it production-ready?** No, and say so plainly: no auth/multi-tenancy,
  peak-memory metric still missing, `timeout_ms` is metadata only.

---

## 5. If you get cut short (2-minute version)

Keep **threat → fix → 96 tests**. Drop the architecture beat and the cache
demo. The traversal demo and the test summary carry the talk on their own.

---

## 6. Supporting material

- Design detail: `docs/09-week4-hardening-and-caching.md`
- Tests: `tests/test_pipeline_hardening_v4.py`, `tests/test_compile_cache_v4.py`
- Code: `src/compiler.py`, `src/compile_cache.py`, `src/api.py`
