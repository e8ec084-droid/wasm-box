import React from 'react';
import { 
  Zap, 
  Layers, 
  Flame, 
  ShieldCheck, 
  Clock, 
  Cpu, 
  TrendingUp, 
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import type { ExecutionMetrics, SecurityTrap } from '../types';

interface TelemetryPanelProps {
  metrics?: ExecutionMetrics;
  traps?: SecurityTrap[];
  isExecuting?: boolean;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  metrics,
  traps = [],
  isExecuting
}) => {
  const execTime = metrics?.executionTimeMs || 0;
  const isFastSLA = execTime < 5.0;
  const memoryUsedKB = metrics ? (metrics.memoryUsedBytes / 1024).toFixed(1) : '0';
  const memoryLimitMB = metrics ? (metrics.memoryLimitBytes / (1024 * 1024)).toFixed(0) : '10';
  const fuelPercent = metrics ? Math.min(100, (metrics.fuelConsumed / metrics.fuelLimit) * 100) : 0;
  const hasTraps = traps.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      
      {/* Panel Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            WASM Sandbox Telemetry
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {hasTraps ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <AlertOctagon className="w-3 h-3 text-rose-400" />
              <span>TRAP INTERCEPTED</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>ZERO-TRUST SECURE</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid of Micro-Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Metric 1: Execution Latency (< 5ms SLA) */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Execution Time
            </span>
            <span className={`text-[10px] px-1 rounded font-bold font-mono ${
              isFastSLA ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
            }`}>
              {isFastSLA ? '< 5ms SLA ✓' : 'SLA exceeded'}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
            {metrics ? execTime.toFixed(2) : '--'}
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Cold start: {metrics ? metrics.coldStartTimeMs : '0.4'} ms
          </div>
        </div>

        {/* Metric 2: Memory Footprint vs 10MB Cap */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Memory Allocated
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Max {memoryLimitMB} MB
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
            {metrics ? memoryUsedKB : '--'}
            <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            {metrics?.wasmPagesAllocated || 1} WASM Pages (64KB each)
          </div>
        </div>

        {/* Metric 3: Fuel / Instruction Metering */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              Instruction Fuel
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {fuelPercent.toFixed(0)}% used
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
            {metrics ? metrics.fuelConsumed.toLocaleString() : '--'}
            <span className="text-xs font-normal text-slate-400">
              / {metrics ? (metrics.fuelLimit / 1000).toFixed(0) + 'k' : '50k'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                fuelPercent > 80 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{ width: `${fuelPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 4: WASM Binary Size */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              Binary Size
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Wasm v1.0
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
            {metrics ? metrics.wasmBinarySizeBytes : '128'}
            <span className="text-xs font-normal text-slate-400">bytes</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            vs 350 MB Docker image
          </div>
        </div>

      </div>

    </div>
  );
};
