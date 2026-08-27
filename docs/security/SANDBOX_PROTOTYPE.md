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