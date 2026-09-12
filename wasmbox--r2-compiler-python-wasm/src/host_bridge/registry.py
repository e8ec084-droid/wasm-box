"""WASM Host API Bridge - Function Registry."""
from typing import Callable
from wasmtime import Linker, Store, FuncType, ValType

def register_host_functions(linker: Linker, store: Store, log_func: Callable) -> None:
    """
    Registers authorized host functions into the WASM linker.

    Args:
        linker (Linker): The Wasmtime linker instance.
        store (Store): The Wasmtime store managing WASM memory and execution.
        log_func (Callable): The Python host logging function to bridge.
    """
    # Define the WebAssembly function signature: (i32, i32, i32) -> i32
    # i32 represents standard integer types in WASM boundary
    log_signature = FuncType(
        [ValType.i32(), ValType.i32(), ValType.i32()],
        [ValType.i32()]
    )

    # Bind the Python function to the "env" module in the WASM guest
    linker.define_func(
        "env",
        "host_log",
        log_signature,
        log_func
    )