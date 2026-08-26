"""Pytest suite for WasmBox host function bridge validation and security."""

import pytest
from src.host_bridge.validator import HostFunctionValidator
from src.host_bridge.registry import HostFunctionRegistry


def test_string_validator_success():
    assert HostFunctionValidator.validate_string("hello plugin") == "hello plugin"


def test_string_validator_type_error():
    with pytest.raises(TypeError):
        HostFunctionValidator.validate_string(12345)


def test_integer_validator_bounds():
    assert HostFunctionValidator.validate_integer(500) == 500
    with pytest.raises(ValueError):
        HostFunctionValidator.validate_integer(2000000)


def test_registry_unauthorized_access():
    registry = HostFunctionRegistry()
    with pytest.raises(PermissionError):
        registry.get_function("malicious_system_call")