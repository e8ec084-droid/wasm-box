# Wasmtime Sandbox Capability Research

## 1. Purpose

This document records the Wasmtime capabilities relevant to the WASMBox
security model.

The objective is to determine which Wasmtime features can be used to
implement the security requirements defined in the WASMBox threat model
and security requirements documents.

---

## 2. Execution Isolation

WASMBox executes untrusted plugin code as WebAssembly through the Wasmtime
runtime rather than directly executing untrusted Python source in the host
process.

The runtime therefore forms the primary execution boundary between the
untrusted plugin and the trusted Python host.

---

## 3. WASI Capabilities

WASI provides interfaces through which WebAssembly programs can interact
with operating-system resources.

Filesystem and network access should be explicitly controlled rather than
automatically granted to untrusted plugins.

The security model should follow a least-privilege and default-deny
approach.

### Filesystem

By default, WASI programs do not receive access to the host filesystem.

A specific host directory can be explicitly exposed when required.

For WASMBox, filesystem access should remain disabled unless a future
feature explicitly requires a narrowly scoped directory.

### Network

Network capabilities should not be inherited by untrusted plugins by
default.

Network access should only be enabled when explicitly required and
authorized.

---

## 4. Fuel-Based Execution Control

Wasmtime supports fuel consumption for WebAssembly execution.

Fuel provides a deterministic execution budget. WebAssembly instructions
consume fuel during execution, and execution traps when the available fuel
is exhausted.

This capability can be used to reduce the risk of infinitely executing
plugins and excessive computation.

WASMBox should evaluate fuel-based execution control as one mechanism for
enforcing computational limits.

---

## 5. Epoch-Based Interruption

Wasmtime also provides epoch-based interruption.

Epoch interruption allows long-running WebAssembly execution to be
interrupted when the configured epoch deadline is exceeded.

This provides another mechanism for controlling long-running execution.

WASMBox should evaluate epoch interruption when implementing execution
timeouts.

---

## 6. Memory and Resource Controls

WASMBox requires protection against plugins that attempt to consume
excessive resources.

Relevant Wasmtime configuration should be evaluated for:

- WebAssembly linear memory limits
- Maximum WASM stack size
- Execution/fuel limits
- Execution interruption

Resource limits should be configured according to the project's security
requirements and validated through tests.

---

## 7. Host Functions

WebAssembly modules can interact with the host through explicitly exposed
host functions.

Host functions create an additional security boundary because they can
provide access to trusted application functionality.

WASMBox should therefore:

- Expose only explicitly approved host functions.
- Validate host-function inputs.
- Avoid exposing unrestricted host APIs.
- Apply authorization checks where required.
- Prevent plugins from accessing arbitrary host functionality.

---

## 8. Recommended Initial Security Configuration

For untrusted WASM plugins, the initial security posture should be:

| Capability | Initial Policy |
|------------|----------------|
| Host filesystem | DENY |
| Host network | DENY |
| Arbitrary host functions | DENY |
| Approved host functions | Explicit allow-list |
| Unlimited execution | DENY |
| Unlimited memory | DENY |
| Host secrets | DENY |

---

## 9. Features Requiring Prototype Validation

The following capabilities should be validated experimentally before being
treated as implemented security controls:

1. Filesystem isolation.
2. Network isolation.
3. Fuel-based execution limits.
4. Epoch-based execution interruption.
5. Memory/resource limits.
6. Restricted host-function exposure.

---

## 10. Security Testing Plan

The prototype should eventually test:

### Filesystem

Attempt unauthorized filesystem access and verify that the operation is
blocked.

### Network

Attempt unauthorized network access and verify that the operation is
blocked.

### Execution

Run a deliberately long-running WASM program and verify that execution
can be interrupted.

### Resources

Run a resource-intensive WASM module and verify that configured limits are
enforced.

### Host Functions

Attempt to access functionality that has not been explicitly exposed and
verify that it is unavailable.

---

## 11. Conclusion

Wasmtime provides several mechanisms relevant to the WASMBox security
architecture, including controlled WASI capabilities, fuel-based execution
limits, epoch-based interruption, and explicit host-function interfaces.

These capabilities provide building blocks for the WASMBox sandbox, but
they must be configured and tested correctly. The Week 1 prototype will
validate the selected controls before they are treated as implemented
security guarantees.

---

## 12. Status

Status: Week 1 Day 3 research.

Next step: prototype the basic Wasmtime sandbox configuration.