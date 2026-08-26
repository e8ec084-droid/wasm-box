"""WASM Host API Bridge - Input Validation."""

def validate_memory_bounds(offset: int, length: int, memory_size: int) -> bool:
    """
    Validates that a requested memory read/write falls strictly within the WASM sandbox boundaries.

    Args:
        offset (int): The starting memory pointer offset from the WASM guest.
        length (int): The number of bytes the guest intends to read/write.
        memory_size (int): The total allocated size of the WASM linear memory.

    Returns:
        bool: True if the bounds are secure, False if an out-of-bounds access is attempted.
    """
    # Enforce strict type checking for the Python boundary
    if not isinstance(offset, int) or not isinstance(length, int) or not isinstance(memory_size, int):
        return False
    
    # Prevent negative memory pointers or negative lengths
    if offset < 0 or length < 0:
        return False
        
    # Prevent buffer overflow attacks
    if (offset + length) > memory_size:
        return False
        
    return True