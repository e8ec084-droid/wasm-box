"""
WASM Host API Bridge — Function Registry.

Provides utilities for registering authorized host functions into the WASM
linker so that guest modules can call back into the Python host.

This is a Week 4+ feature. Until then, the runner will not register any
host functions and plugins run with pure sandbox isolation.
"""

from __future__ import annotations

from typing import Callable

from wasmtime import FuncType, Linker, Store, ValType

from host_bridge.logger import create_log_function
from host_bridge.validator import (
    HostFunctionValidationError,
    create_validated_host_function,
    validate_log_arguments,
)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

# WASM signature for host_log: (i32 level, i32 ptr, i32 len) -> i32
HOST_LOG_SIGNATURE = FuncType(
    [ValType.i32(), ValType.i32(), ValType.i32()],
    [ValType.i32()],
)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def register_host_functions(
    linker: Linker,
    store: Store,
    log_func: Callable[[int, int, int], int] | None = None,
) -> None:
    """Register authorized host functions into the WASM linker.

    Currently registers only `host_log`, which allows guest modules to emit
    log messages that are bridged to Python's logging system.

    Args:
        linker: The Wasmtime linker instance to register functions on.
        store: The Wasmtime store (used for context if needed).
        log_func: Optional custom log function. When None, a default logger
            bridge is created via `create_log_function()`.

    Raises:
        HostFunctionValidationError: If the provided log_func doesn't match
            the expected signature.
    """
    if log_func is None:
        log_func = create_log_function()

    # Validate the function signature matches what we expect.
    _validate_log_function_signature(log_func)

    # Create a validated wrapper that checks arguments before delegating.
    validated_log = create_validated_host_function(log_func, validate_log_arguments)

    # Bind the Python function to the "env" module in the WASM guest.
    linker.define_func(
        "env",
        "host_log",
        HOST_LOG_SIGNATURE,
        validated_log,
    )


def _validate_log_function_signature(func: Callable) -> None:
    """Ensure a log function accepts (int, int, int) -> int.

    This is a lightweight structural check. In production we'd use
    typing.get_type_hints or inspect.signature, but for WASM host
    functions the convention is clear enough to document here.

    Args:
        func: The candidate log function.

    Raises:
        HostFunctionValidationError: If the function doesn't match
            the expected (i32, i32, i32) -> i32 signature.
    """
    try:
        # Quick smoke test with dummy values.
        result = func(0, 0, 1)
        if not isinstance(result, int):
            raise HostFunctionValidationError(
                f"host_log must return int, got {type(result).__name__}"
            )
    except TypeError as exc:
        raise HostFunctionValidationError(
            f"host_log must accept (int, int, int), got {exc}"
        ) from exc
