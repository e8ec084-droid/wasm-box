from sandbox import compile_module, create_sandbox_engine, create_sandbox_store
from wasmtime import Instance, Trap

FUEL_BOMB_WASM = """
(module
  (func (export "run")
    (loop
      br 0
    )
  )
)
"""


def test_fuel_limit_blocks_unbounded_execution() -> None:
    engine = create_sandbox_engine()
    store = create_sandbox_store(engine)
    module = compile_module(engine, FUEL_BOMB_WASM)
    instance = Instance(store, module, [])

    try:
        instance.exports(store)["run"](store)
    except Trap:
        return

    raise AssertionError("Unbounded execution was not blocked")

