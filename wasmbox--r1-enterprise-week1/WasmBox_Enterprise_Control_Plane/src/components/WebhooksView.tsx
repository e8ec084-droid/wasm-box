import React, { useState } from 'react';
import { 
  Send, 
  Database, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Zap, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Code2,
  ExternalLink,
  Layers,
  Lock
} from 'lucide-react';
import { SavedPlugin, HostDbRow, ExecutionRecord, LogEntry } from '../types';

interface WebhooksViewProps {
  plugins: SavedPlugin[];
  hostDbRows: HostDbRow[];
  onTriggerWebhook: (plugin: SavedPlugin, payload: string) => Promise<{
    status: number;
    latency: string;
    output: string;
    error?: string;
    newDbRow?: HostDbRow;
  }>;
  onNavigateToSandbox: (code: string) => void;
}

export const WebhooksView: React.FC<WebhooksViewProps> = ({
  plugins,
  hostDbRows,
  onTriggerWebhook,
  onNavigateToSandbox,
}) => {
  const [selectedPluginId, setSelectedPluginId] = useState<string>(plugins[0]?.id || 'plug-1');
  const [customPayload, setCustomPayload] = useState<string>(plugins[0]?.samplePayload || '{}');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [webhookResponse, setWebhookResponse] = useState<{
    status: number;
    latency: string;
    output: string;
    error?: string;
    timestamp: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'simulator' | 'database' | 'catalog'>('simulator');

  const selectedPlugin = plugins.find((p) => p.id === selectedPluginId) || plugins[0];

  const handleSelectPlugin = (id: string) => {
    setSelectedPluginId(id);
    const p = plugins.find((item) => item.id === id);
    if (p) {
      setCustomPayload(p.samplePayload);
      setWebhookResponse(null);
    }
  };

  const handleSendWebhook = async () => {
    if (!selectedPlugin || isSending) return;
    setIsSending(true);

    try {
      const res = await onTriggerWebhook(selectedPlugin, customPayload);
      setWebhookResponse({
        status: res.status,
        latency: res.latency,
        output: res.output,
        error: res.error,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyEndpoint = () => {
    if (selectedPlugin) {
      navigator.clipboard.writeText(`https://api.wasmbox.internal${selectedPlugin.webhookPath}`);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div id="webhooks-view-container" className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Saved Plugins & Webhook Simulator</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6F6EC] text-[#00A651] font-semibold text-[11px]">
              Multi-Tenant Ingress
            </span>
          </div>
          <p className="text-sm text-[#86868B] mt-0.5">
            Test untrusted customer plugins triggered via simulated HTTP webhook events with sub-5ms WASM execution.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5E7] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'simulator' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Webhook Simulator
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'database' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Authorized Host DB ({hostDbRows.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'catalog' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Saved Plugins ({plugins.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration & Payload */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <label className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wide block mb-2">
                  Select Registered Plugin
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {plugins.map((p) => {
                    const isSelected = p.id === selectedPluginId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPlugin(p.id)}
                        className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0066FF] bg-blue-50/50 shadow-xs'
                            : 'border-[#E5E5E7] hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className={`font-semibold line-clamp-1 ${isSelected ? 'text-[#0066FF]' : 'text-[#1D1D1F]'}`}>
                          {p.name}
                        </span>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#86868B]">
                          <span>v{p.version}</span>
                          <span className="font-mono text-[#0066FF]">{p.triggerCount} runs</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint Display */}
              <div>
                <label className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wide block mb-2">
                  Webhook Endpoint
                </label>
                <div className="flex items-center gap-2 bg-[#F5F5F7] border border-[#E5E5E7] rounded-xl px-3 py-2 font-mono text-xs">
                  <span className="text-[#00A651] font-bold">POST</span>
                  <span className="text-[#424245] truncate flex-1">{selectedPlugin?.webhookPath}</span>
                  <button
                    onClick={handleCopyEndpoint}
                    className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded transition-colors"
                    title="Copy Endpoint"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#00A651]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Payload Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wide">
                    JSON Webhook Payload
                  </label>
                  <span className="text-[11px] text-[#86868B] font-mono">application/json</span>
                </div>
                <textarea
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  className="w-full bg-[#1E1E1E] text-[#9CDCFE] p-3 rounded-xl font-mono text-xs border border-[#2D2D30] outline-none focus:border-[#0066FF] leading-relaxed resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => onNavigateToSandbox(selectedPlugin?.code || '')}
                  className="text-xs text-[#0066FF] hover:underline flex items-center gap-1.5 font-medium"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Open in Sandbox IDE</span>
                </button>

                <button
                  onClick={handleSendWebhook}
                  disabled={isSending}
                  className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
                >
                  {isSending ? (
                    <>
                      <Zap className="w-4 h-4 animate-spin" />
                      <span>Executing in WASM...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Trigger Webhook</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Response & Telemetry */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[460px]">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E7]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#86868B]" />
                    <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wide">
                      WASM Sandbox Ingress Response
                    </span>
                  </div>
                  {webhookResponse && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F6EC] text-[#00A651]">
                      HTTP {webhookResponse.status} OK
                    </span>
                  )}
                </div>

                {webhookResponse ? (
                  <div className="mt-4 space-y-4">
                    {/* Performance Chips */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7] text-center">
                        <span className="text-[10px] text-[#86868B] uppercase block">Sandbox Latency</span>
                        <span className="text-sm font-bold text-[#00A651] font-mono">{webhookResponse.latency}</span>
                      </div>
                      <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7] text-center">
                        <span className="text-[10px] text-[#86868B] uppercase block">Isolation Trap</span>
                        <span className="text-sm font-bold text-[#1D1D1F] font-mono">0 Violations</span>
                      </div>
                      <div className="bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5E7] text-center">
                        <span className="text-[10px] text-[#86868B] uppercase block">Fuel Incurred</span>
                        <span className="text-sm font-bold text-[#0066FF] font-mono">148K / 10M</span>
                      </div>
                    </div>

                    {/* Stdout Output Console */}
                    <div>
                      <span className="text-[11px] font-bold text-[#86868B] uppercase block mb-1.5">
                        Plugin Standard Output (Captured WASI Pipe)
                      </span>
                      <div className="bg-[#1E1E1E] text-[#D4D4D4] p-3.5 rounded-xl font-mono text-xs border border-[#2D2D30] overflow-x-auto max-h-[220px]">
                        <pre className="text-[#A6E22E] whitespace-pre-wrap">{webhookResponse.output}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-[#86868B] space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center mx-auto">
                      <Send className="w-5 h-5" />
                    </div>
                    <p className="text-xs">
                      Click <strong className="text-[#1D1D1F]">"Trigger Webhook"</strong> to fire an enterprise HTTP event directly into the Wasmtime sandbox.
                    </p>
                    <p className="text-[11px] font-mono text-[#86868B]">
                      Guaranteed execution under 5ms with strict zero-trust isolation.
                    </p>
                  </div>
                )}
              </div>

              {/* Host Function Guard Notice */}
              <div className="mt-4 pt-4 border-t border-[#E5E5E7] flex items-center justify-between text-[11px] text-[#86868B]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00A651]" />
                  <span>WASI Sandbox Memory &amp; Capability Guard Active</span>
                </div>
                <span className="font-mono text-[#1D1D1F]">Target: wasm32-wasi</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Authorized Host Database */}
      {activeTab === 'database' && (
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Authorized Host DB Ledger</h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                Rows safely persisted by untrusted WASM plugins via whitelisted C-ABI host bridges (<code className="font-mono text-[#0066FF]">host_db_write</code>).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#00A651] bg-[#E6F6EC] px-3 py-1 rounded-full font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Direct database access blocked; mediated via host function</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E5E7] rounded-xl font-mono text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] text-[#86868B] text-[11px] border-b border-[#E5E5E7]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Row ID</th>
                  <th className="py-2.5 px-4 font-semibold">Table</th>
                  <th className="py-2.5 px-4 font-semibold">Committed At</th>
                  <th className="py-2.5 px-4 font-semibold">Sanitized JSON Payload</th>
                  <th className="py-2.5 px-4 font-semibold">Host Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E7]">
                {hostDbRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-bold text-[#0066FF]">{row.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">{row.table}</td>
                    <td className="py-3 px-4 text-[#86868B]">{row.timestamp}</td>
                    <td className="py-3 px-4 max-w-md">
                      <pre className="text-[11px] text-[#424245] truncate">
                        {JSON.stringify(row.data)}
                      </pre>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-[#86868B] truncate max-w-[140px]">
                      {row.hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Catalog */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="bg-white border border-[#E5E5E7] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF3FF] text-[#0066FF] font-mono text-[10px] font-bold">
                    v{plugin.version}
                  </span>
                  <span className="text-[11px] text-[#86868B] font-mono">{plugin.triggerCount} executions</span>
                </div>
                <h4 className="text-sm font-bold text-[#1D1D1F]">{plugin.name}</h4>
                <p className="text-xs text-[#86868B] mt-1.5 leading-relaxed">{plugin.description}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#F5F5F7] space-y-3">
                <div className="text-[10px] font-mono bg-[#F5F5F7] p-2 rounded border border-[#E5E5E7] text-[#424245] truncate">
                  POST {plugin.webhookPath}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#86868B]">Created {plugin.createdAt}</span>
                  <button
                    onClick={() => onNavigateToSandbox(plugin.code)}
                    className="text-xs text-[#0066FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Edit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
