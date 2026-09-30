import React, { useState } from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  Server, 
  Zap, 
  Layers, 
  Database, 
  Terminal, 
  Lock, 
  Activity, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle,
  Code2,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { WASM_WAT_SAMPLE } from '../data';

export const SystemsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'memory' | 'wat' | 'benchmarks'>('architecture');
  const [selectedPointerOffset, setSelectedPointerOffset] = useState<number>(0x0040);

  // Simulated linear memory buffer view
  const memoryHexDump = [
    { offset: '0x0000', hex: '00 61 73 6d 01 00 00 00', ascii: '.asm....', desc: 'WASM Magic (\\0asm) & Version 1' },
    { offset: '0x0008', hex: '01 0c 03 60 02 7f 7f 01', ascii: '...`....', desc: 'Type Section: (i32, i32) -> (i32)' },
    { offset: '0x0010', hex: '02 1f 02 04 68 6f 73 74', ascii: '....host', desc: 'Import Section: "host"."host_db_write"' },
    { offset: '0x0018', hex: '0d 68 6f 73 74 5f 64 62', ascii: '.host_db', desc: 'Import Symbol Name UTF-8' },
    { offset: '0x0020', hex: '05 03 01 00 10 a0 01 06', ascii: '........', desc: 'Memory Section: 16 min, 160 max pages (10MB)' },
    { offset: '0x0028', hex: '07 15 02 06 6d 65 6d 6f', ascii: '....memo', desc: 'Export Section: "memory", "run_plugin"' },
    { offset: '0x0030', hex: '0a 45 01 43 00 20 00 41', ascii: '.E.C. .A', desc: 'Code Section: MicroPython Opcode Loop' },
    { offset: '0x0038', hex: '00 28 02 00 10 00 0f 0b', ascii: '.(......', desc: 'C-ABI Host Call: call $host_db_write' },
    { offset: '0x0040', hex: '7b 22 74 65 6e 61 6e 74', ascii: '{"tenant', desc: 'Guest Payload Pointer: Start of JSON String' },
    { offset: '0x0048', hex: '5f 69 64 22 3a 20 22 74', ascii: '_id": "t', desc: 'Guest Payload JSON Body' },
    { offset: '0x0050', hex: '65 6e 61 6e 74 2d 34 30', ascii: 'enant-40', desc: 'Guest Payload JSON Body' },
    { offset: '0x0058', hex: '39 22 2c 20 22 65 76 65', ascii: '9", "eve', desc: 'Guest Payload JSON Body' },
  ];

  return (
    <div id="systems-view-container" className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Systems Engineering & WASM Architecture</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EBF3FF] text-[#0066FF] font-semibold text-[11px]">
              Wasmtime-py Runtime
            </span>
          </div>
          <p className="text-sm text-[#86868B] mt-0.5">
            Bypassing CPython constraints (GIL, high memory overhead, cold starts) via WebAssembly and WASI isolation.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5E7] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'architecture' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Core Architecture
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'memory' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Linear Memory & Pointers
          </button>
          <button
            onClick={() => setActiveTab('wat')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'wat' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            WAT Disassembly
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'benchmarks' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            WASM vs Docker
          </button>
        </div>
      </div>

      {/* Tab 1: Core Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Architectural Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#EBF3FF] text-[#0066FF] flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">Bypassing the Python GIL</h3>
                <p className="text-xs text-[#86868B] mt-2 leading-relaxed">
                  CPython enforces a Global Interpreter Lock (GIL) preventing true multi-threaded CPU execution. WasmBox compiles plugins to standalone WebAssembly and executes them in Wasmtime Rust engine instances across multiple OS threads with zero GIL contention.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F5F5F7] text-[11px] font-mono text-[#0066FF]">
                Result: 10,000+ parallel plugins/host
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E6F6EC] text-[#00A651] flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">WASI Zero-Trust Syscall Trapping</h3>
                <p className="text-xs text-[#86868B] mt-2 leading-relaxed">
                  Unlike native processes that inherit host file descriptors, Wasmtime unlinks the WASI file table. Calls to <code className="text-[#1D1D1F] font-mono">openat()</code> or <code className="text-[#1D1D1F] font-mono">sock_create()</code> are rejected at compile time or trapped immediately with EPERM.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F5F5F7] text-[11px] font-mono text-[#00A651]">
                Zero access to /etc/passwd or raw sockets
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">Whitelisted Host Function Bridges</h3>
                <p className="text-xs text-[#86868B] mt-2 leading-relaxed">
                  Plugins are isolated from databases and network pipes, but can invoke whitelisted host bridges (e.g. <code className="text-[#0066FF] font-mono">host_db_write</code>). The host validates payloads, calculates SHA-256 hashes, and safely commits to storage.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F5F5F7] text-[11px] font-mono text-[#1D1D1F]">
                Controlled ingress / egress via C-ABI
              </div>
            </div>
          </div>

          {/* Deep Execution Flow Diagram */}
          <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#1D1D1F] mb-1">End-to-End WasmBox Execution Pipeline</h3>
            <p className="text-xs text-[#86868B] mb-6">
              How untrusted Python code is received, compiled into a .wasm binary, and executed in sub-5ms:
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 relative">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase">Stage 01</span>
                  <h4 className="text-xs font-bold text-[#1D1D1F] mt-1">Untrusted Python</h4>
                  <p className="text-[11px] text-[#86868B] mt-2">
                    Customer submits custom Python script via REST API / Monaco Editor.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono bg-white p-2 rounded border border-[#E5E5E7]">
                  raw_code.py (AST)
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase">Stage 02</span>
                  <h4 className="text-xs font-bold text-[#1D1D1F] mt-1">Compiler & Packager</h4>
                  <p className="text-[11px] text-[#86868B] mt-2">
                    Python code is packaged with MicroPython interpreter into a WASM module.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono bg-white p-2 rounded border border-[#E5E5E7]">
                  wasm32-wasi binary
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase">Stage 03</span>
                  <h4 className="text-xs font-bold text-[#1D1D1F] mt-1">Wasmtime Engine</h4>
                  <p className="text-[11px] text-[#86868B] mt-2">
                    Host instantiates Wasmtime runtime with strict 10MB memory & 10M fuel counter.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono bg-white p-2 rounded border border-[#E5E5E7]">
                  Engine Config: Fuel+RAM
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase">Stage 04</span>
                  <h4 className="text-xs font-bold text-[#1D1D1F] mt-1">Zero-Trust Sandbox</h4>
                  <p className="text-[11px] text-[#86868B] mt-2">
                    Linear memory bounded. System calls isolated. 50ms timeout enforced.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono bg-white p-2 rounded border border-[#E5E5E7] text-[#00A651]">
                  Execution &lt; 5ms
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase">Stage 05</span>
                  <h4 className="text-xs font-bold text-[#1D1D1F] mt-1">Host Bridge & Stdout</h4>
                  <p className="text-[11px] text-[#86868B] mt-2">
                    Captured stdout streamed to user; whitelisted DB rows inserted to Postgres.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono bg-white p-2 rounded border border-[#E5E5E7]">
                  Clean Exit (0)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Linear Memory & Pointers */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">WASM Linear Memory & C-ABI Pointer Bridge</h3>
                <p className="text-xs text-[#86868B] mt-1">
                  WebAssembly programs execute against a flat array of raw bytes (<code className="font-mono text-[#0066FF]">WebAssembly.Memory</code>). The host verifies all memory pointers before dereferencing:
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono bg-[#F5F5F7] px-3 py-1.5 rounded-lg border border-[#E5E5E7]">
                <span>Max Ceiling:</span>
                <span className="font-bold text-[#0066FF]">160 pages (10.0 MB)</span>
              </div>
            </div>

            {/* Interactive Hex Dump Table */}
            <div className="overflow-x-auto border border-[#E5E5E7] rounded-xl font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F5F5F7] text-[#86868B] text-[11px] border-b border-[#E5E5E7]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Pointer Offset</th>
                    <th className="py-2.5 px-4 font-semibold">Raw Hex Bytes</th>
                    <th className="py-2.5 px-4 font-semibold">ASCII</th>
                    <th className="py-2.5 px-4 font-semibold">Structure / C-ABI Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E7]">
                  {memoryHexDump.map((row) => (
                    <tr 
                      key={row.offset}
                      onClick={() => setSelectedPointerOffset(parseInt(row.offset, 16))}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-4 text-[#0066FF] font-semibold">{row.offset}</td>
                      <td className="py-2 px-4 text-[#1D1D1F] tracking-wide">{row.hex}</td>
                      <td className="py-2 px-4 text-[#424245]">{row.ascii}</td>
                      <td className="py-2 px-4 text-[#86868B] text-[11px]">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pointer Safety Explanation */}
            <div className="mt-6 p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#00A651] shrink-0 mt-0.5" />
              <div className="text-xs text-[#424245] leading-relaxed">
                <span className="font-bold text-[#1D1D1F]">Out-of-Bounds Memory Protection: </span>
                In native C/Python extensions, an invalid memory pointer can trigger a segmentation fault or exploit host memory. In WebAssembly, hardware-assisted memory bounds guarantee that any pointer outside the 10MB linear memory space (<code className="font-mono text-[#0066FF]">offset &gt;= 0x00A00000</code>) immediately triggers a hardware trap, terminating the offending plugin without compromising host server memory.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: WAT Disassembly */}
      {activeTab === 'wat' && (
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">WebAssembly Text Format (WAT) Disassembly</h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                Human-readable S-expression representation of the compiled MicroPython sandbox module.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#F5F5F7] border border-[#E5E5E7] text-[11px] font-mono text-[#424245]">
              Target: wasm32-wasi
            </span>
          </div>

          <div className="bg-[#1E1E1E] text-[#D4D4D4] p-4 rounded-xl font-mono text-xs overflow-x-auto border border-[#2D2D30] leading-relaxed">
            <pre className="text-[#9CDCFE]">{WASM_WAT_SAMPLE}</pre>
          </div>
        </div>
      )}

      {/* Tab 4: Benchmarks: WASM vs Docker */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#1D1D1F] mb-1">Architecture Comparison: WasmBox vs Docker Containers</h3>
            <p className="text-xs text-[#86868B] mb-6">
              Why WebAssembly is replacing Docker containers for high-density multi-tenant SaaS plugins:
            </p>

            <div className="overflow-x-auto border border-[#E5E5E7] rounded-xl font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F5F5F7] text-[#86868B] text-[11px] border-b border-[#E5E5E7]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Evaluation Metric</th>
                    <th className="py-3 px-4 font-semibold text-[#0066FF]">WasmBox Sandbox (Wasmtime)</th>
                    <th className="py-3 px-4 font-semibold text-[#86868B]">Docker Micro-Container</th>
                    <th className="py-3 px-4 font-semibold text-[#86868B]">CPython Subprocess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E7]">
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">Cold Start Latency</td>
                    <td className="py-3 px-4 font-bold text-[#00A651]">2.4 ms - 4.8 ms</td>
                    <td className="py-3 px-4 text-[#86868B]">850 ms - 2,400 ms</td>
                    <td className="py-3 px-4 text-[#86868B]">60 ms - 150 ms</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">RAM Footprint per Tenant</td>
                    <td className="py-3 px-4 font-bold text-[#00A651]">1.8 MB - 4.2 MB</td>
                    <td className="py-3 px-4 text-[#86868B]">180 MB - 450 MB</td>
                    <td className="py-3 px-4 text-[#86868B]">35 MB - 80 MB</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">Isolation Primitive</td>
                    <td className="py-3 px-4 font-bold text-[#0066FF]">Hardware Fault + WASI Capabilities</td>
                    <td className="py-3 px-4 text-[#86868B]">Linux cgroups / namespaces</td>
                    <td className="py-3 px-4 text-red-500">None (Full host access)</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">File System Access</td>
                    <td className="py-3 px-4 font-bold text-[#00A651]">Zero (openat unlinked)</td>
                    <td className="py-3 px-4 text-[#86868B]">OverlayFS volume</td>
                    <td className="py-3 px-4 text-red-500">Full host filesystem</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">Concurrency / Host GIL</td>
                    <td className="py-3 px-4 font-bold text-[#0066FF]">Zero GIL Lock (Multi-thread Rust)</td>
                    <td className="py-3 px-4 text-[#86868B]">High OS daemon context switching</td>
                    <td className="py-3 px-4 text-red-500">Blocked by CPython GIL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
