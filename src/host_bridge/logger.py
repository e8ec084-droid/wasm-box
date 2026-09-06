"""
WASM Host Logging Bridge.

Provides Python-side logging functions that can be exposed to WASM guest
modules via the host bridge (Week 4+ feature). These functions receive
call arguments from WASM linear memory and bridge them to Python's logging.
"""

from __future__ import annotations

import logging
from typing import Callable

logger = logging.getLogger(__name__)


def create_log_function(
    level: int = logging.INFO,
) -> Callable[[int, int, int], int]:
    """Create a WASM host log function that bridges to Python logging.

    The returned function matches the WASM function signature:
        (i32 message_ptr, i32 length, i32 level) -> i32

    Args:
        level: Default log level to use when the guest doesn't specify one.
            The guest can override via the level argument.

    Returns:
        A callable suitable for registration with the WASM linker.
    """

    def host_log(message_ptr: int, length: int, level_code: int) -> int:
        """Bridge a WASM log call to Python's logging system.

        Args:
            message_ptr: Offset in WASM linear memory where the message starts.
            length: Length of the message in bytes.
            level_code: Logging level as an integer (0=DEBUG, 1=INFO, etc.).

        Returns:
            0 on success, -1 on failure.
        """
        try:
            # Map level code to Python logging level.
            log_level = _map_level_code(level_code, level)

            # In a full implementation, we would read from WASM memory here.
            # For now, log the pointer/length as a placeholder.
            logger.log(
                log_level,
                "WASM host_log called: ptr=%d, len=%d, level=%s",
                message_ptr,
                length,
                logging.getLevelName(log_level),
            )
            return 0
        except Exception:
            logger.exception("host_log failed")
            return -1

    return host_log


def _map_level_code(code: int, default: int) -> int:
    """Map a numeric level code from WASM to a Python logging level.

    Args:
        code: The level code from the WASM guest.
        default: The default level to use if the code is unrecognized.

    Returns:
        A Python logging level integer.
    """
    level_map = {
        0: logging.DEBUG,
        1: logging.INFO,
        2: logging.WARNING,
        3: logging.ERROR,
        4: logging.CRITICAL,
    }
    return level_map.get(code, default)
