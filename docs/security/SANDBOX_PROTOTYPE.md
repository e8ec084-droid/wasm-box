# WASMBox Sandbox Prototype

## Purpose

This prototype demonstrates the initial Wasmtime security configuration
for WASMBox plugin execution.

## Implemented Controls

### 1. Wasmtime Execution

Plugin modules are compiled and instantiated through the Wasmtime runtime.

### 2. Fuel-Based Execution Control

Fuel consumption is enabled and each plugin store receives a finite
execution budget.

This provides protection against unbounded WebAssembly execution.

### 3. Native WASM Stack Limit

A maximum WASM stack size is configured to reduce the risk of excessive
stack consumption.

### 4. Linear Memory Limit

Each plugin store is configured with a maximum linear-memory budget.

### 5. Default-Deny WASI

The prototype does not automatically configure WASI filesystem or network
capabilities.

Filesystem and other operating-system capabilities must therefore be
explicitly configured before they can be made available to a plugin.

## Initial Configuration

| Control | Prototype Setting |
|---|---|
| Wasmtime runtime | Enabled |
| Fuel metering | Enabled |
| Initial fuel | 10,000 |
| WASM stack limit | 512 KiB |
| Linear memory limit | 10 MiB |
| Filesystem access | Not granted |
| Network access | Not granted |
| Arbitrary host functions | Not exposed |

## Validation

The prototype successfully executes a simple WASM function and reports
remaining execution fuel.

Further security tests will be added for:

- Unauthorized filesystem access
- Network access
- Fuel exhaustion
- Memory exhaustion
- Host-function restrictions

## Status

Week 1 Day 4 prototype.

This is an initial security prototype and not yet the final WASMBox
sandbox implementation.
---

## Week 2 Security Baseline

The Week 2 sandbox implementation establishes a default-deny security baseline for plugin execution.

### Capability Policy

Sandbox capabilities are denied by default and must be explicitly configured before they can be granted to a plugin.

| Capability | Baseline Policy |
|---|---|
| Host filesystem access | DENY |
| External network access | DENY |
| Arbitrary host functions | DENY |
| Cross-tenant resource access | DENY |
| Unrestricted execution | DENY |
| Approved capabilities | ALLOW only when explicitly configured |

### Resource Controls

The baseline sandbox configuration continues to enforce resource limits for untrusted plugin execution:

- Finite execution fuel is enabled.
- WASM stack usage is bounded.
- Linear memory usage is bounded.
- Execution must remain within the configured Wasmtime sandbox.

### Capability Enforcement

Filesystem and network capabilities are not exposed to plugins by default.

Unauthorized capability requests must be rejected rather than implicitly granted.

Only explicitly approved capabilities may be made available to a plugin.

### Security Validation

Sandbox capability enforcement is covered by security tests.

The validation includes checks that unauthorized filesystem access is blocked and that baseline capability restrictions are enforced.

### Security Baseline Status

The Week 2 baseline capability restrictions have been implemented and tested.

The sandbox follows a default-deny model in which privileged capabilities require explicit configuration.
