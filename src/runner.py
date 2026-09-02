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
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from wasmtime import Engine, Linker, Module, Store, WasiConfig

RUNTIME_PATH = Path(__file__).resolve().parent.parent / "runtime" / "python-3.12.0.wasm"


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    elapsed_ms: float
    ok: bool


class PluginRunner:
    """Wraps one loaded copy of the shared WASI Python runtime module.

    Module compilation (parsing/validating the .wasm bytecode) happens once
    in __init__. Each call to run() gets a brand-new Store + instance, so
    plugin executions never share interpreter state.
    """

    def __init__(self, runtime_path: Path = RUNTIME_PATH) -> None:
        self.engine = Engine()
        self.module = Module.from_file(self.engine, str(runtime_path))
        self.linker = Linker(self.engine)
        self.linker.define_wasi()

    def run(self, plugin_dir: Path, entrypoint: str = "main.py") -> ExecutionResult:
        plugin_dir = Path(plugin_dir)
        stdout_path = plugin_dir / ".stdout"
        stderr_path = plugin_dir / ".stderr"

        store = Store(self.engine)
        wasi = WasiConfig()
        wasi.argv = ["python", f"/plugin/{entrypoint}"]
        wasi.preopen_dir(str(plugin_dir), "/plugin")
        wasi.stdout_file = str(stdout_path)
        wasi.stderr_file = str(stderr_path)
        store.set_wasi(wasi)

        instance = self.linker.instantiate(store, self.module)
        start_fn = instance.exports(store)["_start"]

        started = time.perf_counter()
        ok = True
        try:
            start_fn(store)
        except Exception:
            # WASI programs signal their exit code via a trap; a clean
            # exit(0) still raises in wasmtime-py, so we only treat this
            # as a real failure if stderr actually has content.
            pass
        elapsed_ms = (time.perf_counter() - started) * 1000

        stdout = stdout_path.read_text(encoding="utf-8", errors="replace") if stdout_path.exists() else ""
        stderr = stderr_path.read_text(encoding="utf-8", errors="replace") if stderr_path.exists() else ""
        ok = not stderr.strip()

        return ExecutionResult(stdout=stdout, stderr=stderr, elapsed_ms=elapsed_ms, ok=ok)


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
    print(f"[{result.elapsed_ms:.2f} ms, ok={result.ok}]", file=sys.stderr)
