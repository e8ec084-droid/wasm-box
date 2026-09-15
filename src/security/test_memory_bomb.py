from sandbox import compile_module, create_sandbox_engine, create_sandbox_store
from wasmtime import Instance, WasmtimeError

MEMORY_BOMB_WASM = """
(module
  (memory 256 256)
)
"""


def test_memory_bomb_is_blocked() -> None:
    engine = create_sandbox_engine()
    store = create_sandbox_store(engine)

    try:
        module = compile_module(engine, MEMORY_BOMB_WASM)
        Instance(store, module, [])
    except WasmtimeError:
        return

    raise AssertionError("Memory-bomb module was not blocked")
