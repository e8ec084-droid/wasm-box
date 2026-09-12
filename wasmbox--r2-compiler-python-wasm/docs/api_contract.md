# WasmBox Host API Contract (v1)

## Core Objective
Define the secure boundary and data-passing conventions between the untrusted WebAssembly guest plugin and the Python host environment.

## Authorized Function: host_log
* **Purpose:** Enables WASM plugins to securely write logs to the host's standard output.
* **Input 1:** `log_level` (i32) - Security mapping: 0=INFO, 1=WARN, 2=ERROR.
* **Input 2:** `msg_ptr` (i32) - Sandbox memory offset pointer for the UTF-8 string.
* **Input 3:** `msg_len` (i32) - Total byte length of the string to prevent buffer overflows.
* **Output:** `status` (i32) - Returns 0 on successful write, -1 on validation failure.