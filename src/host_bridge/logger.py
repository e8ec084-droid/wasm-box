"""WASM Host API Bridge - Logging Function."""
import logging
from .validator import validate_memory_bounds

# Configure basic host logging standard
logging.basicConfig(level=logging.INFO, format="%(levelname)s (WASM Guest): %(message)s")

def host_log(log_level: int, msg_ptr: int, msg_len: int, memory: bytearray) -> int:
    """
    Securely reads a UTF-8 string from the untrusted WASM guest memory 
    and logs it to the Python host's standard output.

    Args:
        log_level (int): Security mapping (0=INFO, 1=WARN, 2=ERROR).
        msg_ptr (int): The starting memory offset pointer for the string.
        msg_len (int): The total byte length of the string to read.
        memory (bytearray): The simulated linear memory of the WASM sandbox.

    Returns:
        int: 0 on successful log write, -1 on validation or decoding failure.
    """
    try:
        # 1. Enforce strict memory boundary validation via the bridge
        if not validate_memory_bounds(msg_ptr, msg_len, len(memory)):
            logging.error("Security Violation: WASM guest attempted out-of-bounds memory access.")
            return -1

        # 2. Extract and decode the string from guest memory
        raw_bytes = memory[msg_ptr : msg_ptr + msg_len]
        message = raw_bytes.decode('utf-8')

        # 3. Route to appropriate host log level
        if log_level == 0:
            logging.info(message)
        elif log_level == 1:
            logging.warning(message)
        elif log_level == 2:
            logging.error(message)
        else:
            logging.debug(message)
            
        return 0

    except Exception as e:
        logging.error(f"Host logging failed to execute: {e}")
        return -1