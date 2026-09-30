import React, { useState, useEffect } from 'react';
import { PageType, ExecutionRecord, LogEntry, WasmModuleItem, SavedPlugin, HostDbRow } from './types';
import { INITIAL_MODULES, INITIAL_EXECUTIONS, INITIAL_LOGS, INITIAL_SAVED_PLUGINS, INITIAL_HOST_DB_ROWS } from './data';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SandboxView } from './components/SandboxView';
import { WebhooksView } from './components/WebhooksView';
import { SystemsView } from './components/SystemsView';
import { UploadView } from './components/UploadView';
import { ExecutionsView } from './components/ExecutionsView';
import { LogsView } from './components/LogsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { Toast } from './components/Toast';

export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('e8ec084@sairamtap.edu.in');
  const [userName, setUserName] = useState<string>('Prasanna');

  // Navigation state
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedAuditPreset, setSelectedAuditPreset] = useState<string>('preset-hello');

  // App data state
  const [modules, setModules] = useState<WasmModuleItem[]>(INITIAL_MODULES);
  const [executions, setExecutions] = useState<ExecutionRecord[]>(INITIAL_EXECUTIONS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [savedPlugins, setSavedPlugins] = useState<SavedPlugin[]>(INITIAL_SAVED_PLUGINS);
  const [hostDbRows, setHostDbRows] = useState<HostDbRow[]>(INITIAL_HOST_DB_ROWS);

  // Status metrics
  const [memoryUsageMb, setMemoryUsageMb] = useState<number>(0);
  const [activeExecutions, setActiveExecutions] = useState<number>(0);

  // Theme & Toast
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>('Live log stream connected');
  const [toastType, setToastType] = useState<'info' | 'success'>('info');

  // Show temporary toast
  const triggerToast = (msg: string, type: 'info' | 'success' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Initial toast connection on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Handle new execution from Sandbox
  const handleExecutionComplete = (record: ExecutionRecord, log: LogEntry) => {
    setExecutions((prev) => [record, ...prev]);
    setLogs((prev) => [log, ...prev]);

    // Briefly show memory usage change
    setMemoryUsageMb(Number(record.memoryUsed.replace(' MB', '')) || 2.1);
    setTimeout(() => {
      setMemoryUsageMb(0);
    }, 4000);
  };

  // Handle saving new plugin
  const handleSavePlugin = (newPlugin: SavedPlugin) => {
    setSavedPlugins((prev) => [newPlugin, ...prev]);
    triggerToast(`Plugin "${newPlugin.name}" registered to tenant`, 'success');
  };

  // Handle persisting new host db row
  const handlePersistHostDbRow = (newRow: HostDbRow) => {
    setHostDbRows((prev) => [newRow, ...prev]);
  };

  // Handle triggering simulated webhook
  const handleTriggerWebhook = async (
    plugin: SavedPlugin,
    payloadStr: string
  ): Promise<{
    status: number;
    latency: string;
    output: string;
    error?: string;
    newDbRow?: HostDbRow;
  }> => {
    setActiveExecutions((prev) => prev + 1);

    // Simulate sub-5ms WASM execution
    await new Promise((resolve) => setTimeout(resolve, 380));

    const simulatedDuration = `${(Math.random() * 1.6 + 2.1).toFixed(1)}ms`;
    const execId = crypto.randomUUID();
    const timeString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = `Aug 14, 2026, ${timeString}`;

    // Increment plugin run count
    setSavedPlugins((prev) =>
      prev.map((p) => (p.id === plugin.id ? { ...p, triggerCount: p.triggerCount + 1 } : p))
    );

    let output = '';
    let status = 200;
    let newDbRow: HostDbRow | undefined;

    if (plugin.id === 'plug-2' || plugin.code.includes('host_bridge.db_write')) {
      const rowId = `row-${Math.floor(1000 + Math.random() * 9000)}`;
      output = `[Plugin] Webhook event received: order checkout\n[Host Bridge] Executing host_db_write("orders_ledger", payload)\n[Host Bridge Return]: Row written successfully! ID: ${rowId}\n[WasmBox] Executed cleanly in ${simulatedDuration}`;
      newDbRow = {
        id: rowId,
        table: 'orders_ledger',
        timestamp: timeString,
        data: {
          order_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          amount: 320.0,
          validated_by: 'wasm_sandbox_tenant_1',
          status: 'SANITIZED',
        },
        pluginId: plugin.id,
        hash: `sha256:${crypto.randomUUID().replace(/-/g, '')}`,
      };
      setHostDbRows((prev) => [newDbRow!, ...prev]);
    } else if (plugin.id === 'plug-3' || plugin.code.includes('threat')) {
      output = `[Threat Engine] Payload scan completed.\n{\n  "flagged": false,\n  "matches": [],\n  "clean": true\n}\n[WasmBox] Status: 0 sandbox violations. Latency: ${simulatedDuration}`;
    } else {
      output = `[WasmBox Webhook Trigger] Processed input in ${simulatedDuration}.\nPayload parsed: OK\nWASM Sandbox: Clean exit (code 0)`;
    }

    const execRecord: ExecutionRecord = {
      id: execId,
      module: 'python_wasi.wasm',
      status: 'COMPLETED',
      command: `webhook POST ${plugin.webhookPath}`,
      started: dateString,
      duration: simulatedDuration,
      memoryUsed: '2.3 MB',
      output,
    };

    const logEntry: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: dateString,
      level: 'INFO',
      message: `Webhook executed: ${plugin.name} (${simulatedDuration})`,
      details: `Trigger: POST ${plugin.webhookPath} | Memory: 2.3 MB | Status: HTTP 200`,
    };

    setExecutions((prev) => [execRecord, ...prev]);
    setLogs((prev) => [logEntry, ...prev]);
    setActiveExecutions((prev) => Math.max(0, prev - 1));

    triggerToast(`Webhook for "${plugin.name}" executed in ${simulatedDuration}`, 'success');

    return {
      status,
      latency: simulatedDuration,
      output,
      newDbRow,
    };
  };

  // Handle module upload
  const handleUploadModule = (newModule: WasmModuleItem) => {
    setModules((prev) => [newModule, ...prev]);
    const log: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      level: 'INFO',
      message: `Module uploaded: ${newModule.name}`,
      details: `Size: ${newModule.size} | Staged to tenant WASM storage`,
    };
    setLogs((prev) => [log, ...prev]);
    triggerToast(`Module "${newModule.name}" uploaded`, 'success');
  };

  // Handle module deletion
  const handleDeleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    triggerToast('Module removed from tenant sandbox', 'info');
  };

  // Launch audit preset from Dashboard
  const handleLaunchAuditPreset = (presetId: string) => {
    setSelectedAuditPreset(presetId);
    setCurrentPage('sandbox');
  };

  // Open sandbox from Webhook View
  const handleOpenCodeInSandbox = (codeToOpen: string) => {
    setCurrentPage('sandbox');
  };

  // Login handler
  const handleLogin = (email: string, name: string) => {
    setUserEmail(email);
    setUserName(name);
    setIsLoggedIn(true);
    triggerToast('Signed in to WasmBox sandbox environment', 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // If user signed out, display Login view
  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div id="wasmbox-app-root" className="wb-shell text-slate-900 flex flex-col antialiased">
      <div className="flex flex-1 min-h-screen">
        {/* Left Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={(page) => setCurrentPage(page)}
          userEmail={userEmail}
          userName={userName}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header */}
          <Header
            currentPage={currentPage}
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode(!darkMode)}
            activeExecutionsCount={activeExecutions}
          />

          {/* Page Routing Views */}
          <div className="flex-1 pb-16">
            {currentPage === 'dashboard' && (
              <DashboardView
                modules={modules}
                executions={executions}
                memoryUsageMb={memoryUsageMb}
                activeExecutions={activeExecutions}
                onNavigate={(page) => setCurrentPage(page)}
                onLaunchAuditPreset={handleLaunchAuditPreset}
              />
            )}

            {currentPage === 'sandbox' && (
              <SandboxView
                modules={modules}
                selectedPresetId={selectedAuditPreset}
                onExecutionComplete={handleExecutionComplete}
                onSavePlugin={handleSavePlugin}
                onPersistHostDbRow={handlePersistHostDbRow}
              />
            )}

            {currentPage === 'webhooks' && (
              <WebhooksView
                plugins={savedPlugins}
                hostDbRows={hostDbRows}
                onTriggerWebhook={handleTriggerWebhook}
                onNavigateToSandbox={handleOpenCodeInSandbox}
              />
            )}

            {currentPage === 'systems' && (
              <SystemsView />
            )}

            {currentPage === 'upload' && (
              <UploadView
                modules={modules}
                onUploadModule={handleUploadModule}
                onDeleteModule={handleDeleteModule}
                showToast={(msg) => triggerToast(msg, 'success')}
              />
            )}

            {currentPage === 'executions' && (
              <ExecutionsView
                executions={executions}
                onClearExecutions={() => setExecutions([])}
              />
            )}

            {currentPage === 'logs' && (
              <LogsView
                logs={logs}
                onClearLogs={() => setLogs([])}
              />
            )}

            {currentPage === 'settings' && (
              <SettingsView
                onSaveToast={(msg) => triggerToast(msg, 'success')}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} />
      )}
    </div>
  );
}
