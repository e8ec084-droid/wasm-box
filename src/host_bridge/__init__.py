"""
WASM Host API Bridge.

Provides host functions that can be registered with the WASM linker and
called from guest modules. This is a Week 4+ feature for allowing plugins
to call back into the host with controlled, vetted interfaces.

Submodules:
    registry: Core function registration logic for the WASM linker.
    logger: Python-side logging bridge functions for WASM guests.
    validator: Argument validation helpers for host function calls.
"""

from __future__ import annotations

from host_bridge import logger, registry, validator

__all__ = ["logger", "registry", "validator"]
