import React, { useState, useRef } from 'react';
import { UploadCloud, FileCode2, CheckCircle2, Shield, Trash2, Check } from 'lucide-react';
import { WasmModuleItem } from '../types';

interface UploadViewProps {
  modules: WasmModuleItem[];
  onUploadModule: (newModule: WasmModuleItem) => void;
  onDeleteModule: (id: string) => void;
  showToast: (msg: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  modules,
  onUploadModule,
  onDeleteModule,
  showToast,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    const isWasm = file.name.endsWith('.wasm') || file.name.endsWith('.wasm32');
    const fileName = isWasm ? file.name : `${file.name.replace(/\.[^/.]+$/, '')}.wasm`;
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newModule: WasmModuleItem = {
      id: `mod-${Date.now()}`,
      name: fileName,
      size: `${Math.max(Number(fileSizeMb), 2.4)} MB`,
      uploadedAt: `${dateStr}, ${timeStr}`,
      version: 'v1.0.0-wasi',
      description: 'Validated WebAssembly binary with WASI system-call capability virtualization.',
    };

    onUploadModule(newModule);
    showToast(`Module "${fileName}" uploaded`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div id="upload-view-container" className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Module Upload</h1>
        <p className="text-sm text-[#86868B] mt-0.5">
          Validate and stage WebAssembly modules before execution.
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        id="wasm-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all bg-white shadow-xs ${
          isDragging
            ? 'border-[#0066FF] bg-blue-50/50'
            : 'border-[#E5E5E7] hover:border-[#0066FF]/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="p-4 rounded-full bg-[#F5F5F7] text-[#1D1D1F] mb-4">
            <UploadCloud className="w-8 h-8 text-[#0066FF]" />
          </div>

          <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight">
            Upload WASM Module
          </h3>
          <p className="text-xs text-[#86868B] mt-1.5 mb-6">
            Drop a <code className="text-[#0066FF] bg-[#F5F5F7] px-1.5 py-0.5 rounded font-mono border border-[#E5E5E7]">.wasm</code> file here or choose one from your machine.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".wasm"
            className="hidden"
          />

          <button
            id="choose-wasm-file-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Choose File</span>
          </button>
        </div>
      </div>

      {/* Uploaded Modules Table */}
      <div id="uploaded-modules-card" className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
          Uploaded Modules ({modules.length})
        </h2>

        <div className="space-y-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className="bg-white border border-[#E5E5E7] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#0066FF]/40 shadow-xs transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-[#F5F5F7] text-[#0066FF] border border-[#E5E5E7]">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#1D1D1F]">
                      {module.name}
                    </span>
                    {module.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-[#E6F6EC] text-[#00A651]">
                        Default Runtime
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    {module.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 self-end sm:self-auto">
                <span className="text-xs font-mono text-[#1D1D1F] font-medium">
                  {module.size}
                </span>
                <span className="text-xs font-mono text-[#86868B]">
                  {module.uploadedAt}
                </span>
                {!module.isDefault && (
                  <button
                    onClick={() => onDeleteModule(module.id)}
                    title="Delete module"
                    className="text-[#86868B] hover:text-[#E02424] p-1.5 rounded-lg hover:bg-[#FDF2F2] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
