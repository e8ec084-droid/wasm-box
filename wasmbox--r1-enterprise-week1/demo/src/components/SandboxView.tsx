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
  Trash2
} from 'lucide-react';
import { ExecutionRecord, LogEntry, SandboxConfig, SandboxPreset, WasmModuleItem } from '../types';
import { SANDBOX_PRESETS } from '../data';

interface SandboxViewProps {
  modules: WasmModuleItem[];
  selectedPresetId?: string;
  onExecutionComplete: (record: ExecutionRecord, log: LogEntry) => void;
}

export const SandboxView: React.FC<SandboxViewProps> = ({
  modules,
  selectedPresetId,
  onExecutionComplete,
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
  });

  // Telemetry metrics
  const [cpuPercent, setCpuPercent] = useState<number>(0);
  const [memoryMb, setMemoryMb] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionLatency, setExecutionLatency] = useState<string>('75.63ms');

  // Terminal state
  const [sessionId] = useState<string>('821c9083-cf21-4677-8fef-0243013c0b74');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Welcome to WasmBox Sandbox',
    'Select a module and press Run to start execution',
    '',
    '$',
    '--- Execution Started ---',
    'Command: print("Hello from WasmBox!")',
    'Module: python_wasi.wasm',
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

  // Run execution pipeline
  const handleRunExecution = () => {
    if (isRunning) return;

    setIsRunning(true);
    setCpuPercent(12);
    setMemoryMb(4);

    const startTime = performance.now();
    const newExecId = crypto.randomUUID();
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = `Aug 14, 2026, ${timeString}`;

    // Append initiation lines to terminal
    setTerminalLines((prev) => [
      ...prev,
      '',
      '$',
      '--- Execution Started ---',
      `Session: ${newExecId.substring(0, 8)}`,
      `Command: ${command || 'run'}` ,
      `Module: ${config.module}`,
      `Compiler: MicroPython WASM Packager (Target: wasm32-wasi)`,
      `Capabilities: [FS: ${config.allowFilesystem ? 'GRANTED' : 'DENIED'}, NET: ${config.allowNetwork ? 'GRANTED' : 'DENIED'}]`,
    ]);

    // Simulate Wasmtime compilation & sub-5ms sandbox execution
    setTimeout(() => {
      const elapsed = (performance.now() - startTime).toFixed(1);
      const simulatedDuration = `${(Math.random() * 2 + 2.5).toFixed(1)}ms`;
      setExecutionLatency(`${elapsed}ms`);

      let status: 'COMPLETED' | 'FAILED' = 'COMPLETED';
      let outputText = '';
      let errorText = '';
      let violation: 'FILESYSTEM' | 'NETWORK' | 'MEMORY_LIMIT' | 'INSTRUCTION_LIMIT' | null = null;
      let usedMemory = '2.4 MB';

      // Evaluate code scenario based on content / presets
      const lowerCode = code.toLowerCase();

      if (lowerCode.includes('/etc/passwd') || lowerCode.includes('openat') || (lowerCode.includes('open(') && !config.allowFilesystem)) {
        if (!config.allowFilesystem) {
          status = 'FAILED';
          violation = 'FILESYSTEM';
          outputText = '[Attack] Attempting to open host /etc/passwd...';
          errorText = 'PermissionError: [WasmBox Sandbox Isolation] WASI syscall openat() denied for path \'/etc/passwd\'. Host filesystem access is strictly forbidden in multi-tenant mode.';
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
      } else if (lowerCode.includes('while true') && lowerCode.includes('count >=')) {
        status = 'FAILED';
        violation = 'INSTRUCTION_LIMIT';
        outputText = '[Monitor] Wasmtime fuel counter initialized: 10,000,000 instructions\n[Running] Starting infinite loop execution...';
        errorText = 'TimeoutError: [WasmBox Fuel Trap] Wasmtime fuel exhausted (10,000,000 instructions). Sandbox CPU thread killed safely.';
        usedMemory = '2.2 MB';
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
      {/* Top 3 Quick Metrics Bar matching Clean Minimalism design */}
      <div id="sandbox-top-metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              CPU Usage
            </span>
            <Cpu className="w-4 h-4 text-[#0066FF]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {cpuPercent}
            </span>
            <span className="text-sm text-[#86868B]">%</span>
          </div>
          <span className="text-[11px] text-[#86868B]">Sandbox process throttle: active</span>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Mem Footprint
            </span>
            <HardDrive className="w-4 h-4 text-[#86868B]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#1D1D1F]">
              {memoryMb || '0.84'}
            </span>
            <span className="text-sm text-[#86868B]">MB</span>
          </div>
          <span className="text-[11px] text-[#86868B]">Strict cap: 10.0 MB RAM</span>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Sandbox State
            </span>
            <Server className="w-4 h-4 text-[#00A651]" />
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-light tracking-tighter text-[#0066FF]">
              Air
            </span>
            <span className="text-sm font-light text-[#0066FF]">Gap</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#00A651]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A651] animate-pulse" />
            <span>Zero-Trust WASI Isolation</span>
          </div>
        </div>
      </div>

      {/* Plugin Editor Card */}
      <div id="plugin-editor-card" className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-xs">
        {/* Editor Title & Run Header */}
        <div className="h-12 bg-[#FAFAFA] border-b border-[#E5E5E7] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
            </div>
            <span className="text-[11px] font-mono text-[#86868B]">
              security_audit_pipeline.py
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E6F6EC] text-[#00A651] font-semibold">
              Python 3.12 WASM
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Presets dropdown */}
            <div className="relative">
              <select
                id="preset-selector-dropdown"
                value={selectedPreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="appearance-none bg-white hover:bg-[#F5F5F7] text-xs text-[#1D1D1F] border border-[#E5E5E7] rounded-lg px-3 py-1.5 pr-7 font-medium focus:outline-none focus:border-[#0066FF] cursor-pointer"
              >
                <optgroup label="Standard & Enterprise">
                  <option value="preset-hello">Benign Loop (Default)</option>
                  <option value="preset-data-parser">Enterprise Data Parser (Use Case)</option>
                </optgroup>
                <optgroup label="Security Audits">
                  <option value="preset-sec-fs">Security Audit: File System (/etc/passwd)</option>
                  <option value="preset-sec-net">Security Audit: Network Socket (8.8.8.8)</option>
                </optgroup>
                <optgroup label="Resource Limits">
                  <option value="preset-res-memory">Resource Limit: Memory Bomb (10MB Cap)</option>
                  <option value="preset-res-loop">Resource Limit: Fuel / Infinite Loop</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#86868B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

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

        {/* Monaco-Style Dark Code Editor Window */}
        <div className="relative bg-[#1E1E1E] flex min-h-[220px] font-mono text-xs leading-relaxed text-[#D4D4D4]">
          {/* Line Numbers Column */}
          <div className="w-12 py-3 select-none text-right pr-3 text-[#86868B] bg-[#1E1E1E] border-r border-[#2D2D2D] font-mono text-xs opacity-60">
            {code.split('\n').map((_, index) => (
              <div key={index} className="h-6 leading-6">
                {index + 1}
              </div>
            ))}
          </div>

          {/* Code Textarea */}
          <div className="relative flex-1 p-3">
            <textarea
              id="code-editor-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full min-h-[200px] bg-transparent text-[#D4D4D4] font-mono text-xs leading-6 resize-none focus:outline-none selection:bg-[#0066FF]/40"
              placeholder="Write custom Python plugin code here..."
            />
          </div>
        </div>

        {/* Editor Bottom Bar matching Clean Minimalism design */}
        <div className="h-14 bg-white border-t border-[#E5E5E7] flex items-center px-6 justify-between">
          <div className="flex items-center gap-4 text-[11px] text-[#86868B] font-mono">
            <span>Latency: <strong className="text-[#00A651] font-semibold">{executionLatency}</strong></span>
            <span className="hidden sm:inline text-[#E5E5E7]">|</span>
            <span className="hidden sm:inline">Budget: &lt; 5.0ms (Wasmtime sandbox)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetCode}
              className="px-4 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5E7] text-[#1D1D1F] rounded-lg text-xs font-semibold border border-[#E5E5E7] transition-colors"
            >
              Reset
            </button>
            <button
              id="sandbox-run-btn"
              onClick={handleRunExecution}
              disabled={isRunning}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-xs ${
                isRunning 
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-[#0066FF] hover:bg-[#0052CC] text-white'
              }`}
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Compiling & Running...' : 'Run Audit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Split Bottom Section: Execution Setup & Sandbox Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Execution Setup (5 cols) */}
        <div id="execution-setup-pane" className="lg:col-span-5 bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight">Execution Setup</h3>
            <p className="text-[11px] text-[#86868B] mt-0.5 leading-normal">
              Configure WASI capabilities and multi-tenant resource limits.
            </p>
          </div>

          {/* Module Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold block">
              Module Target
            </label>
            <div className="relative">
              <select
                id="setup-module-select"
                value={config.module}
                onChange={(e) => setConfig({ ...config, module: e.target.value })}
                className="w-full bg-[#F5F5F7] text-xs text-[#1D1D1F] border border-[#E5E5E7] rounded-lg px-3 py-2.5 font-mono appearance-none focus:outline-none focus:border-[#0066FF]"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.size})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#86868B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Sandbox Capabilities Checkboxes */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold block">
              Sandbox Permissions
            </span>
            <div className="space-y-2">
              <label 
                id="checkbox-label-filesystem"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] cursor-pointer hover:bg-[#E5E5E7]/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.allowFilesystem}
                  onChange={(e) => setConfig({ ...config, allowFilesystem: e.target.checked })}
                  className="hidden"
                />
                {config.allowFilesystem ? (
                  <CheckSquare className="w-4 h-4 text-[#0066FF] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#86868B] shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-[#1D1D1F]">filesystem</span>
                  <span className="text-[11px] text-[#86868B]">
                    {config.allowFilesystem ? 'WASI virtual jail mounted' : 'Denied (/etc/passwd, host paths blocked)'}
                  </span>
                </div>
              </label>

              <label 
                id="checkbox-label-network"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] cursor-pointer hover:bg-[#E5E5E7]/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.allowNetwork}
                  onChange={(e) => setConfig({ ...config, allowNetwork: e.target.checked })}
                  className="hidden"
                />
                {config.allowNetwork ? (
                  <CheckSquare className="w-4 h-4 text-[#0066FF] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#86868B] shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-[#1D1D1F]">network</span>
                  <span className="text-[11px] text-[#86868B]">
                    {config.allowNetwork ? 'Loopback proxy permitted' : 'Denied (TCP/UDP socket syscalls intercepted)'}
                  </span>
                </div>
              </label>

              <label 
                id="checkbox-label-environment"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] cursor-pointer hover:bg-[#E5E5E7]/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.allowEnvironment}
                  onChange={(e) => setConfig({ ...config, allowEnvironment: e.target.checked })}
                  className="hidden"
                />
                {config.allowEnvironment ? (
                  <CheckSquare className="w-4 h-4 text-[#0066FF] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#86868B] shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-[#1D1D1F]">environment</span>
                  <span className="text-[11px] text-[#86868B]">
                    {config.allowEnvironment ? 'Tenant env vars mapped' : 'Isolated clean env (0 host leaks)'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Resource Constraints Info */}
          <div className="pt-3 border-t border-[#E5E5E7] text-[11px] text-[#86868B] space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Wasmtime Memory Cap:</span>
              <span className="text-[#1D1D1F] font-bold">{config.memoryLimitMb} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Instruction Fuel Quota:</span>
              <span className="text-[#1D1D1F] font-bold">{config.instructionLimitFuel.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Right: Sandbox Terminal (7 cols) */}
        <div id="sandbox-terminal-pane" className="lg:col-span-7 bg-white border border-[#E5E5E7] rounded-2xl flex flex-col overflow-hidden shadow-xs">
          {/* Terminal Title & Controls */}
          <div className="p-4 border-b border-[#E5E5E7] bg-[#FAFAFA] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight">Sandbox Terminal</h3>
                <p className="text-[11px] text-[#86868B]">
                  Run the selected WASM module with controlled permissions.
                </p>
              </div>

              <button
                onClick={() => setTerminalLines(['$ Terminal reset.'])}
                title="Clear terminal"
                className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5E7] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Command Input & Search Bar Row */}
            <div className="flex items-center gap-2">
              <input
                id="terminal-command-input"
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='print("Hello from WasmBox!")'
                className="flex-1 bg-white border border-[#E5E5E7] rounded-lg px-3 py-1.5 text-xs text-[#1D1D1F] font-mono focus:outline-none focus:border-[#0066FF]"
              />
              <div className="relative w-36 sm:w-44">
                <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="terminal-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-white border border-[#E5E5E7] rounded-lg pl-8 pr-2 py-1.5 text-xs text-[#1D1D1F] font-mono focus:outline-none focus:border-[#0066FF]"
                />
              </div>
              <button
                id="terminal-run-btn"
                onClick={handleRunExecution}
                disabled={isRunning}
                className="px-3.5 py-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </button>
            </div>
          </div>

          {/* Session Header Status */}
          <div className="px-4 py-2 bg-[#F5F5F7] border-b border-[#E5E5E7] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-[#86868B]">
              <TerminalIcon className="w-3.5 h-3.5 text-[#86868B]" />
              <span className="text-[11px] truncate max-w-[200px] sm:max-w-none">{sessionId}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#00A651] font-sans font-medium">
              <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
              <span>Connected</span>
            </div>
          </div>

          {/* Terminal Logs Output */}
          <div className="flex-1 bg-[#1E1E1E] p-4 font-mono text-xs text-[#D4D4D4] overflow-y-auto max-h-[260px] min-h-[220px] space-y-1 select-text">
            {filteredTerminalLines.map((line, idx) => {
              if (line.startsWith('--- Execution Started ---')) {
                return (
                  <div key={idx} className="text-[#FFBD2E] font-bold pt-1">
                    {line}
                  </div>
                );
              }
              if (line.startsWith('--- Execution Completed')) {
                return (
                  <div key={idx} className="text-[#00A651] font-bold pb-1">
                    {line}
                  </div>
                );
              }
              if (line.startsWith('--- Execution Terminated')) {
                return (
                  <div key={idx} className="text-[#FF5F57] font-bold pb-1">
                    {line}
                  </div>
                );
              }
              if (line.startsWith('[ERROR]')) {
                return (
                  <div key={idx} className="text-[#FF5F57] bg-[#FF5F57]/10 p-1.5 rounded border border-[#FF5F57]/30 my-1">
                    {line}
                  </div>
                );
              }
              if (line.startsWith('Welcome to WasmBox')) {
                return (
                  <div key={idx} className="text-[#4FC1FF] font-semibold">
                    {line}
                  </div>
                );
              }
              if (line.startsWith('Command:')) {
                return (
                  <div key={idx} className="text-[#D4D4D4]">
                    <span className="text-[#86868B]">Command: </span>
                    <span className="text-[#DCDCAA]">{line.replace('Command: ', '')}</span>
                  </div>
                );
              }
              if (line === '$') {
                return (
                  <div key={idx} className="text-[#FFBD2E] font-bold">
                    $
                  </div>
                );
              }
              return (
                <div key={idx} className="text-[#D4D4D4] whitespace-pre-wrap">
                  {line}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
