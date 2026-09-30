import React from 'react';
import {
  Server, Cpu, Box, HardDrive, ShieldCheck, Lock, WifiOff, Gauge, Layers,
  PlayCircle, CheckCircle2, AlertTriangle, Zap, ArrowRight, Activity,
  Database, Globe2, Terminal, Clock3
} from 'lucide-react';
import { ExecutionRecord, PageType, WasmModuleItem } from '../types';

interface DashboardViewProps {
  modules: WasmModuleItem[];
  executions: ExecutionRecord[];
  memoryUsageMb: number;
  activeExecutions: number;
  onNavigate: (page: PageType) => void;
  onLaunchAuditPreset?: (presetId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  modules, executions, memoryUsageMb, activeExecutions, onNavigate, onLaunchAuditPreset
}) => {
  const completed = executions.filter(e => e.status === 'COMPLETED').length;
  const failed = executions.filter(e => e.status === 'FAILED').length;
  const successRate = executions.length ? Math.round((completed / executions.length) * 100) : 100;

  const audits = [
    { id: 'preset-sec-fs', icon: <Lock size={15}/>, title: 'Filesystem boundary', detail: 'Host paths denied', tone: 'red' },
    { id: 'preset-sec-net', icon: <WifiOff size={15}/>, title: 'Network boundary', detail: 'Raw sockets denied', tone: 'blue' },
    { id: 'preset-res-memory', icon: <Gauge size={15}/>, title: 'Memory governor', detail: '10 MB hard ceiling', tone: 'slate' },
    { id: 'preset-host-bridge', icon: <Database size={15}/>, title: 'Host bridge', detail: 'Allowlisted capability', tone: 'green' },
  ];

  return (
    <div className="wb-page space-y-5">
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="wb-kicker mb-2">Secure execution platform</div>
          <h1 className="wb-page-title">Environment Overview</h1>
          <p className="wb-page-subtitle max-w-2xl">
            Enterprise control plane for deploying, executing, and auditing untrusted WebAssembly plugins in tenant-isolated environments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate('systems')} className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <LayersIcon /> Architecture
          </button>
          <button onClick={() => onNavigate('webhooks')} className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Zap size={14} className="text-blue-600" /> Plugins
          </button>
          <button onClick={() => onNavigate('sandbox')} className="wb-primary px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2">
            <PlayCircle size={14} /> Open Sandbox IDE
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Runtime health', value: 'Healthy', sub: 'Wasmtime 22.0 • WASI', icon: <Server size={17}/>, accent: 'text-emerald-600' },
          { label: 'Active executions', value: activeExecutions, sub: 'Concurrent workloads', icon: <Cpu size={17}/>, accent: 'text-blue-600' },
          { label: 'Registered modules', value: modules.length, sub: 'Tenant-scoped packages', icon: <Box size={17}/>, accent: 'text-violet-600' },
          { label: 'Memory footprint', value: `${memoryUsageMb || '0.84'} MB`, sub: 'Policy ceiling: 10 MB', icon: <HardDrive size={17}/>, accent: 'text-slate-600' },
        ].map((m) => (
          <div key={m.label} className="wb-metric">
            <div className="flex items-center justify-between">
              <span className="wb-kicker">{m.label}</span>
              <span className={m.accent}>{m.icon}</span>
            </div>
            <div className="wb-metric-value mt-5">{m.value}</div>
            <div className="text-[10px] text-slate-500 mt-2">{m.sub}</div>
          </div>
        ))}
      </section>

      <section className="wb-enterprise-grid">
        <div className="wb-card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div>
              <div className="wb-kicker mb-1">Platform posture</div>
              <h2 className="text-[15px] font-bold text-slate-900">Security & Runtime Controls</h2>
              <p className="text-[11px] text-slate-500 mt-1">Default-deny capabilities with explicit host bridges.</p>
            </div>
            <span className="wb-chip"><ShieldCheck size={12} className="text-emerald-600"/> Policy enforced</span>
          </div>

          <div className="p-5">
            <div className="wb-feature-strip">
              <Control title="Filesystem" value="Denied" icon={<Lock size={14}/>} />
              <Control title="Network" value="Denied" icon={<Globe2 size={14}/>} />
              <Control title="Memory" value="10 MB" icon={<Gauge size={14}/>} />
              <Control title="Fuel budget" value="10M" icon={<Activity size={14}/>} />
            </div>

            <div className="mt-5 rounded-xl bg-slate-950 text-slate-200 p-4 font-mono text-[10px] leading-5 overflow-hidden">
              <div className="flex items-center gap-2 text-slate-500 mb-2"><Terminal size={12}/> runtime.policy</div>
              <div><span className="text-emerald-400">isolation</span> = <span className="text-blue-300">"tenant"</span></div>
              <div><span className="text-emerald-400">filesystem</span> = <span className="text-rose-300">DENY_ALL</span></div>
              <div><span className="text-emerald-400">network</span> = <span className="text-rose-300">DENY_ALL</span></div>
              <div><span className="text-emerald-400">host_bridge</span> = <span className="text-amber-300">ALLOWLIST</span></div>
              <div><span className="text-emerald-400">memory_mb</span> = <span className="text-violet-300">10</span></div>
            </div>
          </div>
        </div>

        <div className="wb-card">
          <div className="p-5 border-b border-slate-100">
            <div className="wb-kicker mb-1">Operational snapshot</div>
            <h2 className="text-[15px] font-bold text-slate-900">Execution posture</h2>
          </div>
          <div className="p-5 space-y-5">
            <MetricRow label="Success rate" value={`${successRate}%`} percent={successRate} />
            <MetricRow label="Completed runs" value={completed.toString()} percent={Math.min(completed * 10, 100)} />
            <MetricRow label="Failed runs" value={failed.toString()} percent={Math.min(failed * 10, 100)} danger />
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div><div className="wb-kicker">Modules</div><div className="text-xl font-bold text-slate-900 mt-1">{modules.length}</div></div>
              <div><div className="wb-kicker">Total runs</div><div className="text-xl font-bold text-slate-900 mt-1">{executions.length}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="wb-card">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="wb-kicker mb-1">Verification suite</div>
            <h2 className="text-[15px] font-bold text-slate-900">Isolation controls & audit scenarios</h2>
            <p className="text-[11px] text-slate-500 mt-1">Launch a controlled scenario in the Sandbox IDE.</p>
          </div>
          <button onClick={() => onNavigate('executions')} className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5">View execution history <ArrowRight size={13}/></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {audits.map((audit) => (
            <button key={audit.id} onClick={() => onLaunchAuditPreset?.(audit.id)} className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  audit.tone === 'red' ? 'bg-rose-50 text-rose-600' :
                  audit.tone === 'green' ? 'bg-emerald-50 text-emerald-600' :
                  audit.tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                }`}>{audit.icon}</span>
                <ArrowRight size={14} className="text-slate-300"/>
              </div>
              <div className="text-[12px] font-bold text-slate-800">{audit.title}</div>
              <div className="text-[10px] text-slate-500 mt-1">{audit.detail}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="wb-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="wb-kicker mb-1">Recent activity</div>
            <h2 className="text-[15px] font-bold text-slate-900">Latest executions</h2>
          </div>
          <button onClick={() => onNavigate('executions')} className="text-[11px] font-bold text-blue-700">Open history →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="wb-table-head"><th className="px-5 py-3">Execution</th><th className="px-5 py-3">Module</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Duration</th><th className="px-5 py-3">Started</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {executions.slice(0, 5).map((e) => (
                <tr key={e.id} className="text-[11px] hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-mono text-slate-700">{e.id.slice(0, 12)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{e.module}</td>
                  <td className="px-5 py-3.5"><span className={`wb-chip ${e.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}`}><span className={`w-1.5 h-1.5 rounded-full ${e.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'}`}/>{e.status}</span></td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">{e.duration}</td>
                  <td className="px-5 py-3.5 text-slate-500">{e.started}</td>
                </tr>
              ))}
              {!executions.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400">No executions recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[10px] text-slate-500">
        <div className="flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-600"/> Tenant-isolated control plane</div>
        <div className="flex items-center gap-4"><span><Clock3 size={12} className="inline mr-1"/> Demo telemetry</span><span>WasmBox Core v1.0</span></div>
      </div>
    </div>
  );
};

function Control({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <div className="wb-feature"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-[9px] font-extrabold uppercase tracking-wider">{title}</span></div><div className="text-[13px] font-bold text-slate-800 mt-2">{value}</div></div>;
}
function MetricRow({ label, value, percent, danger }: { label: string; value: string; percent: number; danger?: boolean }) {
  return <div><div className="flex justify-between text-[11px] mb-2"><span className="text-slate-600">{label}</span><span className={danger ? 'font-bold text-rose-600' : 'font-bold text-slate-800'}>{value}</span></div><div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${danger ? 'bg-rose-500' : 'bg-blue-600'}`} style={{width: `${Math.max(3, Math.min(percent,100))}%`}}/></div></div>;
}
function LayersIcon(){ return <LayersIconBase/>; }
function LayersIconBase(){ return <Layers size={14} className="text-violet-600"/>; }
