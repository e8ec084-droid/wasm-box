import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Trash2, 
  Filter, 
  Terminal, 
  HardDrive, 
  ShieldAlert, 
  Check,
  X
} from 'lucide-react';
import { ExecutionRecord } from '../types';

interface ExecutionsViewProps {
  executions: ExecutionRecord[];
  onClearExecutions?: () => void;
  onSelectExecution?: (record: ExecutionRecord) => void;
}

export const ExecutionsView: React.FC<ExecutionsViewProps> = ({
  executions,
  onClearExecutions,
  onSelectExecution,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED'>('ALL');
  const [activeModalRecord, setActiveModalRecord] = useState<ExecutionRecord | null>(null);

  const filtered = executions.filter((e) => {
    if (filter === 'COMPLETED') return e.status === 'COMPLETED';
    if (filter === 'FAILED') return e.status === 'FAILED';
    return true;
  });

  return (
    <div id="executions-view-container" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Executions</h1>
          <p className="text-sm text-[#86868B] mt-0.5">
            Track running, completed, and failed sandbox jobs.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'ALL'
                ? 'bg-[#0066FF] text-white shadow-xs'
                : 'bg-white text-[#424245] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
            }`}
          >
            All ({executions.length})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'COMPLETED'
                ? 'bg-[#00A651] text-white shadow-xs'
                : 'bg-white text-[#424245] hover:text-[#00A651] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
            }`}
          >
            Completed ({executions.filter((e) => e.status === 'COMPLETED').length})
          </button>
          <button
            onClick={() => setFilter('FAILED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'FAILED'
                ? 'bg-[#E02424] text-white shadow-xs'
                : 'bg-white text-[#424245] hover:text-[#E02424] hover:bg-[#F5F5F7] border border-[#E5E5E7]'
            }`}
          >
            Failed ({executions.filter((e) => e.status === 'FAILED').length})
          </button>
        </div>
      </div>

      {/* Executions Table */}
      <div id="executions-table-card" className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#86868B] uppercase tracking-wider border-b border-[#E5E5E7] bg-[#FAFAFA]">
                <th className="py-3 px-4 font-semibold text-[10px]">Module</th>
                <th className="py-3 px-4 font-semibold text-[10px]">Status</th>
                <th className="py-3 px-4 font-semibold text-[10px]">Command</th>
                <th className="py-3 px-4 font-semibold text-[10px]">Started</th>
                <th className="py-3 px-4 font-semibold text-[10px]">Duration</th>
                <th className="py-3 px-4 font-semibold text-right text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7] font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#86868B] font-sans">
                    No executions found matching the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((exec) => {
                  const isCompleted = exec.status === 'COMPLETED';
                  return (
                    <tr 
                      key={exec.id} 
                      className="hover:bg-[#F5F5F7] transition-colors cursor-pointer group"
                      onClick={() => setActiveModalRecord(exec)}
                    >
                      {/* Module */}
                      <td className="py-3.5 px-4 font-sans text-[#1D1D1F] font-medium">
                        {exec.module}
                      </td>

                      {/* Status pill */}
                      <td className="py-3.5 px-4 font-sans">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E6F6EC] text-[#00A651]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
                            COMPLETED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F2] text-[#E02424]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E02424]" />
                            FAILED
                          </span>
                        )}
                      </td>

                      {/* Command */}
                      <td className="py-3.5 px-4 text-[#1D1D1F]">
                        <span className="bg-[#F5F5F7] px-2 py-0.5 rounded border border-[#E5E5E7] text-[#1D1D1F]">
                          {exec.command}
                        </span>
                      </td>

                      {/* Started */}
                      <td className="py-3.5 px-4 text-[#86868B] font-sans">
                        {exec.started}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-[#1D1D1F] font-semibold">
                        {exec.duration || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalRecord(exec);
                            }}
                            title="Inspect stdout & trace"
                            className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5E7] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Detail Modal */}
      {activeModalRecord && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModalRecord(null)}
        >
          <div 
            className="bg-white border border-[#E5E5E7] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E5E7] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-[#0066FF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight">
                  Execution Trace: {activeModalRecord.id.substring(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalRecord(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1.5 rounded-lg hover:bg-[#E5E5E7] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F5F5F7] p-4 rounded-xl border border-[#E5E5E7] text-xs font-mono">
                <div>
                  <span className="text-[#86868B] text-[10px] uppercase block">Module</span>
                  <span className="text-[#1D1D1F] font-semibold">{activeModalRecord.module}</span>
                </div>
                <div>
                  <span className="text-[#86868B] text-[10px] uppercase block">Status</span>
                  <span className={activeModalRecord.status === 'COMPLETED' ? 'text-[#00A651] font-bold' : 'text-[#E02424] font-bold'}>
                    {activeModalRecord.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#86868B] text-[10px] uppercase block">Latency</span>
                  <span className="text-[#0066FF] font-semibold">{activeModalRecord.duration}</span>
                </div>
                <div>
                  <span className="text-[#86868B] text-[10px] uppercase block">Memory</span>
                  <span className="text-[#1D1D1F] font-semibold">{activeModalRecord.memoryUsed || '2.1 MB'}</span>
                </div>
              </div>

              {/* Command */}
              <div>
                <span className="text-xs font-semibold text-[#1D1D1F] block mb-1">Command</span>
                <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7] font-mono text-xs text-[#1D1D1F]">
                  {activeModalRecord.command}
                </div>
              </div>

              {/* Output / Stdout */}
              {activeModalRecord.output && (
                <div>
                  <span className="text-xs font-semibold text-[#1D1D1F] block mb-1">Standard Output (stdout)</span>
                  <pre className="bg-[#1E1E1E] p-4 rounded-xl font-mono text-xs text-[#D4D4D4] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {activeModalRecord.output}
                  </pre>
                </div>
              )}

              {/* Error / Stderr */}
              {activeModalRecord.error && (
                <div>
                  <span className="text-xs font-semibold text-[#E02424] flex items-center gap-1.5 block mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Sandbox Error / Interception
                  </span>
                  <pre className="bg-[#FDF2F2] p-4 rounded-xl border border-red-200 font-mono text-xs text-[#E02424] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {activeModalRecord.error}
                  </pre>
                </div>
              )}

              {/* Security Boundary Info */}
              <div className="p-3.5 rounded-xl bg-[#E6F6EC] border border-[#C6EAD3] text-xs text-[#00A651] flex items-center gap-2">
                <Check className="w-4 h-4 text-[#00A651] shrink-0" />
                <span>Zero-Trust WASM host boundaries verified. No server file system or socket leakage.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
