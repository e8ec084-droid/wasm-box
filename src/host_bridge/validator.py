"""Input validation and type-checking layer for WasmBox host functions."""

from typing import Any, Union


class HostFunctionValidator:
    """Validates parameters passed from untrusted WASM guest memory to host."""

    @staticmethod
    def validate_string(value: Any, max_length: int = 256) -> str:
        """Asserts input is a valid string within safe length constraints."""
        if not isinstance(value, str):
            raise TypeError(f"Expected string type, got {type(value).__name__}")
        if len(value) > max_length:
            raise ValueError(f"String length exceeds maximum allowed limit of {max_length}")
        return value

    @staticmethod
    def validate_integer(value: Any, min_val: int = 0, max_val: int = 1000000) -> int:
        """Asserts input is an integer within safe numeric bounds."""
        if not isinstance(value, int) or isinstance(value, bool):
            raise TypeError(f"Expected integer type, got {type(value).__name__}")
        if not (min_val <= value <= max_val):
            raise ValueError(f"Integer value {value} out of safe bounds [{min_val}, {max_val}]")
        return value