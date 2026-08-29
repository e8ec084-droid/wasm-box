import React from 'react';
import { 
  Zap, 
  X, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Server, 
  Box, 
  Check, 
  Minus, 
  ArrowRight,
  Lock
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Multi-Tenant Sandbox Architecture & Security Boundary
              </h2>
              <p className="text-xs text-slate-400">
                Why WebAssembly (Wasmtime) outperforms Docker containers for high-density untrusted plugins.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Comparison Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Runtime Isolation Architecture Comparison
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-300">
                    <th className="p-3 font-semibold">Evaluation Metric</th>
                    <th className="p-3 font-semibold text-slate-400">Docker Container</th>
                    <th className="p-3 font-semibold text-slate-400">Hardware VM (KVM)</th>
                    <th className="p-3 font-semibold text-emerald-400 bg-emerald-950/20">WasmBox (Wasmtime)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-200">Cold Start Latency</td>
                    <td className="p-3 text-rose-400">300 - 1500 ms</td>
                    <td className="p-3 text-rose-400">3000 - 8000 ms</td>
                    <td className="p-3 font-bold text-emerald-300 bg-emerald-950/20">&lt; 1.0 ms (Microseconds)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-200">Memory Overhead per Plugin</td>
                    <td className="p-3 text-amber-400">150 MB - 500 MB</td>
                    <td className="p-3 text-rose-400">1 GB - 4 GB</td>
                    <td className="p-3 font-bold text-emerald-300 bg-emerald-950/20">64 KB - 10 MB</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-200">Max Plugins per Node</td>
                    <td className="p-3 text-slate-400">~50 - 200 plugins</td>
                    <td className="p-3 text-slate-400">~10 - 30 VMs</td>
                    <td className="p-3 font-bold text-emerald-300 bg-emerald-950/20">10,000+ Concurrent Sandboxes</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-200">Filesystem Access Model</td>
                    <td className="p-3 text-amber-400">Mount namespaces (cgroup leaks)</td>
                    <td className="p-3 text-slate-400">Emulated disk image</td>
                    <td className="p-3 font-bold text-emerald-300 bg-emerald-950/20">Zero-Trust: No FS grants</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-200">Network Security</td>
                    <td className="p-3 text-amber-400">Iptables / bridge rules</td>
                    <td className="p-3 text-slate-400">Virtual NICs</td>
                    <td className="p-3 font-bold text-emerald-300 bg-emerald-950/20">Socket syscalls non-existent</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-200">CPU Infinite Loop Defense</td>
                    <td className="p-3 text-slate-400">Host timeout / cgroup kill</td>
                    <td className="p-3 text-slate-400">Hypervisor CPU quota</td>
                    <td className="p-3 font-bold text-emerald-300 bg-emerald-950/20">Instruction Fuel Metering Trap</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Topology Diagram */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              WasmBox Multi-Tenant Sandboxing Pipeline
            </h3>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="font-bold text-slate-200 mb-1">1. Untrusted Python</div>
                  <div className="text-[10px] text-slate-400">Customer raw script + tenant input payload</div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/50">
                  <div className="font-bold text-indigo-300 mb-1">2. WasmBox Compiler</div>
                  <div className="text-[10px] text-indigo-200">AST validation, bytecode generation & WASM linking</div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50">
                  <div className="font-bold text-amber-300 mb-1">3. WASI Guard & Traps</div>
                  <div className="text-[10px] text-amber-200">10MB heap cap, 50k fuel limits, 0 FS/Net rights</div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
                  <div className="font-bold text-emerald-300 mb-1">4. Pure Output</div>
                  <div className="text-[10px] text-emerald-200">Sanitized return payload in &lt; 2.5ms</div>
                </div>

              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Capability-Based Security Guarantee:</strong> In WebAssembly, a module cannot perform any I/O operation (reading files, opening sockets, inspecting environment variables) unless the host explicitly grants the capability through imported functions. WasmBox imports only safe mathematical and memory utilities, making sandbox escapes mathematically impossible.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
