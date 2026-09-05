from sandbox import (
    create_sandbox_engine,
    create_sandbox_store,
    get_sandbox_capabilities,
)
from wasmtime import Instance, Module

HELLO_WASM = """
(module
  (func (export "hello") (result i32)
    i32.const 42
  )
)
"""


def main() -> None:
    engine = create_sandbox_engine()
    store = create_sandbox_store(engine)

    module = Module(engine, HELLO_WASM)

    instance = Instance(store, module, [])
    hello = instance.exports(store)["hello"]

    result = hello(store)

    print(f"Normal execution result: {result}")
    print(f"Remaining fuel: {store.get_fuel()}")

    capabilities = get_sandbox_capabilities()

    print(f"Sandbox capabilities: {capabilities}")

    assert capabilities["filesystem"] is False
    assert capabilities["network"] is False

    print("Filesystem access: BLOCKED")
    print("Network access: BLOCKED")


if __name__ == "__main__":
    main()