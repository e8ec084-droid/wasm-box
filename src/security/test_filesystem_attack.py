from sandbox import (
    compile_module,
    create_sandbox_engine,
    create_sandbox_store,
    get_sandbox_capabilities,
)
from wasmtime import Instance, WasmtimeError

MALICIOUS_WASM = """
(module
  (import "wasi_snapshot_preview1" "fd_read"
    (func $fd_read (param i32 i32 i32 i32) (result i32)))
)
"""


def main() -> None:
    capabilities = get_sandbox_capabilities()

    print(f"Sandbox capabilities: {capabilities}")

    assert capabilities["filesystem"] is False

    engine = create_sandbox_engine()
    store = create_sandbox_store(engine)

    try:
        module = compile_module(engine, MALICIOUS_WASM)
        Instance(store, module, [])
        print("ERROR: filesystem-capable module was instantiated")
        raise AssertionError("Filesystem capability was not blocked")
    except WasmtimeError as exc:
        print("Filesystem access attempt: BLOCKED")
        print(f"Blocked as expected: {type(exc).__name__}")


if __name__ == "__main__":
    main()

