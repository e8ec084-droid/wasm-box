import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Activity, 
  Download, 
  ShieldAlert, 
  Zap,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  onOpenAudit: () => void;
  onOpenArch: () => void;
  onOpenBenchmark: () => void;
  onDownloadWasm: () => void;
  isExecuting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAudit,
  onOpenArch,
  onOpenBenchmark,
  onDownloadWasm,
  isExecuting
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 lg:px-6 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-md shadow-indigo-500/20 text-white font-mono font-bold text-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                WasmBox
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-normal">
                  v1.4 Wasmtime
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Secure Multi-Tenant Python Plugin Sandbox & WASM Compiler
            </p>
          </div>
        </div>

        {/* Real-time runtime status tags */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero-Trust WASI</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>&lt; 5ms Execution SLA</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-amber-400">
            <Layers className="w-3.5 h-3.5" />
            <span>10MB Hard Heap Cap</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onOpenAudit}
            id="btn-security-audit"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Security Audit</span>
          </button>

          <button
            onClick={onOpenBenchmark}
            id="btn-benchmark"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Stress Test (100 Runs)</span>
          </button>

          <button
            onClick={onOpenArch}
            id="btn-architecture"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sandbox Architecture</span>
          </button>

          <button
            onClick={onDownloadWasm}
            id="btn-download-wasm"
            title="Download compiled .wasm binary"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .wasm</span>
          </button>
        </div>
      </div>
    </header>
  );
};
