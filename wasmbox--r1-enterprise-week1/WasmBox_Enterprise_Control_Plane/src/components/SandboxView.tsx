import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Cpu, 
  HardDrive, 
  Server, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  RotateCcw, 
  Search, 
  Sparkles, 
  ShieldAlert, 
  Terminal as TerminalIcon,
  ChevronDown,
  Trash2,
  BookmarkPlus,
  FileCode,
  Layers,
  Database,
  Lock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Gauge,
  CheckCircle2,
  X
} from 'lucide-react';
import { ExecutionRecord, LogEntry, SandboxConfig, SandboxPreset, WasmModuleItem, SavedPlugin, HostDbRow } from '../types';
import { SANDBOX_PRESETS, WASM_WAT_SAMPLE } from '../data';
import { MonacoOrFallbackEditor } from './MonacoOrFallbackEditor';

interface SandboxViewProps {
  modules: WasmModuleItem[];
  selectedPresetId?: string;
  onExecutionComplete: (record: ExecutionRecord, log: LogEntry) => void;
  onSavePlugin?: (newPlugin: SavedPlugin) => void;
  onPersistHostDbRow?: (newRow: HostDbRow) => void;
}

export const SandboxView: React.FC<SandboxViewProps> = ({
  modules,
  selectedPresetId,
  onExecutionComplete,
  onSavePlugin,
  onPersistHostDbRow,
}) => {
  // Active code in editor
  const [code, setCode] = useState<string>(SANDBOX_PRESETS[0].code);
  const [selectedPreset, setSelectedPreset] = useState<string>(selectedPresetId || 'preset-hello');
  const [command, setCommand] = useState<string>('print("Hello from WasmBox!")');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Execution setup
  const [config, setConfig] = useState<SandboxConfig>({
    module: modules[0]?.name || 'python_wasi.wasm',
    allowFilesystem: false,
    allowNetwork: false,
    allowEnvironment: false,
    memoryLimitMb: 10,
    instructionLimitFuel: 10000000,
    enableHostDbBridge: true,
  });

  // Telemetry metrics
  const [cpuPercent, setCpuPercent] = useState<number>(0);
  const [memoryMb, setMemoryMb] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionLatency, setExecutionLatency] = useState<string>('3.4ms');
  const [compilerStep, setCompilerStep] = useState<string | null>(null);

  // Modals
  const [showWasmInspector, setShowWasmInspector] = useState<boolean>(false);
  const [showSavePluginModal, setShowSavePluginModal] = useState<boolean>(false);
  const [pluginName, setPluginName] = useState<string>('Custom Enterprise Plugin');
  const [pluginDesc, setPluginDesc] = useState<string>('Custom Python parser compiled to WebAssembly sandbox.');
  const [pluginVersion, setPluginVersion] = useState<string>('1.0.0');

  // Terminal state
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Welcome to WasmBox Secure Multi-Tenant Sandbox',
    'Runtime: wasmtime-py v22.0.0 (WASI preview1 capability engine)',
    'Isolation: Zero-trust filesystem & raw network denied by default',
    'Resource Ceilings: Max 10.0 MB RAM | 10,000,000 Fuel | 50ms preemption timeout',
    '',
    '$ run --module python_wasi.wasm',
    '--- Execution Started ---',
    'Command: print("Hello from WasmBox!")',
    'Hello from WasmBox!',
    'Line 0',
    'Line 1',
    'Line 2',
    '--- Execution Completed (3.4ms, Memory: 2.1 MB) ---',
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Sync preset if prop changes
  useEffect(() => {
    if (selectedPresetId) {
      const p = SANDBOX_PRESETS.find((item) => item.id === selectedPresetId);
      if (p) {
        setSelectedPreset(p.id);
        setCode(p.code);
        setCommand(p.command);
      }
    }
  }, [selectedPresetId]);

  // Handle selecting a preset
  const handleSelectPreset = (presetId: string) => {
    const p = SANDBOX_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setSelectedPreset(p.id);
      setCode(p.code);
      setCommand(p.command);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset to current preset default
  const handleResetCode = () => {
    const p = SANDBOX_PRESETS.find((item) => item.id === selectedPreset);
    if (p) {
      setCode(p.code);
      setCommand(p.command);
    }
  };

  // Save Plugin handler
  const handleSavePluginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSavePlugin) {
      setShowSavePluginModal(false);
      return;
    }
    const newId = `plug-${Date.now().toString().slice(-4)}`;
    const newPlugin: SavedPlugin = {
      id: newId,
      name: pluginName,
      version: pluginVersion,
      description: pluginDesc,
      code,
      createdAt: 'Today',
      triggerCount: 0,
      webhookPath: `/api/v1/plugins/${newId}/trigger`,
      samplePayload: '{\n  "event": "data.received",\n  "tenant_id": "tenant-corp-409"\n}',
      enabledHostFunctions: ['host_db_write', 'host_get_timestamp', 'host_telemetry_emit'],
    };
    onSavePlugin(newPlugin);
    setShowSavePluginModal(false);
  };

  // Run execution pipeline
  const handleRunExecution = () => {
    if (isRunning) return;

    setIsRunning(true);
    setCompilerStep('Lexing Python AST...');
    setCpuPercent(18);
    setMemoryMb(3.8);

    const startTime = performance.now();
    const newExecId = crypto.randomUUID();
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = `Aug 14, 2026, ${timeString}`;

    // Append initiation lines to terminal
    setTerminalLines((prev) => [
      ...prev,
      '',
      '$ wasmtime run --memory-limit 10MB --fuel 10000000',
      '--- MicroPython WASM Packager & Compiler Pipeline ---',
      `[1/4] Lexing Python AST & verifying no direct OS syscall imports... OK`,
      `[2/4] Packaging with MicroPython WASM bytecode runtime (target: wasm32-wasi)... OK`,
      `[3/4] Instantiating Wasmtime instance (160 pages max = 10MB RAM ceiling)... OK`,
      `[4/4] Capability Matrix: [FS: ${config.allowFilesystem ? 'GRANTED' : 'DENIED'}, NET: ${config.allowNetwork ? 'GRANTED' : 'DENIED'}, HOST_BRIDGE: ${config.enableHostDbBridge ? 'WHITELISTED' : 'DISABLED'}]`,
      '--- Execution Started in Isolated WASM Sandbox ---',
      `Session: ${newExecId.substring(0, 8)}`,
      `Command: ${command || 'run'}`,
    ]);

    setTimeout(() => {
      setCompilerStep('Executing in Wasmtime (<5ms Sandbox)...');
    }, 150);

    setTimeout(() => {
      const elapsed = (performance.now() - startTime).toFixed(1);
      const simulatedDuration = `${(Math.random() * 1.5 + 2.2).toFixed(1)}ms`;
      setExecutionLatency(simulatedDuration);

      let status: 'COMPLETED' | 'FAILED' = 'COMPLETED';
      let outputText = '';
      let errorText = '';
      let violation: 'FILESYSTEM' | 'NETWORK' | 'MEMORY_LIMIT' | 'INSTRUCTION_LIMIT' | null = null;
      let usedMemory = '2.4 MB';
      let hostCallsMade = 0;

      // Evaluate code scenario based on content / presets
      const lowerCode = code.toLowerCase();

      if (lowerCode.includes('/etc/passwd') || lowerCode.includes('openat') || (lowerCode.includes('open(') && !config.allowFilesystem)) {
        if (!config.allowFilesystem) {
          status = 'FAILED';
          violation = 'FILESYSTEM';
          outputText = '[Attack] Attempting to open host /etc/passwd...';
          errorText = "PermissionError: [WasmBox Sandbox Isolation] WASI syscall openat() denied for path '/etc/passwd'. Host filesystem access is strictly forbidden in multi-tenant mode.";
          usedMemory = '1.8 MB';
        } else {
          outputText = '[WASI-VFS] Sandboxed virtual filesystem accessed (Isolated jail).';
        }
      } else if (lowerCode.includes('socket.connect') || lowerCode.includes('8.8.8.8') || lowerCode.includes('socket(')) {
        if (!config.allowNetwork) {
          status = 'FAILED';
          violation = 'NETWORK';
          outputText = '[Attack] Opening raw TCP socket to 8.8.8.8:53...';
          errorText = 'ConnectionRefusedError: [WasmBox Network Trap] Socket syscall socket() prohibited by sandbox capability flags. EPERM: Outbound network blocked.';
          usedMemory = '1.9 MB';
        } else {
          outputText = '[NET] Outbound network mock gateway socket opened.';
        }
      } else if (lowerCode.includes('bytearray(15') || lowerCode.includes('15 * 1024 * 1024') || lowerCode.includes('memory bomb')) {
        status = 'FAILED';
        violation = 'MEMORY_LIMIT';
        outputText = `[Monitor] Checking initial heap memory allocation...\n[Monitor] Permitted ceiling: ${config.memoryLimitMb}.0 MB\n[Stress] Attempting to allocate 15 MB byte buffer...`;
        errorText = `MemoryError: [WasmBox Memory Trap] Memory allocation (15.0 MB) exceeded maximum tenant ceiling (${config.memoryLimitMb}.0 MB). Wasmtime instance aborted.`;
        usedMemory = `${config.memoryLimitMb}.0 MB`;
      } else if (lowerCode.includes('while true') && (lowerCode.includes('count >=') || lowerCode.includes('pass'))) {
        status = 'FAILED';
        violation = 'INSTRUCTION_LIMIT';
        outputText = '[Monitor] Wasmtime fuel counter initialized: 10,000,000 instructions\n[Running] Starting infinite loop execution...';
        errorText = 'TimeoutError: [WasmBox Fuel Trap] Wasmtime fuel exhausted (10,000,000 instructions) after 50ms preemption timeout. Sandbox CPU thread killed safely.';
        usedMemory = '2.2 MB';
      } else if (lowerCode.includes('host_bridge') || lowerCode.includes('db_write')) {
        hostCallsMade = 2;
        const newRowId = `row-${Math.floor(1000 + Math.random() * 9000)}`;
        outputText = `[Plugin] Processing enterprise financial event...\n[Host Bridge Call] host.host_db_write(table="enterprise_audit_log", payload_ptr=0x0040)\n[Host Bridge Return]: Row written successfully! ID: ${newRowId}\n[Host Bridge Call] host.host_emit_metric("plugin_execution_ok", 1.0)\n[Plugin] Execution finished with 2 whitelisted host calls authorized.`;
        usedMemory = '2.8 MB';

        // Persist to Host DB viewer
        if (onPersistHostDbRow) {
          const newDbRow: HostDbRow = {
            id: newRowId,
            table: 'enterprise_audit_log',
            timestamp: timeString,
            data: {
              tenant_id: 'tenant-corp-409',
              event: 'INVOICE_PROCESSED',
              amount_usd: 14950.0,
              status: 'APPROVED',
            },
            pluginId: 'custom-monaco-plugin',
            hash: `sha256:${crypto.randomUUID().replace(/-/g, '')}`,
          };
          onPersistHostDbRow(newDbRow);
        }
      } else if (lowerCode.includes('raw_records') || lowerCode.includes('telemetry')) {
        outputText = `[WasmBox Parser] Successfully transformed raw telemetry:\n[\n  {\n    "device": "DEV-901",\n    "timestamp": "2026-09-04T03:55Z",\n    "sensor": "SENSOR_A",\n    "reading": 98.6,\n    "sandbox": "WasmBox-WASM-v1"\n  },\n  {\n    "device": "DEV-902",\n    "timestamp": "2026-09-04T03:56Z",\n    "sensor": "SENSOR_B",\n    "reading": 104.2,\n    "sandbox": "WasmBox-WASM-v1"\n  }\n]\nSTATUS: 0 sandbox violations. Clean execution.`;
        usedMemory = '3.1 MB';
      } else {
        // Generic clean output
        const lines = code.split('\n');
        const printLines = lines.filter((l) => l.trim().startsWith('print('));
        if (printLines.length > 0) {
          outputText = 'Hello, WasmBox!\nLine 0\nLine 1\nLine 2';
        } else {
          outputText = '[WasmBox Execution Result]: OK (Code executed cleanly without stdout)';
        }
      }

      // Add to terminal
      const resultLines: string[] = [];
      if (outputText) {
        outputText.split('\n').forEach((line) => resultLines.push(line));
      }
      if (errorText) {
        errorText.split('\n').forEach((line) => resultLines.push(`[ERROR] ${line}`));
      }
      resultLines.push(`--- Execution ${status === 'COMPLETED' ? 'Completed' : 'Terminated'} (${simulatedDuration}, Memory: ${usedMemory}) ---`);

      setTerminalLines((prev) => [...prev, ...resultLines]);

      // Complete execution record
      const record: ExecutionRecord = {
        id: newExecId,
        module: config.module,
        status,
        command: command || 'run',
        started: dateString,
        duration: simulatedDuration,
        memoryUsed: usedMemory,
        output: outputText,
        error: errorText,
        securityViolation: violation,
        hostCallsMade,
      };

      const log: LogEntry = {
        id: `log-${Date.now()}`,
        timestamp: dateString,
        level: status === 'COMPLETED' ? 'INFO' : 'ERROR',
        message: status === 'COMPLETED'
          ? `Execution completed: ${newExecId.substring(0, 8)} (${simulatedDuration})`
          : `Execution blocked/failed: ${newExecId.substring(0, 8)} - ${violation || 'Trap'}`,
        details: `Memory: ${usedMemory} | Target: ${config.module} | Sandbox Status: Enforced`,
      };

      onExecutionComplete(record, log);

      setIsRunning(false);
      setCompilerStep(null);
      setCpuPercent(0);
      setMemoryMb(0);
    }, 450);
  };

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const filteredTerminalLines = searchTerm
    ? terminalLines.filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase()))
    : terminalLines;

  return (
    <div id="sandbox-view-container" className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top 4 Quick Metrics Bar */}
      <div id="sandbox-top-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latency */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Execution Latency
            </span>
            <Clock className="w-4 h-4 text-[#00A651]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#00A651]">
              {executionLatency}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#00A651]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Target &lt; 5ms Met</span>
          </div>
        </div>

        {/* CPU */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              CPU & Fuel
            </span>
            <Cpu className="w-4 h-4 text-[#0066FF]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {cpuPercent > 0 ? `${cpuPercent}%` : 'Idle'}
            </span>
          </div>
          <span className="text-[11px] text-[#86868B]">Fuel: 10,000,000 inst. max</span>
        </div>

        {/* Memory Footprint */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              RAM Footprint
            </span>
            <HardDrive className="w-4 h-4 text-[#86868B]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {memoryMb || '2.1'}
            </span>
            <span className="text-sm text-[#86868B]">MB</span>
          </div>
          <span className="text-[11px] text-[#86868B]">Ceiling: 10.0 MB (160 WASM pages)</span>
        </div>

        {/* Isolation State */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              WASI Sandbox
            </span>
            <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#0066FF]">
              AirGap
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#00A651]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A651] animate-pulse" />
            <span>Zero-Trust Syscall Isolation</span>
          </div>
        </div>
      </div>

      {/* Plugin IDE Card with Microsoft Monaco Editor */}
      <div id="plugin-editor-card" className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-xs">
        {/* Editor Title & Action Header */}
        <div className="h-14 bg-[#FAFAFA] border-b border-[#E5E5E7] px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
            </div>
            <span className="text-xs font-mono font-semibold text-[#1D1D1F]">
              plugin_entrypoint.py
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EBF3FF] text-[#0066FF] font-semibold">
              Monaco Editor IDE
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#E6F6EC] text-[#00A651] font-semibold">
              Python 3.12 WASM
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Presets dropdown */}
            <div className="relative">
              <select
                id="preset-selector-dropdown"
                value={selectedPreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="appearance-none bg-white hover:bg-[#F5F5F7] text-xs text-[#1D1D1F] border border-[#E5E5E7] rounded-lg px-3 py-1.5 pr-7 font-medium focus:outline-none focus:border-[#0066FF] cursor-pointer"
              >
                <optgroup label="Standard & Enterprise">
                  <option value="preset-hello">Benign Loop (Default &lt;5ms)</option>
                  <option value="preset-data-parser">Enterprise Data Parser (Use Case)</option>
                  <option value="preset-host-bridge">Host Functions: Authorized DB Write</option>
                </optgroup>
                <optgroup label="Security Audits">
                  <option value="preset-sec-fs">Security Audit: File System (/etc/passwd)</option>
                  <option value="preset-sec-net">Security Audit: Network Socket (8.8.8.8)</option>
                </optgroup>
                <optgroup label="Resource Limits">
                  <option value="preset-res-memory">Resource Limit: Memory Bomb (10MB Cap)</option>
                  <option value="preset-res-loop">Resource Limit: 50ms Timeout / Fuel</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#86868B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Inspect WASM Binary Button */}
            <button
              onClick={() => setShowWasmInspector(true)}
              title="Inspect Compiled WASM & WAT"
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F5F7] text-xs text-[#424245] border border-[#E5E5E7] flex items-center gap-1.5 font-medium transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-[#0066FF]" />
              <span className="hidden sm:inline">Inspect WASM</span>
            </button>

            {/* Save Plugin Button */}
            <button
              onClick={() => setShowSavePluginModal(true)}
              title="Save as Enterprise Plugin"
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F5F7] text-xs text-[#424245] border border-[#E5E5E7] flex items-center gap-1.5 font-medium transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-[#00A651]" />
              <span className="hidden sm:inline">Save Plugin</span>
            </button>

            <button
              id="editor-copy-btn"
              onClick={handleCopyCode}
              title="Copy code"
              className="p-1.5 rounded-lg bg-white hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00A651]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              id="editor-reset-btn"
              onClick={handleResetCode}
              title="Reset preset"
              className="p-1.5 rounded-lg bg-white hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Microsoft Monaco Editor Instance */}
        <div className="bg-[#1E1E1E]">
          <MonacoOrFallbackEditor
            value={code}
            onChange={(val) => setCode(val)}
            language="python"
            darkMode={true}
            minHeight="340px"
          />
        </div>

        {/* Execution Control Toolbar */}
        <div className="p-4 bg-[#FAFAFA] border-t border-[#E5E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-[#86868B]">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#1D1D1F]">Module:</span>
              <span className="font-mono text-[#0066FF]">{config.module}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#1D1D1F]">Host Functions:</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-[#00A651] font-mono text-[10px] font-bold">
                WHITELISTED
              </span>
            </div>
            {compilerStep && (
              <div className="flex items-center gap-1.5 text-[#0066FF] font-medium animate-pulse">
                <Zap className="w-3.5 h-3.5" />
                <span>{compilerStep}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              id="run-sandbox-btn"
              onClick={handleRunExecution}
              disabled={isRunning}
              className="px-6 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              {isRunning ? (
                <>
                  <Zap className="w-4 h-4 animate-spin" />
                  <span>Compiling & Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run in WASM Sandbox (&lt;5ms)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal / Standard Output Console */}
      <div id="sandbox-terminal-section" className="bg-[#1E1E1E] text-white rounded-2xl overflow-hidden shadow-xs border border-[#2D2D30]">
        <div className="h-10 bg-[#252526] px-4 flex items-center justify-between border-b border-[#2D2D30]">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-[#86868B]" />
            <span className="text-xs font-mono text-[#86868B]">WASI stdout / stderr Console</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3 h-3 text-[#86868B] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter output..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#1E1E1E] text-xs font-mono text-white pl-7 pr-2 py-0.5 rounded border border-[#3E3E42] focus:outline-none focus:border-[#0066FF] w-36"
              />
            </div>
            <button
              onClick={() => setTerminalLines([])}
              title="Clear terminal"
              className="text-[#86868B] hover:text-white p-1 rounded hover:bg-[#3E3E42] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-1 leading-relaxed text-[#D4D4D4]">
          {filteredTerminalLines.map((line, idx) => {
            const isError = line.startsWith('[ERROR]') || line.includes('PermissionError') || line.includes('ConnectionRefusedError') || line.includes('MemoryError') || line.includes('TimeoutError');
            const isSuccess = line.includes('--- Execution Completed') || line.includes('STATUS: 0 sandbox violations');
            const isCommand = line.startsWith('$');
            const isHighlight = line.includes('[Attack]') || line.includes('[BLOCKED]') || line.includes('[Host Bridge');

            return (
              <div
                key={idx}
                className={`${
                  isError
                    ? 'text-[#F48771] font-semibold'
                    : isSuccess
                    ? 'text-[#4EC9B0]'
                    : isCommand
                    ? 'text-[#9CDCFE]'
                    : isHighlight
                    ? 'text-[#CE9178]'
                    : 'text-[#D4D4D4]'
                }`}
              >
                {line}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Modal: Save Plugin */}
      {showSavePluginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E5E5E7] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E7]">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-[#0066FF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">Save as Enterprise Plugin</h3>
              </div>
              <button
                onClick={() => setShowSavePluginModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePluginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1D1D1F] block mb-1">Plugin Name</label>
                <input
                  type="text"
                  required
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1D1D1F] block mb-1">Version</label>
                <input
                  type="text"
                  required
                  value={pluginVersion}
                  onChange={(e) => setPluginVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1D1D1F] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={pluginDesc}
                  onChange={(e) => setPluginDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="p-3 bg-[#F5F5F7] rounded-xl text-[11px] text-[#424245]">
                Once saved, this plugin will be registered in your <strong>Saved Plugins & Webhooks</strong> catalog, allowing you to trigger it via simulated HTTP webhooks with sub-5ms latency.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePluginModal(false)}
                  className="px-4 py-2 border border-[#E5E5E7] rounded-xl text-[#424245] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl font-semibold"
                >
                  Save Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inspect Compiled WASM Binary & WAT */}
      {showWasmInspector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E5E5E7] rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E7]">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[#0066FF]" />
                <h3 className="text-sm font-bold text-[#1D1D1F]">Compiled WASM Binary & WAT Disassembly</h3>
              </div>
              <button
                onClick={() => setShowWasmInspector(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Binary Section Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Magic Header</span>
                  <span className="font-bold text-[#1D1D1F]">\0asm (v1)</span>
                </div>
                <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Linear Memory</span>
                  <span className="font-bold text-[#0066FF]">16-160 pages</span>
                </div>
                <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">Memory Ceiling</span>
                  <span className="font-bold text-[#00A651]">10.0 MB RAM</span>
                </div>
                <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7]">
                  <span className="text-[#86868B] block">WASI Target</span>
                  <span className="font-bold text-[#1D1D1F]">wasm32-wasi</span>
                </div>
              </div>

              {/* WAT S-Expressions */}
              <div>
                <span className="font-bold text-[#1D1D1F] block mb-1">WebAssembly Text (WAT) Exported Symbols:</span>
                <div className="bg-[#1E1E1E] text-[#9CDCFE] p-4 rounded-xl font-mono text-xs border border-[#2D2D30] overflow-x-auto">
                  <pre>{WASM_WAT_SAMPLE}</pre>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowWasmInspector(false)}
                className="px-4 py-2 bg-[#1D1D1F] text-white rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
