"""Host logging bridge module."""

import sys
from datetime import datetime, timezone


def secure_log(sanitized_message: str, level: str = "INFO") -> None:
    """Writes sanitized messages from guest modules to the host standard stream.

    Args:
        sanitized_message: Pre-validated string from WASM memory.
        level: Severity category ('INFO', 'WARN', 'ERROR').
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    stream = sys.stderr if level == "ERROR" else sys.stdout
    stream.write(f"[{timestamp}] [WasmBox-Bridge] [{level}]: {sanitized_message}\n")
    stream.flush()