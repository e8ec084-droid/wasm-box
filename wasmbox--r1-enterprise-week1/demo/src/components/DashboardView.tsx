import React from 'react';
import { 
  Server, 
  Cpu, 
  Box, 
  HardDrive, 
  ShieldCheck, 
  Lock, 
  WifiOff, 
  Gauge, 
  PlayCircle,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Terminal
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
  modules,
  executions,
  memoryUsageMb,
  activeExecutions,
  onNavigate,
  onLaunchAuditPreset,
}) => {
  const completedCount = executions.filter((e) => e.status === 'COMPLETED').length;
  const failedCount = executions.filter((e) => e.status === 'FAILED').length;
  const totalExecutions = executions.length || 1;

  // Proportional bar heights
  const maxVal = Math.max(completedCount, failedCount, 1);
  const completedPercent = Math.round((completedCount / maxVal) * 100);
  const failedPercent = Math.round((failedCount / maxVal) * 100);

  return (
    <div id="dashboard-view-container" className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div id="dashboard-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#86868B] mt-0.5">
            Overview of your WasmBox sandbox environment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="quick-open-sandbox-btn"
            onClick={() => onNavigate('sandbox')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Open Sandbox IDE</span>
          </button>
        </div>
      </div>

      {/* 4 Status Metric Cards matching Clean Minimalism large typographic style */}
      <div id="status-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Runtime Status */}
        <div id="metric-runtime-status" className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Runtime Status
            </span>
            <Server className="w-4 h-4 text-[#00A651]" />
          </div>
          <div className="my-4 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              Online
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#86868B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A651] animate-pulse"></span>
            <span>Wasmtime-py v22.0</span>
          </div>
        </div>

        {/* Metric 2: Active Executions */}
        <div id="metric-active-executions" className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Active Executions
            </span>
            <Cpu className="w-4 h-4 text-[#0066FF]" />
          </div>
          <div className="my-4 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {activeExecutions}
            </span>
            <span className="text-sm text-[#86868B]">running</span>
          </div>
          <span className="text-[11px] text-[#86868B]">&lt;5ms execution budget</span>
        </div>

        {/* Metric 3: Modules Uploaded */}
        <div id="metric-modules-uploaded" className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Modules Uploaded
            </span>
            <Box className="w-4 h-4 text-[#86868B]" />
          </div>
          <div className="my-4 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {modules.length}
            </span>
            <span className="text-sm text-[#86868B]">packages</span>
          </div>
          <span className="text-[11px] text-[#86868B] truncate">Primary: python_wasi.wasm</span>
        </div>

        {/* Metric 4: Memory Usage */}
        <div id="metric-memory-usage" className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Mem Footprint
            </span>
            <HardDrive className="w-4 h-4 text-[#86868B]" />
          </div>
          <div className="my-4 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {memoryUsageMb || '0.84'}
            </span>
            <span className="text-sm text-[#86868B]">MB</span>
          </div>
          <span className="text-[11px] text-[#86868B]">Strict cap: 10.0 MB RAM</span>
        </div>
      </div>

      {/* Project Overview & Architecture Section */}
      <div id="project-overview-section" className="bg-white border border-[#E5E5E7] rounded-2xl p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5E5E7] gap-3">
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold mb-1">
              Architecture &amp; Mission
            </h2>
            <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight">
              Project Overview
            </h3>
            <p className="text-xs text-[#86868B] mt-0.5">
              Secure Multi-Tenant Plugin Sandbox leveraging WebAssembly for high-performance, isolated execution of untrusted customer Python scripts.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F6EC] text-xs font-semibold text-[#00A651]">
              <Zap className="w-3.5 h-3.5" />
              &lt; 5ms Sandbox Cold Start
            </span>
          </div>
        </div>

        {/* Problem Statement & Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#F5F5F7] p-5 rounded-xl border border-[#E5E5E7] space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#E02424] uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>The Problem</span>
            </div>
            <p className="text-xs text-[#424245] leading-relaxed">
              Enterprise customers want custom Python plugins (e.g., custom data parsers). Executing arbitrary, untrusted customer Python code directly on backend servers is a critical security hazard. Traditional Docker containers for each small plugin invocation are too slow and resource-heavy.
            </p>
          </div>

          <div className="bg-[#F5F5F7] p-5 rounded-xl border border-[#E5E5E7] space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#00A651] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>WasmBox Solution &amp; Use Case</span>
            </div>
            <p className="text-xs text-[#424245] leading-relaxed">
              A developer writes a custom Python script to format proprietary data. WasmBox compiles it into an isolated WebAssembly (<code className="text-[#0066FF] font-mono font-semibold">.wasm</code>) binary via Wasmtime. The plugin executes in under 5ms with zero access to the host server&apos;s filesystem or network.
            </p>
          </div>
        </div>

        {/* Key Modules breakdown (matching Design HTML key modules list style) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
            Key Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#0066FF]/40 transition-colors">
              <span className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                WASM Runtime
              </span>
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                Wasmtime-py / Extism high-performance runtime embedding WebAssembly directly in the host for safe execution.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#0066FF]/40 transition-colors">
              <span className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Compilation Engine
              </span>
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                Packages untrusted Python with a MicroPython / Pyodide interpreter and compiles it into an executable <code className="text-[#0066FF]">.wasm</code> binary.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#0066FF]/40 transition-colors">
              <span className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Resource Governor
              </span>
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                Strict Wasmtime memory caps (max 10MB RAM) and instruction fuel counters prevent infinite loops and memory bombs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] hover:border-[#0066FF]/40 transition-colors">
              <span className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Developer Portal
              </span>
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                Browser IDE (React &amp; Monaco-style editor) where enterprise users write plugins and inspect real-time outputs.
              </p>
            </div>
          </div>
        </div>

        {/* Security Audits Interactive Triggers */}
        <div className="p-5 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0066FF]" />
              Verified Security Audits &amp; Isolation Proofs
            </span>
            <p className="text-xs text-[#86868B]">
              Test how the WasmBox sandbox enforces zero-trust boundaries against malicious payloads:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (onLaunchAuditPreset) onLaunchAuditPreset('preset-sec-fs');
                else onNavigate('sandbox');
              }}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E7] border border-[#E5E5E7] text-[#1D1D1F] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5 text-[#E02424]" />
              <span>Audit: File System (/etc/passwd)</span>
            </button>

            <button
              onClick={() => {
                if (onLaunchAuditPreset) onLaunchAuditPreset('preset-sec-net');
                else onNavigate('sandbox');
              }}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E7] border border-[#E5E5E7] text-[#1D1D1F] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <WifiOff className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Audit: Network Socket (8.8.8.8)</span>
            </button>

            <button
              onClick={() => {
                if (onLaunchAuditPreset) onLaunchAuditPreset('preset-res-memory');
                else onNavigate('sandbox');
              }}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E7] border border-[#E5E5E7] text-[#1D1D1F] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Gauge className="w-3.5 h-3.5 text-[#86868B]" />
              <span>Monitor: 10MB RAM Limit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executions by Status (Bar Chart) */}
      <div id="executions-by-status-card" className="bg-white border border-[#E5E5E7] rounded-2xl p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold mb-1">
              Analytics
            </h2>
            <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight">
              Executions by Status
            </h3>
          </div>
          <span className="text-xs text-[#86868B]">
            Total runs: {executions.length}
          </span>
        </div>

        {/* Clean Bar Chart */}
        <div className="grid grid-cols-2 gap-8 items-end h-44 px-4 sm:px-16 pb-4 border-b border-[#E5E5E7]">
          {/* Completed Bar */}
          <div className="flex flex-col items-center gap-3 h-full justify-end">
            <div 
              className="w-full max-w-[220px] bg-[#0066FF] hover:bg-[#0052CC] rounded-t-md transition-all duration-500 relative flex items-center justify-center"
              style={{ height: `${Math.max(completedPercent, 20)}%` }}
            >
              <span className="sr-only">Completed: {completedCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#86868B] font-medium">Completed</span>
              <span className="text-sm font-bold text-[#1D1D1F] mt-0.5">{completedCount}</span>
            </div>
          </div>

          {/* Failed Bar */}
          <div className="flex flex-col items-center gap-3 h-full justify-end">
            <div 
              className="w-full max-w-[220px] bg-[#D1D1D6] hover:bg-[#AEAEB2] rounded-t-md transition-all duration-500 relative flex items-center justify-center"
              style={{ height: `${Math.max(failedPercent, 12)}%` }}
            >
              <span className="sr-only">Failed / Trapped: {failedCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#86868B] font-medium">Failed / Trapped</span>
              <span className="text-sm font-bold text-[#1D1D1F] mt-0.5">{failedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Executions Table */}
      <div id="recent-executions-card" className="bg-white border border-[#E5E5E7] rounded-2xl p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E7] mb-4">
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold mb-1">
              Audit Trail
            </h2>
            <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight">
              Recent Executions
            </h3>
          </div>
          <button
            id="view-all-executions-btn"
            onClick={() => onNavigate('executions')}
            className="text-xs font-semibold text-[#0066FF] hover:text-[#0052CC] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#86868B] uppercase tracking-wider border-b border-[#E5E5E7] bg-[#FAFAFA]">
                <th className="py-2.5 px-4 font-semibold text-[10px]">Module / Command</th>
                <th className="py-2.5 px-4 font-semibold text-right text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7] font-mono">
              {executions.slice(0, 5).map((exec) => {
                const isCompleted = exec.status === 'COMPLETED';
                return (
                  <tr 
                    key={exec.id} 
                    className="hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                    onClick={() => onNavigate('executions')}
                  >
                    <td className="py-3 px-4 text-[#1D1D1F]">
                      <span className="text-[#86868B] font-sans mr-2">{exec.module}</span>
                      <span className="text-[#1D1D1F] bg-[#F5F5F7] px-2 py-0.5 rounded border border-[#E5E5E7]">
                        {exec.command}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-[#E6F6EC] text-[#00A651]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
                          COMPLETED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-[#FDF2F2] text-[#E02424]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E02424]" />
                          FAILED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
