"""Central Whitelisted Host Function Registry."""

from typing import Any, Callable, Dict
from src.host_bridge.database import DatabaseBridge
from src.host_bridge.logger import secure_log
from src.host_bridge.validator import HostFunctionValidator
from src.host_bridge.webhook import WebhookBridge


class HostFunctionRegistry:
    """Manages whitelisted host functions, input boundary checks, and runtime bindings."""

    def __init__(self, db_bridge: DatabaseBridge | None = None) -> None:
        """Initializes the registry with supported services."""
        self._db_bridge = db_bridge or DatabaseBridge()
        self._registry: Dict[str, Callable[..., Any]] = {}
        self._register_whitelist()

    def _register_whitelist(self) -> None:
        """Binds verified host call endpoints."""
        self._registry["host_log"] = self.bridge_log
        self._registry["host_get_metric"] = self.bridge_get_metric
        self._registry["host_db_write"] = self.bridge_db_write
        self._registry["host_trigger_webhook"] = self.bridge_trigger_webhook

    def bridge_log(self, message: Any) -> None:
        """Logging endpoint with string boundary checking."""
        clean_msg = HostFunctionValidator.validate_string(message, max_length=512, param_name="message")
        secure_log(clean_msg)

    def bridge_get_metric(self, metric_code: Any) -> int:
        """System metric query endpoint."""
        valid_code = HostFunctionValidator.validate_integer(
            metric_code, min_val=0, max_val=99, param_name="metric_code"
        )
        return valid_code * 42

    def bridge_db_write(self, table: Any, row_id: Any, payload: Any, caller_role: Any) -> int:
        """Authorized database write endpoint."""
        return self._db_bridge.write_row(table, row_id, payload, caller_role)

    def bridge_trigger_webhook(self, url: Any, event_type: Any, data_json: Any, caller_role: Any) -> int:
        """Authorized webhook dispatch endpoint."""
        return WebhookBridge.trigger_webhook(url, event_type, data_json, caller_role)

    def get_function(self, func_name: str) -> Callable[..., Any]:
        """Resolves an approved function from the whitelist.

        Args:
            func_name: Requested host function identifier.

        Returns:
            The callable wrapper.

        Raises:
            PermissionError: If the function is not whitelisted.
        """
        if func_name not in self._registry:
            raise PermissionError(f"Access Denied: Function '{func_name}' is not in approved v1 API contract")
        return self._registry[func_name]