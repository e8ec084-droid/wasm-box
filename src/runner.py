"""
WasmBox Execution Pipeline (Thursday: "test compiled output execution")
========================================================================
Loads the vendored CPython-3.12-WASI runtime module once, then runs a
compiled plugin inside a fresh, isolated Wasmtime Store per invocation.

Only the plugin's own directory is preopened into the sandbox (as /plugin),
so the interpreter has no visibility into the rest of the host filesystem
and no network access at all (WASI has no socket imports) — R3 hardens and
proves this explicitly in the Mid-Project security audit, but the isolation
boundary already exists here by construction.

Week 3: each run also enforces the plugin manifest's `resource_limits`
block (docs/07-week3-resource-limits.md) — a hard cap on linear memory via
`Store.set_limits` and a deterministic instruction budget via fuel. Fuel
consumption is enabled on the shared engine, so every run must set a fuel
budget (we always do, defaulting from the manifest or the compiler's
defaults); an infinite `while True:` loop exhausts its budget and traps
with "all fuel consumed by WebAssembly" instead of hanging the host.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path

from wasmtime import Config, Engine, Linker, Module, Store, WasiConfig

from compiler import DEFAULT_RESOURCE_LIMITS, MANIFEST_FILENAME

RUNTIME_PATH = Path(__file__).resolve().parent.parent / "runtime" / "python-3.12.0.wasm"

# Canonical Wasmtime trap messages we use to attribute a termination to a
# resource limit rather than to plugin logic.
FUEL_EXHAUSTED_MARKER = "all fuel consumed by WebAssembly"
MEMORY_LIMIT_MARKER = "memory size limit exceeded"


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    elapsed_ms: float
    ok: bool
    # "fuel" or "memory" when a resource limit terminated the run (Week 3).
    limit_hit: str | None = None
    # Total fuel consumed this run (initial budget minus what remains).
    fuel_consumed: int | None = None


class PluginRunner:
    """Wraps one loaded copy of the shared WASI Python runtime module.

    Module compilation (parsing/validating the .wasm bytecode) happens once
    in __init__. Each call to run() gets a brand-new Store + instance, so
    plugin executions never share interpreter state.
    """

    def __init__(self, runtime_path: Path = RUNTIME_PATH) -> None:
        config = Config()
        config.consume_fuel = True  # enables per-run fuel budgets (Week 3)
        self.engine = Engine(config)
        self.module = Module.from_file(self.engine, str(runtime_path))
        self.linker = Linker(self.engine)
        self.linker.define_wasi()

    @staticmethod
    def _load_resource_limits(plugin_dir: Path) -> dict:
        """Read the manifest's `resource_limits` block, defaulting on any
        absence or malformation (e.g. pre-2.0 artifacts without the block)."""
        try:
            manifest = json.loads((Path(plugin_dir) / MANIFEST_FILENAME).read_text(encoding="utf-8"))
            return dict(manifest.get("resource_limits", DEFAULT_RESOURCE_LIMITS))
        except (OSError, ValueError):
            return dict(DEFAULT_RESOURCE_LIMITS)

    def run(self, plugin_dir: Path, entrypoint: str = "main.py") -> ExecutionResult:
        plugin_dir = Path(plugin_dir)
        limits = self._load_resource_limits(plugin_dir)
        stdout_path = plugin_dir / ".stdout"
        stderr_path = plugin_dir / ".stderr"

        store = Store(self.engine)
        wasi = WasiConfig()
        wasi.argv = ["python", f"/plugin/{entrypoint}"]
        wasi.preopen_dir(str(plugin_dir), "/plugin")
        wasi.stdout_file = str(stdout_path)
        wasi.stderr_file = str(stderr_path)
        store.set_wasi(wasi)

        # Week 3: apply the manifest's resource limits before instantiating.
        store.set_fuel(limits["max_fuel"])
        store.set_limits(memory_size=limits["max_memory_bytes"])

        instance = self.linker.instantiate(store, self.module)
        start_fn = instance.exports(store)["_start"]

        started = time.perf_counter()
        limit_hit = None
        try:
            start_fn(store)
        except Exception as exc:
            # WASI programs signal their exit code via a trap; a clean
            # exit(0) still raises in wasmtime-py, so we only treat this
            # as a real failure if stderr actually has content or the trap
            # was caused by a resource limit.
            message = str(exc)
            if FUEL_EXHAUSTED_MARKER in message:
                limit_hit = "fuel"
            elif MEMORY_LIMIT_MARKER in message:
                limit_hit = "memory"
        elapsed_ms = (time.perf_counter() - started) * 1000

        stdout = stdout_path.read_text(encoding="utf-8", errors="replace") if stdout_path.exists() else ""
        stderr = stderr_path.read_text(encoding="utf-8", errors="replace") if stderr_path.exists() else ""
        ok = limit_hit is None and not stderr.strip()
        fuel_consumed = limits["max_fuel"] - store.get_fuel()

        return ExecutionResult(
            stdout=stdout,
            stderr=stderr,
            elapsed_ms=elapsed_ms,
            ok=ok,
            limit_hit=limit_hit,
            fuel_consumed=fuel_consumed,
        )


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <plugin_dir>", file=sys.stderr)
        raise SystemExit(2)

    runner = PluginRunner()
    result = runner.run(Path(sys.argv[1]))
    print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    limit_note = f", limit_hit={result.limit_hit}" if result.limit_hit else ""
    print(f"[{result.elapsed_ms:.2f} ms, ok={result.ok}{limit_note}]", file=sys.stderr)
