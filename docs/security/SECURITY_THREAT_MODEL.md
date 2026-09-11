# WASMBox Security Threat Model

## 1. Purpose

This document defines the security threat model for WASMBox's untrusted
plugin execution pipeline.

WASMBox allows users to submit custom Python plugin code. The plugin must
not be executed directly on the backend host. Instead, the intended
execution flow is:

User Python Source
        |
        v
     Compiler
        |
        v
      WASM
        |
        v
    Wasmtime
        |
        v
   Plugin Result

The purpose of the security boundary is to prevent untrusted plugin code
from gaining unauthorized access to the host system or consuming
uncontrolled resources.

---

## 2. System Under Protection

The primary system under protection is the WASMBox backend and its
execution environment.

Protected assets include:

- Host filesystem
- Application data
- Tenant data
- Secrets and environment information
- Network access
- Host-side APIs and functions
- CPU and memory resources
- WASM runtime stability
- Isolation between different customer plugins

---

## 3. Threat Actor

The primary threat actor is an untrusted or malicious customer plugin.

A plugin may be intentionally malicious, accidentally unsafe, or compromised
before being submitted to WASMBox.

The threat model therefore treats plugin code as untrusted input.

---

## 4. Trust Boundaries

The main trust boundary exists between:

1. Untrusted user-provided plugin source
2. The compiler/toolchain
3. The generated WASM module
4. The Wasmtime execution environment
5. The trusted Python host application

The untrusted plugin must not receive unrestricted access to the trusted
host environment.

The intended execution model is:

Untrusted Source
      |
      v
   Compiler
      |
      v
     WASM
      |
      v
   Wasmtime
      |
      v
 Controlled Execution

Direct execution of untrusted Python source by the backend is outside the
intended security model.

---

## 5. Security Objectives

WASMBox should provide the following security properties:

### 5.1 Isolation

Untrusted plugin execution should remain isolated from the host application
and other tenants.

### 5.2 Filesystem Protection

Plugins should not receive unrestricted access to the server filesystem.

### 5.3 Network Protection

Plugins should not receive unrestricted access to external network
resources.

### 5.4 Resource Protection

A plugin should not be able to consume uncontrolled amounts of memory or
execution resources.

### 5.5 Host API Protection

Plugins should not be able to invoke arbitrary privileged functions on the
Python host.

### 5.6 Execution Control

The system should be able to terminate plugin execution when execution
limits are exceeded.

### 5.7 Tenant Isolation

One customer's plugin must not be able to access another customer's data
or execution environment.

---

## 6. Identified Threats

| ID | Threat | Potential Impact | Security Goal |
|----|--------|------------------|---------------|
| T-01 | Unauthorized filesystem access | Reading or modifying host files | Filesystem isolation |
| T-02 | Unauthorized network access | External communication or data exfiltration | Network isolation |
| T-03 | Memory exhaustion | Host instability or denial of service | Memory/resource limits |
| T-04 | Infinite execution | CPU exhaustion / denial of service | Execution limits |
| T-05 | Host-function abuse | Unauthorized privileged operations | Host API restrictions |
| T-06 | Sandbox escape | Access to trusted host environment | Strong isolation |
| T-07 | Cross-tenant access | Exposure of another customer's data | Tenant isolation |
| T-08 | Information leakage | Exposure of secrets or sensitive data | Data protection |
| T-09 | Malicious or malformed plugin | Runtime instability or unexpected behavior | Validation and controlled execution |

---

## 7. Threat Scenarios

### T-01: Filesystem Access

A malicious plugin attempts to access files belonging to the backend host.

Example target:

`/etc/passwd`

Expected security behavior:

The sandbox should prevent unauthorized filesystem access.

---

### T-02: Network Access

A malicious plugin attempts to establish a connection to an external
network address.

Expected security behavior:

Network access should be denied unless explicitly permitted by the
security model.

---

### T-03: Memory Exhaustion

A malicious plugin attempts to consume excessive memory.

Expected security behavior:

The execution environment should enforce defined memory/resource limits.

---

### T-04: Infinite Execution

A plugin contains an infinite loop such as:

    while True:
        pass

Expected security behavior:

Execution should be terminated when the configured execution limit is
reached.

---

### T-05: Host Function Abuse

A plugin attempts to call a privileged host function outside its intended
authorization scope.

Expected security behavior:

Only explicitly approved host functions should be exposed to the plugin.

---

### T-06: Sandbox Escape

A malicious plugin attempts to escape the WASM execution environment and
interact directly with the host system.

Expected security behavior:

The plugin should remain inside the intended Wasmtime execution boundary.

---

### T-07: Cross-Tenant Access

A plugin belonging to one customer attempts to access another customer's
data.

Expected security behavior:

Tenant data must remain isolated.

---

## 8. Security Assumptions

The initial threat model assumes:

- Plugin source is untrusted.
- The Python host application is trusted.
- The compiler is part of the trusted execution pipeline.
- WASM modules are executed through the intended runtime rather than
  directly through Python execution.
- Host capabilities should be explicitly controlled.
- Security controls must be validated through testing rather than assumed
  to be effective.

---

## 9. Security Principles

WASMBox should follow these principles:

### Default Deny

Capabilities that are not explicitly required should not be granted.

### Least Privilege

A plugin should receive only the minimum capabilities required for its
intended operation.

### Isolation

Untrusted plugin execution should be isolated from trusted host resources.

### Explicit Capabilities

Access to privileged host functionality should be explicitly exposed and
controlled.

### Resource Limiting

Plugin execution should operate within defined resource boundaries.

### Defense in Depth

Security should not depend on a single control. Compilation, runtime
isolation, capability restrictions, resource limits, and testing should work
together.

---

## 10. Security Validation Plan

The identified threats will be validated during later project phases.

Planned validation includes:

- Attempting unauthorized filesystem access.
- Attempting unauthorized network access.
- Testing memory/resource limits.
- Testing execution time limits.
- Testing host-function authorization.
- Testing isolation after malicious plugin execution.
- Regression testing after security fixes.

---

## 11. Threat Model Status

Status: Initial threat model for Week 1.

This document will be refined as the WASMBox runtime, compiler pipeline,
sandbox configuration, and host-function interface are implemented.