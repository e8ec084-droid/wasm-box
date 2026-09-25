"""Boundary input validation and type sanitization layer."""

import json
from typing import Any, Dict
from urllib.parse import urlparse


class HostFunctionValidator:
    """Validates and sanitizes parameters passed across the WASM-to-host boundary."""

    @staticmethod
    def validate_string(value: Any, max_length: int = 512, param_name: str = "parameter") -> str:
        """Asserts input is a valid string within length bounds.

        Args:
            value: Guest-supplied input.
            max_length: Maximum permitted byte/character length.
            param_name: Parameter label for error diagnostics.

        Returns:
            The validated string.

        Raises:
            TypeError: If the input is not a string.
            ValueError: If the string exceeds max_length or contains null bytes.
        """
        if not isinstance(value, str):
            raise TypeError(f"Invalid type for {param_name}: expected str, got {type(value).__name__}")
        if "\x00" in value:
            raise ValueError(f"Null byte detected in string {param_name}")
        if len(value) > max_length:
            raise ValueError(f"{param_name} length ({len(value)}) exceeds maximum allowed ({max_length})")
        return value

    @staticmethod
    def validate_integer(
        value: Any,
        min_val: int = 0,
        max_val: int = 1_000_000,
        param_name: str = "integer_parameter",
    ) -> int:
        """Asserts input is an integer within safe numeric limits.

        Args:
            value: Guest-supplied input.
            min_val: Inclusive lower bound.
            max_val: Inclusive upper bound.
            param_name: Parameter label for error diagnostics.

        Returns:
            The validated integer.

        Raises:
            TypeError: If the input is not a strict integer.
            ValueError: If the value is outside [min_val, max_val].
        """
        if not isinstance(value, int) or isinstance(value, bool):
            raise TypeError(f"Invalid type for {param_name}: expected int, got {type(value).__name__}")
        if not (min_val <= value <= max_val):
            raise ValueError(f"{param_name} ({value}) out of bounds [{min_val}, {max_val}]")
        return value

    @staticmethod
    def validate_json_payload(raw_json: Any, max_length: int = 4096) -> Dict[str, Any]:
        """Parses and validates a JSON string.

        Args:
            raw_json: Stringified JSON payload.
            max_length: Upper limit for JSON payload size.

        Returns:
            Parsed JSON dictionary.

        Raises:
            TypeError: If input is not a string.
            ValueError: If input is malformed or exceeds max length.
        """
        validated_str = HostFunctionValidator.validate_string(raw_json, max_length, "json_payload")
        try:
            parsed = json.loads(validated_str)
            if not isinstance(parsed, dict):
                raise ValueError("JSON root must be an object/dictionary")
            return parsed
        except json.JSONDecodeError as err:
            raise ValueError(f"Malformed JSON payload: {err.msg}") from err

    @staticmethod
    def validate_url(url: Any) -> str:
        """Validates that a URL is well-formed and uses HTTP or HTTPS.

        Args:
            url: Destination URL string.

        Returns:
            The validated URL string.

        Raises:
            ValueError: If the URL scheme or network address is invalid.
        """
        validated_str = HostFunctionValidator.validate_string(url, max_length=2048, param_name="url")
        parsed = urlparse(validated_str)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError(f"Invalid URL structure or scheme: {validated_str}")
        return validated_str