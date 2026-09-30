# WasmBox Enterprise Presentation

## 1. Executive Summary
WasmBox is a control-plane prototype for secure, tenant-isolated execution of untrusted WebAssembly plugins.

## 2. Business Problem
Customer-defined plugins are useful for custom parsing and transformation, but unrestricted code execution increases the blast radius of application compromise. Traditional heavyweight isolation can also introduce unnecessary startup and resource overhead for small plugin workloads.

## 3. Platform Approach
- Browser-based developer portal
- WebAssembly/WASI execution boundary
- Default-deny filesystem and network capabilities
- Explicit allowlisted host functions
- Memory and instruction/fuel governance
- Execution history and audit logs
- Webhook-driven plugin invocation

## 4. Enterprise Workflow
`Author -> Validate -> Package -> Isolate -> Execute -> Observe -> Audit`

## 5. Security Model
Guest code runs inside a constrained runtime. Host capabilities are exposed only through explicit interfaces. Resource ceilings provide an additional control against runaway workloads.

## 6. Demo Flow
1. Open Environment Overview.
2. Show runtime health and security posture.
3. Open Sandbox IDE and execute the safe sample.
4. Run filesystem/network audit scenarios.
5. Demonstrate an allowlisted host bridge.
6. Open Execution History and Audit Logs.
7. Show Sandbox Policies.

## 7. Technical Stack
React 19, TypeScript, Vite, Tailwind CSS 4, Lucide icons, Monaco Editor, Wasmtime/WASI concepts.

## 8. Important Prototype Boundary
The current UI is a presentation/demo control plane. Runtime values, execution telemetry, and security outcomes are simulated unless connected to a real backend runtime and policy engine.
