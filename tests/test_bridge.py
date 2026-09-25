"""Comprehensive pytest test suite for WasmBox Role 4 Host Bridge."""

from unittest.mock import MagicMock, patch
import pytest

from src.host_bridge.database import DatabaseBridge
from src.host_bridge.registry import HostFunctionRegistry
from src.host_bridge.validator import HostFunctionValidator
from src.host_bridge.webhook import WebhookBridge


# --- Week 1 & 2: Validator & Registry Tests ---


def test_validator_string_success():
    """Validates legitimate string passing."""
    assert HostFunctionValidator.validate_string("valid payload") == "valid payload"


def test_validator_string_rejection():
    """Validates non-string and oversized string handling."""
    with pytest.raises(TypeError):
        HostFunctionValidator.validate_string(12345)
    with pytest.raises(ValueError, match="exceeds maximum allowed"):
        HostFunctionValidator.validate_string("A" * 600, max_length=512)
    with pytest.raises(ValueError, match="Null byte detected"):
        HostFunctionValidator.validate_string("injected\x00data")


def test_validator_integer_bounds():
    """Validates integer bounds checking."""
    assert HostFunctionValidator.validate_integer(42, min_val=0, max_val=100) == 42
    with pytest.raises(TypeError):
        HostFunctionValidator.validate_integer("42")
    with pytest.raises(ValueError):
        HostFunctionValidator.validate_integer(150, min_val=0, max_val=100)


def test_registry_access_control():
    """Tests that unauthorized function requests are rejected."""
    registry = HostFunctionRegistry()
    assert callable(registry.get_function("host_log"))
    with pytest.raises(PermissionError, match="Access Denied"):
        registry.get_function("system_exec")


# --- Week 3: Database & RBAC Tests ---


def test_database_rbac_authorized_write():
    """Verifies write operations for authorized roles."""
    db = DatabaseBridge()
    result = db.write_row("logs", 1, '{"status": "ok"}', "admin")
    assert result == 0
    db.close()


def test_database_rbac_unauthorized_write():
    """Verifies that unauthorized plugin roles are rejected."""
    db = DatabaseBridge()
    with pytest.raises(PermissionError, match="RBAC Violation"):
        db.write_row("logs", 2, '{"malicious": true}', "untrusted_plugin")
    db.close()


def test_database_invalid_table_rejection():
    """Verifies rejection of non-whitelisted tables."""
    db = DatabaseBridge()
    with pytest.raises(ValueError, match="not in approved storage whitelist"):
        db.write_row("passwords", 1, "test", "admin")
    db.close()


# --- Week 4: Webhook & Dispatch Tests ---


def test_webhook_unauthorized_role():
    """Verifies that non-permitted roles cannot dispatch webhooks."""
    with pytest.raises(PermissionError, match="cannot dispatch external webhooks"):
        WebhookBridge.trigger_webhook(
            "https://api.example.com/callback",
            "plugin_alert",
            '{"code": 1}',
            "untrusted_plugin",
        )


@patch("urllib.request.urlopen")
def test_webhook_successful_dispatch(mock_urlopen):
    """Verifies outbound HTTP request behavior with mock server."""
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_urlopen.return_value.__enter__.return_value = mock_resp

    status = WebhookBridge.trigger_webhook(
        "https://api.example.com/callback",
        "plugin_alert",
        '{"status": "completed"}',
        "admin",
    )
    assert status == 200