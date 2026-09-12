"""
WASM Host Function Argument Validator.

Provides validation helpers for host functions that are bridged into WASM
guest modules. Ensures that arguments received from WASM memory are sensible
before Python code acts on them.
"""

from __future__ import annotations

from typing import Callable

# Maximum reasonable message length from a WASM guest (1 MB).
MAX_MESSAGE_LENGTH = 1024 * 1024

# Valid range for pointer offsets into WASM linear memory.
MIN_POINTER = 0
MAX_POINTER = 2**31 - 1  # i32 max, reasonable upper bound


class HostFunctionValidationError(ValueError):
    """Raised when a host function receives invalid arguments from WASM."""


def validate_memory_access(
    ptr: int,
    length: int,
    max_memory: int | None = None,
) -> None:
    """Validate that a memory access (ptr, length) is within safe bounds.

    Args:
        ptr: Starting offset in WASM linear memory.
        length: Number of bytes to read.
        max_memory: Optional upper bound on WASM memory size. If None,
            only pointer non-negativity and length limits are checked.

    Raises:
        HostFunctionValidationError: If the access is out of bounds,
            negative, or would read an unreasonable amount of data.
    """
    if ptr < MIN_POINTER:
        raise HostFunctionValidationError(
            f"Memory pointer {ptr} is negative"
        )

    if length < 0:
        raise HostFunctionValidationError(
            f"Memory length {length} is negative"
        )

    if length > MAX_MESSAGE_LENGTH:
        raise HostFunctionValidationError(
            f"Memory length {length} exceeds maximum allowed {MAX_MESSAGE_LENGTH}"
        )

    if max_memory is not None and ptr + length > max_memory:
        raise HostFunctionValidationError(
            f"Memory access [{ptr}:{ptr + length}] exceeds WASM memory size {max_memory}"
        )


def validate_log_arguments(
    level: int,
    ptr: int,
    length: int,
) -> None:
    """Validate arguments for a host_log function call.

    Args:
        level: Log level code from WASM guest.
        ptr: Message pointer in WASM linear memory.
        length: Message length in bytes.

    Raises:
        HostFunctionValidationError: If any argument is invalid.
    """
    if not isinstance(level, int) or level < 0:
        raise HostFunctionValidationError(
            f"Log level must be a non-negative integer, got {level!r}"
        )

    validate_memory_access(ptr, length)


def create_validated_host_function(
    func: Callable,
    validator: Callable[..., None],
) -> Callable:
    """Wrap a host function with argument validation.

    The validator is called before the underlying function. If validation
    fails, the wrapper returns -1 (WASM error convention) instead of calling
    the underlying function.

    Args:
        func: The underlying host function to wrap.
        validator: A callable that validates arguments and raises
            HostFunctionValidationError on invalid input.

    Returns:
        A wrapped function that validates before delegating.
    """

    def validated_wrapper(*args, **kwargs):
        try:
            validator(*args, **kwargs)
        except HostFunctionValidationError:
            return -1
        return func(*args, **kwargs)

    return validated_wrapper
