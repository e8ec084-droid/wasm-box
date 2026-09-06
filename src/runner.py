"""
WasmBox Execution Pipeline.

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


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class ExecutionResult:
    """Outcome of running a plugin inside the WASM sandbox."""

    stdout: str
    stderr: str
    elapsed_ms: float
    ok: bool
    # "fuel" or "memory" when a resource limit terminated the run (Week 3).
    limit_hit: str | None = None
    # Total fuel consumed this run (initial budget minus what remains).
    fuel_consumed: int | None = None


# ---------------------------------------------------------------------------
# Host function bridge — delegates to host_bridge module
# ---------------------------------------------------------------------------

_HAS_HOST_BRIDGE = False
try:
    from host_bridge import register_host_functions as _register_host_functions

    _HAS_HOST_BRIDGE = True
except ImportError:
    _register_host_functions = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# PluginRunner
# ---------------------------------------------------------------------------


class PluginRunner:
    """Wraps one loaded copy of the shared WASI Python runtime module.

    Module compilation (parsing/validating the .wasm bytecode) happens once
    in __init__. Each call to run() gets a brand-new Store + instance, so
    plugin executions never share interpreter state.

    Host functions can be registered at init time via the host_bridge module
    (Week 4+ feature). When host_bridge is not available, execution proceeds
    without any bridged host functions.
    """

    def __init__(self, runtime_path: Path = RUNTIME_PATH) -> None:
        config = Config()
        config.consume_fuel = True  # enables per-run fuel budgets (Week 3)
        self.engine = Engine(config)
        self.module = Module.from_file(self.engine, str(runtime_path))
        self.linker = Linker(self.engine)
        self.linker.define_wasi()

        # Register host bridge functions if the module is available.
        if _register_host_functions is not None:
            _register_host_functions(self.linker, Store(self.engine), self._default_log)
            # The Store used above is discarded; a fresh one will be created
            # per run. For now, host bridge registration happens on a transient
            # store. This is acceptable because function definitions live on
            # the Linker, not the Store.

    def _default_log(self, level: int, message: int, length: int) -> int:
        """Stub host log function — overridden when host_bridge is fully wired.

        Returns 0 to indicate success. Real implementations will decode the
        i32 message/length into a Python string and log it.
        """
        return 0

    def run(self, plugin_dir: Path, entrypoint: str = "main.py") -> ExecutionResult:
        """Execute a compiled plugin inside the WASM sandbox.

        Args:
            plugin_dir: Path to the compiled plugin directory.
            entrypoint: Name of the Python file to execute inside the sandbox.

        Returns:
            An ExecutionResult capturing stdout, stderr, timing, and any
            resource limit that was hit.
        """
        plugin_dir = Path(plugin_dir)
        limits = _load_resource_limits(plugin_dir)

        # Prepare I/O capture paths.
        stdout_path = plugin_dir / ".stdout"
        stderr_path = plugin_dir / ".stderr"

        # Build a fresh store with WASI config for this run.
        store = self._create_store_with_wasi(
            plugin_dir=plugin_dir,
            entrypoint=entrypoint,
            stdout_path=stdout_path,
            stderr_path=stderr_path,
        )

        # Apply resource limits before instantiation (Week 3).
        self._apply_resource_limits(store, limits)

        # Instantiate and run.
        instance = self.linker.instantiate(store, self.module)
        start_fn = instance.exports(store)["_start"]

        started_at = time.perf_counter()
        limit_hit = self._execute_with_limit_detection(store, start_fn)
        elapsed_ms = (time.perf_counter() - started_at) * 1000

        # Read captured output.
        stdout = _read_captured_output(stdout_path)
        stderr = _read_captured_output(stderr_path)

        ok = _is_execution_successful(limit_hit, stderr)
        fuel_consumed = limits["max_fuel"] - store.get_fuel()

        return ExecutionResult(
            stdout=stdout,
            stderr=stderr,
            elapsed_ms=elapsed_ms,
            ok=ok,
            limit_hit=limit_hit,
            fuel_consumed=fuel_consumed,
        )

    def _create_store_with_wasi(
        self,
        plugin_dir: Path,
        entrypoint: str,
        stdout_path: Path,
        stderr_path: Path,
    ) -> Store:
        """Create and configure a Store with WASI preopened directories and I/O files."""
        store = Store(self.engine)
        wasi = WasiConfig()
        wasi.argv = ["python", f"/plugin/{entrypoint}"]
        wasi.preopen_dir(str(plugin_dir), "/plugin")
        wasi.stdout_file = str(stdout_path)
        wasi.stderr_file = str(stderr_path)
        store.set_wasi(wasi)
        return store

    def _apply_resource_limits(self, store: Store, limits: dict[str, int]) -> None:
        """Set fuel budget and memory cap on the store before instantiation."""
        store.set_fuel(limits["max_fuel"])
        store.set_limits(memory_size=limits["max_memory_bytes"])

    def _execute_with_limit_detection(self, store: Store, start_fn) -> str | None:
        """Run the plugin entrypoint and detect if a resource limit was hit.

        WASI programs signal their exit code via a trap; a clean
        exit(0) still raises in wasmtime-py, so we only treat a trap as a
        resource-limit failure if the trap message matches a known marker.

        Returns:
            "fuel" or "memory" if a resource limit terminated the run, else None.
        """
        try:
            start_fn(store)
        except Exception as exc:
            message = str(exc)
            if FUEL_EXHAUSTED_MARKER in message:
                return "fuel"
            if MEMORY_LIMIT_MARKER in message:
                return "memory"
        return None


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def _load_resource_limits(plugin_dir: Path) -> dict[str, int]:
    """Read the manifest's `resource_limits` block, defaulting on any
    absence or malformation (e.g. pre-2.0 artifacts without the block).

    Args:
        plugin_dir: Path to the plugin directory containing manifest.json.

    Returns:
        A dict with the three resource limit keys. Defaults are used if the
        manifest is missing, unreadable, or lacks the resource_limits block.
    """
    manifest_path = Path(plugin_dir) / MANIFEST_FILENAME
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        return dict(manifest.get("resource_limits", DEFAULT_RESOURCE_LIMITS))
    except (OSError, ValueError):
        return dict(DEFAULT_RESOURCE_LIMITS)


def _read_captured_output(path: Path) -> str:
    """Read captured stdout/stderr from the sandbox, returning empty string if missing.

    Args:
        path: Path to the .stdout or .stderr capture file.

    Returns:
        The file contents, or an empty string if the file doesn't exist.
    """
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def _is_execution_successful(limit_hit: str | None, stderr: str) -> bool:
    """Determine whether a plugin execution should be considered successful.

    An execution is successful when:
    - No resource limit was hit, AND
    - stderr has no content (warnings/errors).

    Args:
        limit_hit: Which limit was hit, if any ("fuel" or "memory").
        stderr: Captured stderr output from the sandbox.

    Returns:
        True if the execution succeeded, False otherwise.
    """
    if limit_hit is not None:
        return False
    if stderr.strip():
        return False
    return True


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------


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
