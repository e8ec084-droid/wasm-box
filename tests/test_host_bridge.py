"""
Tests for the host_bridge module (Week 4+ feature).

Covers:
  - Function registry registration
  - Logger bridge creation and level mapping
  - Argument validation for host function calls
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from host_bridge import logger, registry, validator  # noqa: E402
from host_bridge.validator import HostFunctionValidationError  # noqa: E402


# ---------------------------------------------------------------- logger ----


class TestCreateLogFunction:
    """Tests for logger.create_log_function()."""

    def test_returns_callable(self):
        func = logger.create_log_function()
        assert callable(func)

    def test_accepts_three_int_args(self):
        func = logger.create_log_function()
        # Should not raise — returns int.
        result = func(0, 0, 1)
        assert isinstance(result, int)

    def test_returns_zero_on_success(self):
        func = logger.create_log_function()
        result = func(1, 100, 1)
        assert result == 0

    def test_level_mapping_debug(self):
        func = logger.create_log_function()
        # Level code 0 = DEBUG.
        result = func(0, 0, 0)
        assert result == 0

    def test_level_mapping_critical(self):
        func = logger.create_log_function()
        # Level code 4 = CRITICAL.
        result = func(4, 0, 1)
        assert result == 0

    def test_default_level_used_for_unknown_code(self):
        func = logger.create_log_function(level=20)  # INFO
        # An unknown level code should fall back to default.
        result = func(99, 0, 99)
        assert result == 0


class TestLevelMapping:
    """Tests for logger._map_level_code()."""

    def test_known_levels(self):
        assert logger._map_level_code(0, 30) == 10  # DEBUG
        assert logger._map_level_code(1, 30) == 20  # INFO
        assert logger._map_level_code(2, 30) == 30  # WARNING
        assert logger._map_level_code(3, 30) == 40  # ERROR
        assert logger._map_level_code(4, 30) == 50  # CRITICAL

    def test_unknown_level_uses_default(self):
        assert logger._map_level_code(99, 25) == 25


# ------------------------------------------------------------- validator ----


class TestValidateMemoryAccess:
    """Tests for validator.validate_memory_access()."""

    def test_valid_access_succeeds(self):
        validator.validate_memory_access(100, 50)

    def test_negative_pointer_rejected(self):
        with pytest.raises(HostFunctionValidationError, match="negative"):
            validator.validate_memory_access(-1, 10)

    def test_negative_length_rejected(self):
        with pytest.raises(HostFunctionValidationError, match="negative"):
            validator.validate_memory_access(100, -1)

    def test_length_exceeding_max_rejected(self):
        with pytest.raises(HostFunctionValidationError, match="exceeds maximum"):
            validator.validate_memory_access(0, validator.MAX_MESSAGE_LENGTH + 1)

    def test_access_exceeding_memory_rejected(self):
        with pytest.raises(HostFunctionValidationError, match="exceeds WASM memory"):
            validator.validate_memory_access(100, 50, max_memory=120)

    def test_zero_length_allowed(self):
        # Zero-length reads should be fine.
        validator.validate_memory_access(0, 0)

    def test_pointer_at_boundary_allowed(self):
        # Pointer at max should be fine for zero-length access.
        validator.validate_memory_access(validator.MAX_POINTER, 0)


class TestValidateLogArguments:
    """Tests for validator.validate_log_arguments()."""

    def test_valid_args_succeed(self):
        validator.validate_log_arguments(level=1, ptr=100, length=50)

    def test_negative_level_rejected(self):
        with pytest.raises(HostFunctionValidationError, match="non-negative"):
            validator.validate_log_arguments(level=-1, ptr=0, length=0)

    def test_non_int_level_rejected(self):
        with pytest.raises(HostFunctionValidationError, match="non-negative"):
            validator.validate_log_arguments(level="info", ptr=0, length=0)

    def test_invalid_memory_rejected(self):
        with pytest.raises(HostFunctionValidationError):
            validator.validate_log_arguments(level=1, ptr=-1, length=10)


class TestCreateValidatedHostFunction:
    """Tests for validator.create_validated_host_function()."""

    def test_valid_call_delegates(self):
        def my_func(x: int) -> int:
            return x * 2

        def validator_func(x: int) -> None:
            if x < 0:
                raise HostFunctionValidationError("x must be non-negative")

        wrapped = validator.create_validated_host_function(my_func, validator_func)
        assert wrapped(5) == 10

    def test_invalid_call_returns_minus_one(self):
        def my_func(x: int) -> int:
            return x * 2

        def validator_func(x: int) -> None:
            if x < 0:
                raise HostFunctionValidationError("x must be non-negative")

        wrapped = validator.create_validated_host_function(my_func, validator_func)
        assert wrapped(-1) == -1


# ----------------------------------------------------------- registry ----


class TestRegisterHostFunctions:
    """Tests for registry.register_host_functions()."""

    def test_registers_host_log(self, monkeypatch):
        """Test that register_host_functions calls linker.define_func."""
        from wasmtime import Linker, Store, Engine

        engine = Engine()
        linker = Linker(engine)
        store = Store(engine)

        # Track whether define_func was called.
        called = {}

        def mock_define_func(*args, **kwargs):
            called["args"] = args
            called["kwargs"] = kwargs

        monkeypatch.setattr(linker, "define_func", mock_define_func)
        monkeypatch.setattr(registry, "create_log_function", lambda: lambda a, b, c: 0)
        monkeypatch.setattr(registry, "create_validated_host_function", lambda f, v: f)
        monkeypatch.setattr(registry, "validate_log_arguments", lambda *a: None)

        registry.register_host_functions(linker, store)

        assert "args" in called
        # Should be: ("env", "host_log", signature, func)
        assert called["args"][0] == "env"
        assert called["args"][1] == "host_log"

    def test_uses_default_logger_when_none_provided(self, monkeypatch):
        """Test that a default log function is created when log_func is None."""
        from wasmtime import Linker, Store, Engine

        engine = Engine()
        linker = Linker(engine)
        store = Store(engine)

        call_args = {}

        def mock_define_func(module, name, sig, func):
            call_args["func"] = func
            call_args["module"] = module
            call_args["name"] = name

        monkeypatch.setattr(linker, "define_func", mock_define_func)
        monkeypatch.setattr(registry, "create_log_function", lambda: lambda a, b, c: 0)
        monkeypatch.setattr(registry, "create_validated_host_function", lambda f, v: f)
        monkeypatch.setattr(registry, "validate_log_arguments", lambda *a: None)

        registry.register_host_functions(linker, store)

        assert call_args["module"] == "env"
        assert call_args["name"] == "host_log"
        # The func should be the result of create_log_function.
        assert callable(call_args["func"])

    def test_custom_log_func_used(self, monkeypatch):
        """Test that a custom log function is used when provided."""
        from wasmtime import Linker, Store, Engine

        engine = Engine()
        linker = Linker(engine)
        store = Store(engine)

        custom_func = lambda a, b, c: 42
        call_args = {}

        def mock_define_func(module, name, sig, func):
            call_args["func"] = func
            call_args["module"] = module
            call_args["name"] = name

        monkeypatch.setattr(linker, "define_func", mock_define_func)
        monkeypatch.setattr(registry, "create_validated_host_function", lambda f, v: f)
        monkeypatch.setattr(registry, "validate_log_arguments", lambda *a: None)

        registry.register_host_functions(linker, store, log_func=custom_func)

        assert call_args["func"] is custom_func
