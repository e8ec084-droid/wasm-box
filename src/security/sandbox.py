from wasmtime import Config, Engine, Module, Store

DEFAULT_FUEL = 10_000
DEFAULT_MEMORY_LIMIT = 10 * 1024 * 1024  # 10 MB


def create_sandbox_engine() -> Engine:
    """Create a Wasmtime engine with basic execution controls."""
    config = Config()

    # Enable deterministic execution metering.
    config.consume_fuel = True

    # Keep the WASM native stack bounded.
    config.max_wasm_stack = 512 * 1024

    return Engine(config)


def create_sandbox_store(engine: Engine) -> Store:
    """Create a store with resource limits for one plugin execution."""
    store = Store(engine)

    # Limit linear memory available to this store.
    store.set_limits(memory_size=DEFAULT_MEMORY_LIMIT)

    # Give the plugin a finite execution budget.
    store.set_fuel(DEFAULT_FUEL)

    return store


def compile_module(engine: Engine, wasm_source: str) -> Module:
    """Compile a WASM module using the sandbox engine."""
    return Module(engine, wasm_source)