import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Loader2 } from 'lucide-react';

interface MonacoOrFallbackEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  darkMode?: boolean;
  readOnly?: boolean;
  minHeight?: string;
}

export const MonacoOrFallbackEditor: React.FC<MonacoOrFallbackEditorProps> = ({
  value,
  onChange,
  language = 'python',
  darkMode = true,
  readOnly = false,
  minHeight = '380px',
}) => {
  const [monacoLoaded, setMonacoLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Line count for fallback editor
  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 12) }, (_, i) => i + 1);

  if (hasError) {
    // Graceful fallback editor with syntax-styled typography and line numbers
    return (
      <div 
        className="w-full flex font-mono text-xs rounded-xl overflow-hidden border border-[#2D2D30] bg-[#1E1E1E] text-[#D4D4D4]"
        style={{ minHeight }}
      >
        <div className="bg-[#252526] text-[#858585] select-none py-3 px-2 text-right border-r border-[#2D2D30] text-[11px] leading-relaxed">
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          className="flex-1 bg-transparent text-[#9CDCFE] p-3 outline-none resize-none font-mono text-xs leading-relaxed whitespace-pre"
        />
      </div>
    );
  }

  return (
    <div 
      className="relative w-full rounded-xl overflow-hidden border border-[#E5E5E7] dark:border-[#2D2D30] shadow-xs"
      style={{ minHeight }}
    >
      <Editor
        height={minHeight}
        language={language}
        value={value}
        theme={darkMode ? 'vs-dark' : 'light'}
        onChange={(val) => onChange(val || '')}
        onMount={() => setMonacoLoaded(true)}
        loading={
          <div className="flex flex-col items-center justify-center h-full min-h-[380px] bg-[#1E1E1E] text-white/70 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#0066FF]" />
            <span className="text-xs font-mono">Initializing Microsoft Monaco Editor...</span>
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'on',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace",
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};
