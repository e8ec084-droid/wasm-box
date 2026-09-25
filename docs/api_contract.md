# WasmBox Host Functions & API Bridge Specification (v1.0 - Production)

This document formalizes the API contract between the WebAssembly runtime guest modules and the Python host application.

## 1. Architectural Overview
Untrusted WebAssembly guest plugins execute inside isolated sandbox contexts. Guest modules cannot access the underlying host filesystem, process memory, or network sockets directly. Any external interaction must occur through explicit host function imports exposed via the `HostFunctionRegistry` and validated at the boundary.

---

## 2. API Contract & Function Specifications

### 2.1 Logging Service
* **Import Module:** `env`
* **Import Name:** `host_log`
* **Signature:** `(param i32 i32) -> ()` (pointer, length) / Python Host Bridge: `(message: str) -> None`
* **Pre-conditions:** String payload must be UTF-8 and $\le 512$ bytes.
* **Failure Modes:** Malformed string raises `TypeError`; length violation raises `ValueError`.

### 2.2 System Metrics Query
* **Import Module:** `env`
* **Import Name:** `host_get_metric`
* **Signature:** `(param i32) -> (result i32)` / Python Host Bridge: `(metric_code: int) -> int`
* **Pre-conditions:** `metric_code` must be an integer within $[0, 99]$.
* **Failure Modes:** Type mismatch raises `TypeError`; out-of-range value raises `ValueError`.

### 2.3 Authorized Database Write (RBAC Protected)
* **Import Module:** `env`
* **Import Name:** `host_db_write`
* **Signature:** `(table: str, row_id: int, payload: str, caller_role: str) -> int`
* **Pre-conditions:**
  * `caller_role` must possess `WRITE` permission for the target table.
  * `table` must exist within the approved table whitelist (`logs`, `analytics`, `plugin_cache`).
  * `row_id` must be positive.
* **Failure Modes:** Unauthorized access raises `PermissionError`; invalid table raises `ValueError`.

### 2.4 Webhook Trigger
* **Import Module:** `env`
* **Import Name:** `host_trigger_webhook`
* **Signature:** `(target_url: str, event_type: str, data_json: str, caller_role: str) -> int`
* **Pre-conditions:**
  * `caller_role` must possess `ADMIN` or `WEBHOOK_DISPATCH` role.
  * `target_url` must use HTTP/HTTPS and be bounded to 2048 characters.
  * `data_json` must be valid JSON $\le 4096$ characters.
* **Failure Modes:** HTTP/network failure returns non-zero error code; unauthorized caller raises `PermissionError`.