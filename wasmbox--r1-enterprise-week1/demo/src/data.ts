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
        # Host fuel engine interrupt simulation
        raise TimeoutError("[WasmBox Fuel Trap] Wasmtime fuel exhausted (10,000,000 instructions). Sandbox terminated.")
`,
  }
];
