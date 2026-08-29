import React, { useState } from 'react';
import { 
  Terminal, 
  Code2, 
  ShieldAlert, 
  FileCheck, 
  Copy, 
  Check, 
  Clock, 
  Zap, 
  Layers,
  AlertTriangle,
  FileCode
} from 'lucide-react';
import type { ExecutionResult } from '../types';

interface OutputConsoleProps {
  result: ExecutionResult | null;
  watText?: string;
  isExecuting: boolean;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  result,
  watText,
  isExecuting
}) => {
  const [activeTab, setActiveTab] = useState<'stdout' | 'output' | 'traps' | 'wat'>('stdout');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasTraps = result?.traps && result.traps.length > 0;
  const isSuccess = result?.success;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      
      {/* Console Header Tabs */}
      <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          
          <button
            onClick={() => setActiveTab('stdout')}
            id="tab-console-stdout"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'stdout'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stdout / Logs</span>
            {result?.exitCode !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                result.exitCode === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                code {result.exitCode}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('output')}
            id="tab-console-output"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'output'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transformed Output</span>
            {result?.outputPayload && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('traps')}
            id="tab-console-traps"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'traps'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${hasTraps ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
            <span>WASI Traps</span>
            {hasTraps && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                {result?.traps.length} blocked
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('wat')}
            id="tab-console-wat"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'wat'
                ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>WASM / WAT</span>
          </button>

        </div>

        {/* Copy button */}
        <div className="flex items-center gap-2">
          {result?.metrics && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{result.metrics.executionTimeMs} ms</span>
            </div>
          )}
          <button
            onClick={() => {
              if (activeTab === 'stdout') handleCopy(`${result?.stdout || ''}\n${result?.stderr || ''}`);
              else if (activeTab === 'output') handleCopy(result?.outputPayload || '');
              else if (activeTab === 'traps') handleCopy(JSON.stringify(result?.traps || [], null, 2));
              else if (activeTab === 'wat') handleCopy(watText || result?.watDisassembly || '');
            }}
            id="btn-copy-console"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 p-4 bg-slate-950 font-mono text-xs overflow-y-auto leading-relaxed select-text">
        {isExecuting ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin"></div>
            <p className="text-xs">Executing inside isolated WebAssembly sandbox...</p>
          </div>
        ) : !result && !watText ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-center">
            <Terminal className="w-8 h-8 text-slate-700 mb-2" />
            <p className="font-sans font-medium text-slate-400">Sandbox Ready for Execution</p>
            <p className="text-[11px] text-slate-600 max-w-sm mt-1">
              Select a template or write custom Python code, then click "Run in Sandbox" (Ctrl+Enter).
            </p>
          </div>
        ) : (
          <>
            {/* Tab 1: STDOUT & STDERR */}
            {activeTab === 'stdout' && (
              <div className="space-y-3">
                {result?.stdout && (
                  <div>
                    <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Standard Output (stdout)</span>
                    </div>
                    <pre className="text-slate-200 whitespace-pre-wrap font-mono bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      {result.stdout}
                    </pre>
                  </div>
                )}

                {result?.stderr && (
                  <div>
                    <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Standard Error / Trap Warnings (stderr)</span>
                    </div>
                    <pre className="text-rose-200 whitespace-pre-wrap font-mono bg-rose-950/20 p-3 rounded-lg border border-rose-900/40">
                      {result.stderr}
                    </pre>
                  </div>
                )}

                {!result?.stdout && !result?.stderr && (
                  <p className="text-slate-500 italic">No output generated by plugin.</p>
                )}
              </div>
            )}

            {/* Tab 2: Transformed Output */}
            {activeTab === 'output' && (
              <div>
                {result?.outputPayload ? (
                  <div>
                    <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Sandbox Return Payload</span>
                    </div>
                    <pre className="text-emerald-300 whitespace-pre-wrap font-mono bg-emerald-950/10 p-3.5 rounded-lg border border-emerald-900/30 text-xs">
                      {result.outputPayload}
                    </pre>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500">
                    <p>No output payload returned.</p>
                    {hasTraps && (
                      <p className="text-rose-400 text-xs mt-2">
                        Plugin was halted due to security capability violations. Check the WASI Traps tab.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: WASI Traps Table */}
            {activeTab === 'traps' && (
              <div>
                <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Intercepted Syscall Violations</span>
                </div>

                {hasTraps ? (
                  <div className="space-y-3">
                    {result?.traps.map((trap, idx) => (
                      <div 
                        key={idx} 
                        className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3.5 text-xs text-rose-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            {trap.trapCode}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                            {trap.severity} SEVERITY
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-2.5 rounded border border-rose-950">
                          <div>
                            <span className="text-slate-400">Target Vector:</span>{' '}
                            <span className="text-white font-semibold">{trap.target}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Trapped Syscall:</span>{' '}
                            <span className="text-amber-300">{trap.syscall}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-400">Policy Reason:</span>{' '}
                            <span className="text-slate-200">{trap.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-emerald-400 bg-emerald-950/10 border border-emerald-900/30 rounded-lg">
                    <p className="font-semibold">Zero Security Violations</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No unauthorized syscalls or capability breaches were detected during execution.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: WebAssembly (WAT) Disassembly */}
            {activeTab === 'wat' && (
              <div>
                <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>WebAssembly Text Format (WAT) & Memory Topology</span>
                </div>
                <pre className="text-indigo-200 whitespace-pre font-mono bg-slate-900/80 p-3.5 rounded-lg border border-indigo-900/30 text-xs overflow-x-auto">
                  {watText || result?.watDisassembly || ';; No WAT compilation data available. Click "Compile WAT" to generate.'}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};
