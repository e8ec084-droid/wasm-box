import React, { useState, useEffect } from 'react';
import { PageType, ExecutionRecord, LogEntry, WasmModuleItem } from './types';
import { INITIAL_MODULES, INITIAL_EXECUTIONS, INITIAL_LOGS } from './data';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SandboxView } from './components/SandboxView';
import { UploadView } from './components/UploadView';
import { ExecutionsView } from './components/ExecutionsView';
import { LogsView } from './components/LogsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { Toast } from './components/Toast';

export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('test@gmail.com');
  const [userName, setUserName] = useState<string>('test');

  // Navigation state
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedAuditPreset, setSelectedAuditPreset] = useState<string>('preset-hello');

  // App data state
  const [modules, setModules] = useState<WasmModuleItem[]>(INITIAL_MODULES);
  const [executions, setExecutions] = useState<ExecutionRecord[]>(INITIAL_EXECUTIONS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  // Status metrics
  const [memoryUsageMb, setMemoryUsageMb] = useState<number>(0);
  const [activeExecutions, setActiveExecutions] = useState<number>(0);

  // Theme & Toast
  const [darkMode, setDarkMode] = useState<boolean>(true);
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

  // If user signed out, display Login view (screenshot 1)
  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div id="wasmbox-app-root" className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col antialiased selection:bg-[#0066FF] selection:text-white">
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
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F5F5F7]">
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
              />
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

      {/* Floating Toast Notification (bottom-right pill as seen in screenshots) */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} />
      )}
    </div>
  );
}
