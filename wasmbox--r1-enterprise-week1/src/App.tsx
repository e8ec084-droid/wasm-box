import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TenantSelector } from './components/TenantSelector';
import { EditorPanel } from './components/EditorPanel';
import { InputDataPanel } from './components/InputDataPanel';
import { OutputConsole } from './components/OutputConsole';
import { TelemetryPanel } from './components/TelemetryPanel';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { BenchmarkModal } from './components/BenchmarkModal';
import { PLUGIN_TEMPLATES } from './data/templates';
import type { Tenant, ExecutionResult, PluginTemplate, AuditSuiteItem } from './types';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant>({
    id: 'ten_acme_prod',
    name: 'Acme Corp (Global ERP)',
    tier: 'Enterprise',
    maxMemoryMB: 10,
    fuelLimit: 50000,
    timeoutMs: 50,
    allowedImports: ['json', 'math', 're', 'datetime']
  });

  const [memoryCapMB, setMemoryCapMB] = useState(10);
  const [fuelLimit, setFuelLimit] = useState(50000);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(PLUGIN_TEMPLATES[0].id);
  const [code, setCode] = useState<string>(PLUGIN_TEMPLATES[0].code);
  const [inputData, setInputData] = useState<string>(PLUGIN_TEMPLATES[0].defaultInput);

  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [watText, setWatText] = useState<string>('');

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  // Fetch tenants on mount
  useEffect(() => {
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        if (data.tenants && data.tenants.length > 0) {
          setTenants(data.tenants);
          setSelectedTenant(data.tenants[0]);
          setMemoryCapMB(data.tenants[0].maxMemoryMB);
          setFuelLimit(data.tenants[0].fuelLimit);
        }
      })
      .catch(err => console.error('Failed to load tenants:', err));
  }, []);

  // Handle template switch
  const handleSelectTemplate = (tpl: PluginTemplate) => {
    setSelectedTemplateId(tpl.id);
    setCode(tpl.code);
    setInputData(tpl.defaultInput);
    setExecutionResult(null);
  };

  // Compile to WAT
  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: selectedTemplateId })
      });
      const data = await res.json();
      if (data.watText) {
        setWatText(data.watText);
      }
    } catch (err) {
      console.error('Compilation failed:', err);
    } finally {
      setIsCompiling(false);
    }
  };

  // Execute in WASM Sandbox
  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          inputData,
          tenantId: selectedTenant.id,
          memoryCapMB,
          fuelLimit
        })
      });
      const data: ExecutionResult = await res.json();
      setExecutionResult(data);
      if (data.watDisassembly) {
        setWatText(data.watDisassembly);
      }
    } catch (err: any) {
      console.error('Execution failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Export & download .wasm file
  const handleDownloadWasm = async () => {
    try {
      const res = await fetch('/api/download-wasm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: selectedTemplateId })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplateId || 'plugin'}.wasm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Load audit exploit directly in editor
  const handleRunAuditInEditor = (item: AuditSuiteItem) => {
    setCode(item.code);
    setSelectedTemplateId(item.id);
    setInputData(JSON.stringify({ auditTest: item.name }, null, 2));
    setExecutionResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* Top Navigation & Status */}
      <Header
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenArch={() => setIsArchModalOpen(true)}
        onOpenBenchmark={() => setIsBenchmarkModalOpen(true)}
        onDownloadWasm={handleDownloadWasm}
        isExecuting={isExecuting}
      />

      {/* Multi-Tenant Control Strip */}
      <TenantSelector
        tenants={tenants.length > 0 ? tenants : [selectedTenant]}
        selectedTenant={selectedTenant}
        onSelectTenant={(t) => {
          setSelectedTenant(t);
          setMemoryCapMB(t.maxMemoryMB);
          setFuelLimit(t.fuelLimit);
        }}
        memoryCapMB={memoryCapMB}
        fuelLimit={fuelLimit}
        onChangeMemoryCap={setMemoryCapMB}
        onChangeFuelLimit={setFuelLimit}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
        
        {/* Real-time Telemetry Status Card */}
        <TelemetryPanel
          metrics={executionResult?.metrics}
          traps={executionResult?.traps}
          isExecuting={isExecuting}
        />

        {/* 2-Column Split: Editor + Input on Left, Output Console on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* Left Column: Monaco Editor & Input Payload */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="h-[420px]">
              <EditorPanel
                code={code}
                onChangeCode={setCode}
                onExecute={handleExecute}
                onCompile={handleCompile}
                onSelectTemplate={handleSelectTemplate}
                selectedTemplateId={selectedTemplateId}
                isExecuting={isExecuting}
                isCompiling={isCompiling}
              />
            </div>

            <div className="h-[210px]">
              <InputDataPanel
                inputData={inputData}
                onChangeInputData={setInputData}
              />
            </div>
          </div>

          {/* Right Column: Output Console & Security Traps */}
          <div className="lg:col-span-5 h-[646px]">
            <OutputConsole
              result={executionResult}
              watText={watText}
              isExecuting={isExecuting}
            />
          </div>

        </div>

      </main>

      {/* Security Penetration Audit Modal */}
      <SecurityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onRunAuditInEditor={handleRunAuditInEditor}
      />

      {/* Architecture Comparison Modal */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      {/* Benchmark & Stress Test Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        code={code}
        inputData={inputData}
      />

    </div>
  );
}
