import React from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Code2, 
  RotateCcw, 
  Cpu, 
  Sparkles, 
  ShieldAlert, 
  Layers,
  FileCode
} from 'lucide-react';
import { PLUGIN_TEMPLATES } from '../data/templates';
import type { PluginTemplate } from '../types';

interface EditorPanelProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  onExecute: () => void;
  onCompile: () => void;
  onSelectTemplate: (tpl: PluginTemplate) => void;
  selectedTemplateId: string;
  isExecuting: boolean;
  isCompiling: boolean;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  code,
  onChangeCode,
  onExecute,
  onCompile,
  onSelectTemplate,
  selectedTemplateId,
  isExecuting,
  isCompiling
}) => {
  // Handle keyboard shortcut Ctrl+Enter or Cmd+Enter to execute
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExecute]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tpl = PLUGIN_TEMPLATES.find(t => t.id === e.target.value);
    if (tpl) {
      onSelectTemplate(tpl);
    }
  };

  const currentTemplate = PLUGIN_TEMPLATES.find(t => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      
      {/* Editor Header Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>plugin.py</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Python 3 (WASI Target)
            </span>
          </div>

          {/* Template dropdown */}
          <div className="relative">
            <select
              id="select-plugin-template"
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium py-1 pl-2.5 pr-7 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
            >
              <optgroup label="Enterprise Plugins & Data Parsers">
                {PLUGIN_TEMPLATES.filter(t => !t.isAuditAttempt).map(t => (
                  <option key={t.id} value={t.id}>
                    📦 {t.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🚨 Security Penetration Audits">
                {PLUGIN_TEMPLATES.filter(t => t.isAuditAttempt).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCompile}
            disabled={isCompiling || isExecuting}
            id="btn-compile-plugin"
            title="Compile Python to WASM binary without executing"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Cpu className={`w-3.5 h-3.5 text-indigo-400 ${isCompiling ? 'animate-spin' : ''}`} />
            <span>{isCompiling ? 'Compiling...' : 'Compile WAT'}</span>
          </button>

          <button
            onClick={onExecute}
            disabled={isExecuting}
            id="btn-run-wasm"
            title="Execute inside isolated WebAssembly sandbox (Ctrl+Enter)"
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/30 disabled:opacity-50 transition-all cursor-pointer transform active:scale-98"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-pulse' : ''}`} />
            <span>{isExecuting ? 'Executing in WASM...' : 'Run in Sandbox'}</span>
            <kbd className="hidden sm:inline-block ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-800/60 text-emerald-200 border border-emerald-700/50 font-mono">
              Ctrl+↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Template Description Banner (if audit attempt or special parser) */}
      {currentTemplate && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between gap-2 border-b ${
          currentTemplate.isAuditAttempt 
            ? 'bg-rose-950/30 border-rose-900/40 text-rose-300'
            : 'bg-indigo-950/20 border-indigo-900/30 text-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            {currentTemplate.isAuditAttempt ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="line-clamp-1">{currentTemplate.description}</span>
          </div>
          <button
            onClick={() => onChangeCode(currentTemplate.code)}
            id="btn-reset-template"
            title="Reset code to original template"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Monaco Code Editor */}
      <div className="flex-1 min-h-[320px] relative">
        <Editor
          height="100%"
          defaultLanguage="python"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => onChangeCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12, bottom: 12 },
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            suggestOnTriggerCharacters: true,
            renderLineHighlight: 'all',
          }}
        />
      </div>

    </div>
  );
};
