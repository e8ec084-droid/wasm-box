# WASMBox Threat Model Review

## Review Scope

This review checks the Week 1 security threat model against the
security requirements, Wasmtime research, and initial sandbox prototype.

## Threats Reviewed

### Untrusted Plugin Execution
Status: Addressed by sandboxed Wasmtime execution and fuel-based
execution control.

### Excessive CPU / Infinite Execution
Status: Partially addressed through Wasmtime fuel metering.

### Excessive Memory Usage
Status: Initial memory limits are configured in the prototype.
Further validation is required.

### Excessive Stack Usage
Status: Initial WASM stack limit is configured.

### Unauthorized Filesystem Access
Status: Not granted by the current prototype. Explicit capability
configuration will be required before filesystem access is allowed.

### Unauthorized Network Access
Status: Not granted by the current prototype. Network capability
must be explicitly controlled.

### Unsafe Host Capabilities
Status: No arbitrary host functions are exposed by the prototype.
Future host-function integration must use an explicit allowlist.

## Review Findings

The initial prototype provides a security baseline for untrusted WASM
execution, but it is not yet a complete sandbox.

The main remaining work is to:

1. Define explicit default-deny filesystem and network permissions.
2. Implement capability restrictions.
3. Add tests proving unauthorized access is blocked.
4. Define and document the approved host-function surface.
5. Validate resource limits through security tests.

## Week 1 Review Status

The threat model is consistent with the initial sandbox direction.

Final team approval and feedback should be incorporated after review
with the project team.