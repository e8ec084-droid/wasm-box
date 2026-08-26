"""Whitelisted Host Function Registry (v1 API Contract)."""

from typing import Callable, Dict
from src.host_bridge.validator import HostFunctionValidator


class HostFunctionRegistry:
    """Manages secure bindings and whitelisted function routing for Wasmtime."""

    def __init__(self) -> None:
        self._registry: Dict[str, Callable[..., Any]] = {}
        self._register_v1_defaults()

    def _register_v1_defaults(self) -> None:
        """Registers approved v1 whitelisted functions with validation wrappers."""
        self._registry["host_log"] = self.whitelisted_log
        self._registry["host_get_metric"] = self.whitelisted_get_metric

    def whitelisted_log(self, message: str) -> None:
        """Whitelisted host logging function with strict string validation."""
        clean_message = HostFunctionValidator.validate_string(message, max_length=512)
        print(f"[WasmBox-Guest-Log]: {clean_message}")

    def whitelisted_get_metric(self, code: int) -> int:
        """Whitelisted metric getter with bounds checking."""
        valid_code = HostFunctionValidator.validate_integer(code, min_val=0, max_val=99)
        return valid_code * 42

    def get_function(self, name: str) -> Callable[..., Any]:
        """Retrieves a whitelisted function or denies execution if unauthorized."""
        if name not in self._registry:
            raise PermissionError(f"Access Denied: Function '{name}' is not whitelisted in v1 API.")
        return self._registry[name]