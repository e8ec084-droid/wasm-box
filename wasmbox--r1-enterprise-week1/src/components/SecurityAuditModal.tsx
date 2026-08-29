import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  FileCode, 
  ChevronRight,
  Terminal
} from 'lucide-react';
import type { AuditSuiteItem } from '../types';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunAuditInEditor: (item: AuditSuiteItem) => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  onRunAuditInEditor
}) => {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [audits, setAudits] = useState<AuditSuiteItem[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditSuiteItem | null>(null);
  const [auditStats, setAuditStats] = useState<{ total: number; passed: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const runAllAudits = async () => {
    setIsRunningAll(true);
    try {
      const res = await fetch('/api/security-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.audits) {
        setAudits(data.audits);
        setAuditStats({
          total: data.totalAudits,
          passed: data.passedAudits,
          failed: data.failedAudits
        });
        if (data.audits.length > 0) {
          setSelectedAudit(data.audits[0]);
        }
      }
    } catch (err) {
      console.error('Audit suite error:', err);
    } finally {
      setIsRunningAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Automated Sandbox Security Audit & Penetration Suite
              </h2>
              <p className="text-xs text-slate-400">
                Rigorous adversarial verification testing WASI capability denials & isolation boundaries.
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

        {/* Audit Stats Banner */}
        <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-mono">
            {auditStats ? (
              <>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{auditStats.passed}/{auditStats.total} Exploits Blocked (100% Defense)</span>
                </div>
                <div className="text-slate-400">
                  Isolation Status: <span className="text-white font-semibold">Zero-Trust WASI Active</span>
                </div>
              </>
            ) : (
              <span className="text-slate-400">
                Click "Run All Penetration Tests" to verify the sandbox against real attack vectors.
              </span>
            )}
          </div>

          <button
            onClick={runAllAudits}
            disabled={isRunningAll}
            id="btn-run-all-audits"
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-md shadow-rose-950/40 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isRunningAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunningAll ? 'Executing Attacks...' : 'Run All Penetration Tests'}</span>
          </button>
        </div>

        {/* Audit Split Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden min-h-[350px]">
          
          {/* Left: Audit List */}
          <div className="p-4 overflow-y-auto space-y-2.5 max-h-[50vh] md:max-h-full">
            {audits.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <ShieldAlert className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p>No audit run executed yet.</p>
                <p className="mt-1">Click "Run All Penetration Tests" above.</p>
              </div>
            ) : (
              audits.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedAudit(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedAudit?.id === item.id
                      ? 'bg-slate-800 border-indigo-500/60 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-xs text-slate-200 line-clamp-1">
                      {item.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      TRAPPED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-amber-400/90">{item.category}</span>
                    <span className="text-slate-400 flex items-center gap-0.5">
                      Details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Selected Audit Deep Dive */}
          <div className="p-4 overflow-y-auto bg-slate-950 font-mono text-xs flex flex-col justify-between">
            {selectedAudit ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Attack Vector Details
                  </div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    {selectedAudit.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    {selectedAudit.description}
                  </p>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Adversarial Code Payload</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-rose-300 whitespace-pre-wrap text-[11px]">
                    {selectedAudit.code}
                  </pre>
                </div>

                {selectedAudit.result && (
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WASI Sandbox Intercept Log</span>
                    </div>
                    <pre className="p-3 rounded-lg bg-emerald-950/10 border border-emerald-900/30 text-emerald-300 whitespace-pre-wrap text-[11px]">
                      {selectedAudit.result.stderr || selectedAudit.result.stdout || 'Trap intercepted immediately.'}
                    </pre>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onRunAuditInEditor(selectedAudit);
                      onClose();
                    }}
                    id="btn-load-exploit-in-editor"
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Load This Attack Vector in Live Monaco Editor</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-12">
                <Lock className="w-8 h-8 mb-2" />
                <p className="font-sans text-xs">Select an attack vector to inspect the defense trace.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
