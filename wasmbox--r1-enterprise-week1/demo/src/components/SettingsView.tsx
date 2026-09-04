import React, { useState } from 'react';
import { 
  ShieldCheck, 
  HardDrive, 
  Cpu, 
  Lock, 
  WifiOff, 
  Save, 
  Check, 
  RotateCcw,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface SettingsViewProps {
  onSaveToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSaveToast }) => {
  const [memoryCapMb, setMemoryCapMb] = useState<number>(10);
  const [fuelLimit, setFuelLimit] = useState<number>(10000000);
  const [coldStartBudgetMs, setColdStartBudgetMs] = useState<number>(5);
  const [strictZeroTrustFs, setStrictZeroTrustFs] = useState<boolean>(true);
  const [blockAllSockets, setBlockAllSockets] = useState<boolean>(true);
  const [tenantIsolationMode, setTenantIsolationMode] = useState<string>('process_memory_jail');
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setSaved(true);
    onSaveToast('Wasmtime sandbox policy updated successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setMemoryCapMb(10);
    setFuelLimit(10000000);
    setColdStartBudgetMs(5);
    setStrictZeroTrustFs(true);
    setBlockAllSockets(true);
    setTenantIsolationMode('process_memory_jail');
    onSaveToast('Settings reset to WasmBox production defaults');
  };

  return (
    <div id="settings-view-container" className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Sandbox Settings</h1>
          <p className="text-sm text-[#86868B] mt-0.5">
            Configure Wasmtime engine parameters, resource caps, and security isolation rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 bg-[#F5F5F7] hover:bg-[#E5E5E7] text-[#1D1D1F] text-xs font-semibold rounded-lg border border-[#E5E5E7] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#86868B]" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved' : 'Save Policies'}</span>
          </button>
        </div>
      </div>

      {/* Resource Constraints Card */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E5E7]">
          <Sliders className="w-4 h-4 text-[#0066FF]" />
          <h2 className="text-sm font-bold text-[#1D1D1F] tracking-tight">Resource Limits &amp; Fuel Quotas</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Memory Cap */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#1D1D1F] font-semibold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#86868B]" />
                Max Plugin Memory (RAM)
              </span>
              <span className="font-mono text-[#0066FF] font-bold bg-[#F5F5F7] px-2.5 py-0.5 rounded border border-[#E5E5E7]">
                {memoryCapMb} MB
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="64"
              step="2"
              value={memoryCapMb}
              onChange={(e) => setMemoryCapMb(Number(e.target.value))}
              className="w-full accent-[#0066FF] cursor-pointer"
            />
            <p className="text-[11px] text-[#86868B]">
              Wasmtime engine enforces hard WebAssembly memory page bounds. Out-of-bounds allocations abort instantly.
            </p>
          </div>

          {/* Cold Start Target */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#1D1D1F] font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#0066FF]" />
                Execution Timeout Target
              </span>
              <span className="font-mono text-[#00A651] font-bold bg-[#F5F5F7] px-2.5 py-0.5 rounded border border-[#E5E5E7]">
                {coldStartBudgetMs} ms
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={coldStartBudgetMs}
              onChange={(e) => setColdStartBudgetMs(Number(e.target.value))}
              className="w-full accent-[#0066FF] cursor-pointer"
            />
            <p className="text-[11px] text-[#86868B]">
              WebAssembly execution completes in under 5ms, avoiding heavy Docker startup latency.
            </p>
          </div>
        </div>

        {/* Fuel Instruction Counter */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-[#1D1D1F] block mb-1.5">
            Instruction Fuel Counter (Infinite Loop Defense)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={fuelLimit}
              onChange={(e) => setFuelLimit(Number(e.target.value))}
              className="w-full max-w-xs bg-[#F5F5F7] border border-[#E5E5E7] rounded-lg px-3 py-2 text-xs font-mono text-[#1D1D1F] focus:outline-none focus:border-[#0066FF]"
            />
            <span className="text-xs text-[#86868B]">instructions per execution</span>
          </div>
        </div>
      </div>

      {/* Security Policies Card */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E5E7]">
          <ShieldCheck className="w-4 h-4 text-[#00A651]" />
          <h2 className="text-sm font-bold text-[#1D1D1F] tracking-tight">WASI Isolation Policies</h2>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-[#E02424] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#1D1D1F] block">
                  Host File System Access: Zero-Trust Deny
                </span>
                <span className="text-[11px] text-[#86868B]">
                  Explicitly prevents all access to /etc/passwd, server disks, and root directory paths.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={strictZeroTrustFs}
              onChange={(e) => setStrictZeroTrustFs(e.target.checked)}
              className="w-4 h-4 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="w-4 h-4 text-[#0066FF] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#1D1D1F] block">
                  Outbound Network Sockets: Strict Prohibit
                </span>
                <span className="text-[11px] text-[#86868B]">
                  Denies raw socket creation, TCP, and UDP outbound requests from compiled WASM modules.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={blockAllSockets}
              onChange={(e) => setBlockAllSockets(e.target.checked)}
              className="w-4 h-4 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
