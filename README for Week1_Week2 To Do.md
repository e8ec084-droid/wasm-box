# WasmBox — Week 1 → Week 2

## Project Overview

WasmBox is a secure multi-tenant plugin sandbox using WebAssembly (WASM) and
Wasmtime. This README covers the first two milestones from the project brief:

- Week 1 — WASM Foundation
- Week 2 — Plugin Compilation and Execution Pipeline

The brief specifies Week 1 as Wasmtime-Python plus a benign precompiled WASM
module and React/Monaco scaffolding. Week 2 adds the plugin compiler, backend
execution pipeline, Run button, and stdout output.

---

# Week 1 — WASM Foundation

## Objective

Prove that the Python host application can load and execute a precompiled
benign WASM module using Wasmtime-Python.

### Week 1 architecture

```text
Python Host
    |
    | load
    v
hello.wasm
    |
    | execute
    v
Wasmtime Runtime
    |
    v
Result: 42
```

### Main components

```text
backend/
├── app/
│   ├── main.py
│   └── sandbox.py
└── wasm/
    └── hello.wat

frontend/
├── src/
│   ├── App.jsx
│   ├── api.js
│   ├── main.jsx
│   └── styles.css
└── package.json
```

### Wasmtime host example

```python
import wasmtime

engine = wasmtime.Engine()
module = wasmtime.Module(engine, wasm_bytes)
store = wasmtime.Store(engine)
```

The benign WASM module demonstrates the basic execution path:

```text
Python Host
     ↓
Precompiled WASM
     ↓
Wasmtime
     ↓
Execution Result
```

### Developer UI

Week 1 also introduces:

- React frontend
- Microsoft Monaco Editor
- Basic plugin-development interface

Example source:

```python
print("Hello WasmBox")
print(40 + 2)
```

### Week 1 success criteria

```text
Wasmtime runtime      WORKING
Precompiled WASM      LOADED
WASM execution        SUCCESSFUL
Python host            WORKING
React UI                SCAFFOLDED
Monaco Editor           INTEGRATED
```

---

# Week 2 — Plugin Compilation and Execution Pipeline

## Objective

Week 2 moves from executing a fixed WASM module to accepting plugin source
from the developer interface and sending it through a compilation/execution
pipeline.

### Week 2 architecture

```text
React + Monaco
      |
      | Python source
      v
FastAPI Backend
      |
      v
Plugin Compiler
      |
      | .wasm
      v
Wasmtime Sandbox
      |
      | stdout / stderr
      v
React Console
```

## 1. Developer writes plugin code

Example:

```python
print("Hello from WasmBox")
print(40 + 2)
```

The frontend sends the source to the backend rather than executing it locally.

## 2. FastAPI receives the plugin

Endpoint:

```text
POST /api/run
```

Example request:

```json
{
  "tenant_id": "tenant-demo",
  "source": "print(\"Hello WasmBox\")"
}
```

## 3. Compiler

The backend validates and compiles the supported plugin source into WASM.

Conceptually:

```text
Python Source
      ↓
Parse / Validate
      ↓
Python → WASM
      ↓
WASM Module
```

The important security boundary is:

```text
DO NOT:
    exec(customer_code)

INSTEAD:
    customer_code
          ↓
       compiler
          ↓
         WASM
          ↓
       Wasmtime
```

## 4. Wasmtime execution

The generated WASM module is instantiated and executed by Wasmtime.

The backend collects:

```text
stdout
stderr
execution result
```

## 5. Result returned to React

Example:

```text
Execution Result

Hello from WasmBox
42
```

---

# Week 2 API

## Run Plugin

```text
POST /api/run
```

Example request:

```json
{
  "tenant_id": "tenant-demo",
  "source": "print(\"Hello WasmBox\")"
}
```

Example response:

```json
{
  "ok": true,
  "tenant_id": "tenant-demo",
  "stdout": "Hello WasmBox",
  "stderr": ""
}
```

---

# Week 2 execution flow

```text
Developer
    |
    v
Monaco Editor
    |
    | HTTP / JSON
    v
FastAPI
    |
    | validate
    v
Compiler
    |
    | generate WASM
    v
WASM Module
    |
    | execute
    v
Wasmtime
    |
    | stdout / stderr
    v
FastAPI
    |
    v
React Console
```

---

# Week 1 vs Week 2

| Feature | Week 1 | Week 2 |
|---|---|---|
| Wasmtime runtime | Yes | Yes |
| Precompiled WASM | Yes | Yes |
| Python host | Yes | Yes |
| React frontend | Yes | Yes |
| Monaco Editor | Scaffold | Plugin editor |
| User plugin source | Not yet | Yes |
| Compiler | Not yet | Yes |
| WASM generation | Precompiled | Pipeline |
| `/api/run` | Not yet | Yes |
| stdout result | Basic | Plugin output |
| End-to-end pipeline | No | Yes |

---

# Week 2 success criteria

By the end of Week 2:

```text
React
  ↓
Monaco Editor
  ↓
Python Plugin Source
  ↓
FastAPI
  ↓
Compiler
  ↓
WASM
  ↓
Wasmtime
  ↓
stdout
  ↓
React Console
```

Example:

```python
print("Hello WasmBox")
print(40 + 2)
```

Result:

```text
Hello WasmBox
42
```

---

# Security Boundary

Untrusted plugin code should not be executed directly with:

```python
exec(source)
```

The intended execution model is:

```text
Untrusted Source
       ↓
Compiler
       ↓
WASM
       ↓
Wasmtime
```

The later project milestones build on this foundation by adding the filesystem
and network security audit, resource limits, metrics, and whitelisted host
functions.

---

# Week 1 → Week 2 progression

## Week 1

**Goal: prove WASM execution**

```text
Python
  ↓
Precompiled WASM
  ↓
Wasmtime
  ↓
Result
```

## Week 2

**Goal: build the plugin execution pipeline**

```text
User Python
  ↓
FastAPI
  ↓
Compiler
  ↓
WASM
  ↓
Wasmtime
  ↓
stdout
  ↓
React
```

**Week 1 = WASM Foundation**

**Week 2 = End-to-End Plugin Execution Pipeline**

---

# Next Stage

After Week 2, the project proceeds to the Mid-Project Security Review:

```text
Filesystem attack
       ↓
     DENIED

Network attack
       ↓
     DENIED
```

This becomes the foundation for Week 3 resource constraints and Week 4
whitelisted host-function integration.
