"""Outbound webhook trigger host bridge."""

import json
from urllib import error, request
from src.host_bridge.validator import HostFunctionValidator


class WebhookBridge:
    """Dispatches authorized HTTP webhook notifications on behalf of WASM plugins."""

    AUTHORIZED_ROLES = {"admin", "webhook_dispatch"}

    @classmethod
    def trigger_webhook(
        cls,
        target_url: str,
        event_type: str,
        data_json: str,
        caller_role: str,
        timeout_seconds: int = 5,
    ) -> int:
        """Validates, authorizes, and dispatches an HTTP POST webhook request.

        Args:
            target_url: Destination URL endpoint.
            event_type: Event category string.
            data_json: Stringified JSON payload.
            caller_role: RBAC caller context.
            timeout_seconds: Socket timeout boundary.

        Returns:
            HTTP response status code.

        Raises:
            PermissionError: If caller role is unauthorized.
            ValueError: If parameters or JSON structure are invalid.
        """
        clean_role = HostFunctionValidator.validate_string(caller_role, max_length=32, param_name="caller_role")
        if clean_role not in cls.AUTHORIZED_ROLES:
            raise PermissionError(f"Permission Denied: Role '{clean_role}' cannot dispatch external webhooks")

        clean_url = HostFunctionValidator.validate_url(target_url)
        clean_event = HostFunctionValidator.validate_string(event_type, max_length=64, param_name="event_type")
        parsed_payload = HostFunctionValidator.validate_json_payload(data_json, max_length=4096)

        envelope = {
            "source": "WasmBox-Plugin-Engine",
            "event": clean_event,
            "data": parsed_payload,
        }
        encoded_body = json.dumps(envelope).encode("utf-8")

        req = request.Request(
            url=clean_url,
            data=encoded_body,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "WasmBox-HostBridge/1.0",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=timeout_seconds) as response:
                return int(response.status)
        except error.HTTPError as http_err:
            return int(http_err.code)
        except (error.URLError, TimeoutError):
            return 504