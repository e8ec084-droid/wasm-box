import React, { useState } from 'react';
import { Database, FileJson, Check, Copy, Sparkles, RefreshCw } from 'lucide-react';

interface InputDataPanelProps {
  inputData: string;
  onChangeInputData: (val: string) => void;
}

export const InputDataPanel: React.FC<InputDataPanelProps> = ({
  inputData,
  onChangeInputData
}) => {
  const [copied, setCopied] = useState(false);
  const [isValidJson, setIsValidJson] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(inputData);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(inputData);
      onChangeInputData(JSON.stringify(parsed, null, 2));
      setIsValidJson(true);
    } catch {
      setIsValidJson(false);
      setTimeout(() => setIsValidJson(null), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      
      {/* Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-200">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Tenant Input Payload (stdin / raw_payload)</span>
        </div>

        <div className="flex items-center gap-2">
          {isValidJson === false && (
            <span className="text-[10px] text-rose-400 font-mono">Invalid JSON</span>
          )}
          <button
            onClick={handlePrettify}
            id="btn-prettify-json"
            title="Prettify JSON payload"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Format</span>
          </button>
          <button
            onClick={handleCopy}
            id="btn-copy-input"
            title="Copy payload"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Text Area */}
      <div className="flex-1 p-3 bg-slate-950/60 font-mono text-xs text-slate-200">
        <textarea
          id="textarea-tenant-input"
          value={inputData}
          onChange={(e) => onChangeInputData(e.target.value)}
          placeholder="Enter JSON, CSV, or raw text payload to pipe into the WASM sandbox..."
          spellCheck={false}
          className="w-full h-full bg-transparent border-0 resize-none focus:outline-none text-slate-200 placeholder-slate-600 font-mono leading-relaxed selection:bg-indigo-500/30"
        />
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950/80 px-3 py-1.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex justify-between items-center">
        <span>Encoding: UTF-8</span>
        <span>Size: {new Blob([inputData]).size} bytes</span>
      </div>

    </div>
  );
};
