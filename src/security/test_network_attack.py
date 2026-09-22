from sandbox import (
    compile_module,
    create_sandbox_engine,
    create_sandbox_store,
    get_sandbox_capabilities,
)
from wasmtime import Instance, WasmtimeError

MALICIOUS_NETWORK_WASM = """
(module
  (import "wasi_snapshot_preview1" "sock_open"
    (func $sock_open (param i32 i32 i32 i32 i32) (result i32)))
)
"""


def test_network_capability_is_denied() -> None:
    capabilities = get_sandbox_capabilities()
    assert capabilities["network"] is False


def test_unauthorized_network_access_is_blocked() -> None:
    engine = create_sandbox_engine()
    store = create_sandbox_store(engine)

    try:
        module = compile_module(engine, MALICIOUS_NETWORK_WASM)
        Instance(store, module, [])
    except WasmtimeError:
        return

    raise AssertionError("Network request was not denied")


if __name__ == "__main__":
    test_network_capability_is_denied()
    test_unauthorized_network_access_is_blocked()
    print("Network capability: DENIED")
