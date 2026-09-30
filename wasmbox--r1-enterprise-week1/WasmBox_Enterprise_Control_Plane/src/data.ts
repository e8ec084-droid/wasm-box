import { ExecutionRecord, LogEntry, SandboxPreset, WasmModuleItem } from './types';

export const INITIAL_MODULES: WasmModuleItem[] = [
  {
    id: 'mod-1',
    name: 'python_wasi.wasm',
    size: '25.1 MB',
    uploadedAt: 'Aug 13, 2026, 09:59 PM',
    version: 'v3.12.2-wasi',
    description: 'CPython compiled to WebAssembly with WASI system call virtualization and isolated memory bounds.',
    isDefault: true,
  },
  {
    id: 'mod-2',
    name: 'micropython_core.wasm',
    size: '1.8 MB',
    uploadedAt: 'Aug 12, 2026, 04:15 PM',
    version: 'v1.23.0',
    description: 'Ultra-lightweight MicroPython WASM binary for sub-2ms cold starts and extreme multi-tenancy.',
  },
  {
    id: 'mod-3',
    name: 'pyodide_sandbox.wasm',
    size: '18.4 MB',
    uploadedAt: 'Aug 11, 2026, 02:40 PM',
    version: 'v0.26.1',
    description: 'WebAssembly packaging with strict memory ceilings (10MB) and zero filesystem capabilities.',
  }
];

export const INITIAL_EXECUTIONS: ExecutionRecord[] = [
  {
    id: '821c9083-cf21-4677-8fef-0243013c0b74',
    module: 'python_wasi.wasm',
    status: 'COMPLETED',
    command: 'print("Hello from WasmBox!")',
    started: 'Aug 14, 2026, 11:36 AM',
    duration: '3.4ms',
    memoryUsed: '2.1 MB',
    output: 'Hello from WasmBox!\nLine 0\nLine 1\nLine 2',
  },
  {
    id: '9f03a99b-0c7d-4fd3-bfd3-9374adf54bab',
    module: 'python_wasi.wasm',
    status: 'FAILED',
    command: 'run --entry main',
    started: 'Aug 14, 2026, 11:32 AM',
    duration: '2.1ms',
    memoryUsed: '1.9 MB',
    output: '',
    error: 'Traceback (most recent call last):\n  File "plugin.py", line 1, in <module>\nAttributeError: module \'main\' not found in WASM symbols export table',
  },
  {
    id: 'd0ca7c9a-fb80-4453-b085-d7dee54d8a00',
    module: 'python_wasi.wasm',
    status: 'COMPLETED',
    command: 'print("Hello")',
    started: 'Aug 14, 2026, 11:39 AM',
    duration: '2.8ms',
    memoryUsed: '1.7 MB',
    output: 'Hello',
  },
  {
    id: 'a2660680-a85b-4efd-8901-68d077671db7',
    module: 'python_wasi.wasm',
    status: 'COMPLETED',
    command: 'print("namaskara")',
    started: 'Aug 14, 2026, 11:40 AM',
    duration: '3.1ms',
    memoryUsed: '1.8 MB',
    output: 'namaskara',
  }
];

export const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: 'Aug 14, 2026, 11:28 AM',
    level: 'INFO',
    message: 'Module uploaded: python_wasi.wasm',
    details: 'Validated binary format: WebAssembly v1 (0x00 0x61 0x73 0x6d)',
  },
  {
    id: 'log-2',
    timestamp: 'Aug 14, 2026, 11:32 AM',
    level: 'INFO',
    message: 'Execution started: run --entry main',
    details: 'Wasmtime instance spawned. Memory limit: 10MB. Fuel: 10,000,000.',
  },
  {
    id: 'log-3',
    timestamp: 'Aug 14, 2026, 11:32 AM',
    level: 'ERROR',
    message: 'Execution failed: 9f03a99b-0c7d-4fd3-bfd3-9374adf54bab',
    details: 'WASM trap: entry point symbol resolution error',
  },
  {
    id: 'log-4',
    timestamp: 'Aug 14, 2026, 11:36 AM',
    level: 'INFO',
    message: 'Execution started: print("Hello from WasmBox!")',
    details: 'Wasmtime compiled execution initiated with WASI stdout pipe.',
  },
  {
    id: 'log-5',
    timestamp: 'Aug 14, 2026, 11:36 AM',
    level: 'INFO',
    message: 'Execution completed: 821c9083-cf21-4677-8fef-0243013c0b74',
    details: 'Execution time: 3.4ms | Host overhead: 0.8ms | Memory: 2.1 MB',
  },
  {
    id: 'log-6',
    timestamp: 'Aug 14, 2026, 11:39 AM',
    level: 'INFO',
    message: 'Execution started: print("Hello")',
  },
  {
    id: 'log-7',
    timestamp: 'Aug 14, 2026, 11:39 AM',
    level: 'INFO',
    message: 'Execution completed: d0ca7c9a-fb80-4453-b085-d7dee54d8a00',
  },
  {
    id: 'log-8',
    timestamp: 'Aug 14, 2026, 11:40 AM',
    level: 'INFO',
    message: 'Execution started: print("namaskara")',
  },
  {
    id: 'log-9',
    timestamp: 'Aug 14, 2026, 11:40 AM',
    level: 'INFO',
    message: 'Execution completed: a2660680-a85b-4efd-8901-68d077671db7',
  },
];

export const SANDBOX_PRESETS: SandboxPreset[] = [
  {
    id: 'preset-hello',
    name: 'Benign Loop (Default)',
    category: 'benign',
    description: 'Standard Python loop executed inside the WASM sandbox (<5ms)',
    command: 'print("Hello from WasmBox!")',
    expectedStatus: 'COMPLETED',
    expectedDuration: '3.2ms',
    code: `print("Hello, WasmBox!")

for i in range(3):
    print(f"Line {i}")
`,
  },
  {
    id: 'preset-data-parser',
    name: 'Enterprise Data Parser (Use Case)',
    category: 'enterprise',
    description: 'Custom parser formatting proprietary enterprise telemetry in <5ms',
    command: 'python_wasi parse --input telemetry.raw',
    expectedStatus: 'COMPLETED',
    expectedDuration: '4.1ms',
    code: `import json

# Enterprise proprietary raw payload from customer
raw_records = "DEV-901|2026-09-04T03:55Z|SENSOR_A|98.6;DEV-902|2026-09-04T03:56Z|SENSOR_B|104.2"

parsed_output = []
for entry in raw_records.split(";"):
    device_id, ts, metric, val = entry.split("|")
    parsed_output.append({
        "device": device_id,
        "timestamp": ts,
        "sensor": metric,
        "reading": float(val),
        "sandbox": "WasmBox-WASM-v1"
    })

print("[WasmBox Parser] Successfully transformed raw telemetry:")
print(json.dumps(parsed_output, indent=2))
print("STATUS: 0 sandbox violations. Clean execution.")
`,
  },
  {
    id: 'preset-sec-fs',
    name: 'Security Audit: File System Exploit',
    category: 'security_fs',
    description: 'Attempts to read /etc/passwd — sandbox blocks action & throws permission error',
    command: 'cat /etc/passwd',
    expectedStatus: 'FAILED',
    expectedDuration: '1.4ms',
    code: `# SECURITY AUDIT: Host File System Access Attempt
# Malicious untrusted plugin tries to read host /etc/passwd

try:
    print("[Attack] Attempting to open host /etc/passwd...")
    with open("/etc/passwd", "r") as f:
        print("CRITICAL LEAK:", f.read())
except Exception as e:
    print(f"[BLOCKED] Caught expected sandbox violation: {type(e).__name__}: {e}")
    raise PermissionError("[WasmBox Sandbox Isolation] WASI syscall openat() denied for path '/etc/passwd'")
`,
  },
  {
    id: 'preset-sec-net',
    name: 'Security Audit: Network Socket Exploit',
    category: 'security_net',
    description: 'Attempts to open socket to external IP — sandbox intercepts & denies request',
    command: 'socket.connect(("8.8.8.8", 53))',
    expectedStatus: 'FAILED',
    expectedDuration: '1.7ms',
    code: `# SECURITY AUDIT: Socket Connection Attempt
# Malicious plugin attempts unauthorized outbound network exfiltration

import socket

try:
    print("[Attack] Opening raw TCP socket to 8.8.8.8:53...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    s.connect(("8.8.8.8", 53))
    print("[CRITICAL] Connected to external network!")
except Exception as e:
    print(f"[BLOCKED] Intercepted socket creation: {e}")
    raise ConnectionRefusedError("[WasmBox Network Trap] Socket syscall socket() prohibited by sandbox capability flags")
`,
  },
  {
    id: 'preset-res-memory',
    name: 'Resource Limit: Memory Bomb (10MB Cap)',
    category: 'resource_memory',
    description: 'Allocates memory exceeding 10MB limit — Wasmtime engine terminates process',
    command: 'allocate_buffer(15_MB)',
    expectedStatus: 'FAILED',
    expectedDuration: '2.9ms',
    code: `# RESOURCE MONITOR: Memory Allocation Ceiling Test
# Attempting to allocate 15 MB in a sandbox with a strict 10 MB limit

print("[Monitor] Checking initial heap memory allocation...")
print("[Monitor] Permitted ceiling: 10.0 MB")

try:
    print("[Stress] Attempting to allocate 15 MB byte buffer...")
    bomb = bytearray(15 * 1024 * 1024)
    print("Allocated bytes:", len(bomb))
except MemoryError as e:
    print("[INTERCEPTED] Memory limit exceeded trap triggered by Wasmtime!")
    raise MemoryError("[WasmBox Memory Trap] Memory allocation (15.0 MB) exceeded maximum tenant ceiling (10.0 MB)")
except Exception as e:
    raise MemoryError(f"[Wasmtime Engine Limit] Allocation failed: {e}")
`,
  },
  {
    id: 'preset-res-loop',
    name: 'Resource Limit: Fuel / Infinite Loop',
    category: 'resource_loop',
    description: 'Infinite while True loop — terminated by Wasmtime fuel instruction counter',
    command: 'while True: pass',
    expectedStatus: 'FAILED',
    expectedDuration: '5.0ms',
    code: `# RESOURCE MONITOR: Instruction Count (Fuel) Test
# Infinite loop prevented from freezing CPU or starving tenants

print("[Monitor] Wasmtime fuel counter initialized: 10,000,000 instructions")
print("[Running] Starting infinite loop execution...")

count = 0
while True:
    count += 1
    if count >= 1000000:
        # Host fuel engine interrupt simulation (enforcing 50ms execution ceiling)
        raise TimeoutError("[WasmBox Fuel Trap] Wasmtime fuel exhausted (10,000,000 instructions). Sandbox CPU thread killed safely.")
`,
  },
  {
    id: 'preset-host-bridge',
    name: 'Host Functions: Authorized DB Write',
    category: 'host_bridge',
    description: 'Untrusted WASM calls whitelisted host function (host_db_write) to persist sanitized data into Postgres/Host DB',
    command: 'host_bridge.invoke("enterprise_audit_log")',
    expectedStatus: 'COMPLETED',
    expectedDuration: '3.6ms',
    hostCallsEnabled: true,
    code: `# HOST FUNCTIONS: Secure Host API Bridge
# Untrusted WASM plugin cannot access databases directly (no raw socket/disk),
# but securely invokes whitelisted host functions exported into WASM instance by wasmtime-py.

import host_bridge

print("[Plugin] Processing enterprise financial event...")

record = {
    "tenant_id": "tenant-corp-409",
    "event": "INVOICE_PROCESSED",
    "amount_usd": 14950.00,
    "status": "APPROVED",
    "hash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
}

# Invoke secure C-ABI host import: host.host_db_write(table_ptr, json_payload_ptr)
result = host_bridge.db_write(table="enterprise_audit_log", row=record)
print(f"[Host Bridge Return]: Row written successfully! ID: {result['row_id']}")

# Emit telemetry metric through whitelisted host bridge
host_bridge.emit_metric("plugin_execution_ok", 1.0)
print("[Plugin] Execution finished with 2 whitelisted host calls authorized.")
`,
  }
];

export const INITIAL_SAVED_PLUGINS = [
  {
    id: 'plug-1',
    name: 'Proprietary Telemetry Normalizer',
    version: '1.2.0',
    description: 'Converts legacy sensor pipes into sanitized JSON structures with zero memory leaks.',
    code: `import json

raw_input = payload.get("data", "DEV-901|2026-09-04T03:55Z|SENSOR_A|98.6")
parts = raw_input.split("|")
output = {
    "device_id": parts[0],
    "timestamp": parts[1],
    "sensor": parts[2],
    "reading": float(parts[3]),
    "sandbox": "WasmBox-WASM-v1"
}

print(json.dumps(output))
`,
    createdAt: 'Sep 02, 2026',
    triggerCount: 1420,
    webhookPath: '/api/v1/plugins/plug-1/trigger',
    samplePayload: '{\n  "event": "telemetry.push",\n  "data": "DEV-901|2026-09-04T03:55Z|SENSOR_A|98.6"\n}',
    enabledHostFunctions: ['host_get_timestamp', 'host_telemetry_emit']
  },
  {
    id: 'plug-2',
    name: 'Order Sanitizer & Audit Logger',
    version: '2.0.1',
    description: 'Validates customer checkout payloads and writes verified ledger entries through host DB bridge.',
    code: `import host_bridge

order_id = payload.get("order_id", "ORD-8821")
total = float(payload.get("amount", 249.99))

print(f"[Plugin] Sanitizing order {order_id} total: \${total}...")

record = {
    "order_id": order_id,
    "amount": total,
    "validated_by": "wasm_sandbox_tenant_1",
    "status": "SANITIZED"
}

res = host_bridge.db_write("orders_ledger", record)
print(f"[Host Bridge] Persisted to authorized host DB row: {res['row_id']}")
`,
    createdAt: 'Sep 03, 2026',
    triggerCount: 842,
    webhookPath: '/api/v1/plugins/plug-2/trigger',
    samplePayload: '{\n  "order_id": "ORD-9942",\n  "amount": 420.50,\n  "currency": "USD"\n}',
    enabledHostFunctions: ['host_db_write', 'host_crypto_hash']
  },
  {
    id: 'plug-3',
    name: 'Security Guard & Threat Detector',
    version: '1.0.4',
    description: 'Inspects inbound payload tokens for injection attacks and flags suspicious regex patterns.',
    code: `import json

text = payload.get("comment", "Clean customer review text")
suspicious = ["<script>", "UNION SELECT", "drop table", "/etc/passwd"]

detected = [pattern for pattern in suspicious if pattern in text.lower()]
result = {
    "flagged": len(detected) > 0,
    "matches": detected,
    "clean": len(detected) == 0
}

print("[Threat Engine] Scan completed:")
print(json.dumps(result, indent=2))
`,
    createdAt: 'Sep 04, 2026',
    triggerCount: 3105,
    webhookPath: '/api/v1/plugins/plug-3/trigger',
    samplePayload: '{\n  "user": "alex@enterprise.corp",\n  "comment": "Fast shipping, highly recommended!"\n}',
    enabledHostFunctions: ['host_crypto_hash']
  }
];

export const INITIAL_HOST_DB_ROWS = [
  {
    id: 'row-8819',
    table: 'enterprise_audit_log',
    timestamp: 'Aug 14, 2026, 11:42 AM',
    pluginId: 'plug-2',
    data: {
      tenant_id: 'tenant-corp-409',
      event: 'INVOICE_PROCESSED',
      amount_usd: 14950.00,
      status: 'APPROVED'
    },
    hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
  },
  {
    id: 'row-8820',
    table: 'orders_ledger',
    timestamp: 'Aug 14, 2026, 11:40 AM',
    pluginId: 'plug-2',
    data: {
      order_id: 'ORD-8821',
      amount: 249.99,
      validated_by: 'wasm_sandbox_tenant_1',
      status: 'SANITIZED'
    },
    hash: 'sha256:a3910cbe7781b29fa0192837bc90184716bcde49819280194857218491823901'
  }
];

export const WASM_WAT_SAMPLE = `(module
  ;; Host Function Imports (Whitelisted bridges provided by wasmtime-py host)
  (import "host" "host_db_write" (func $host_db_write (param i32 i32 i32 i32) (result i32)))
  (import "host" "host_emit_metric" (func $host_emit_metric (param i32 i32 f64) (result i32)))
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))

  ;; Linear Memory bounded to max 160 pages (10MB RAM ceiling)
  (memory (export "memory") 16 160)

  ;; Global fuel instruction tracker
  (global $fuel_counter (mut i64) (i64.const 10000000))

  ;; Exported Entrypoint
  (func $run_plugin (export "run_plugin") (param $input_ptr i32) (result i32)
    (local $status i32)
    ;; MicroPython AST execution in isolated sandbox
    i32.const 1
    return
  )
)`;

