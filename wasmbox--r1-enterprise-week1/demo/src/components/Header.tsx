import React from 'react';
import { Sun, Moon, ShieldCheck, Cpu } from 'lucide-react';
import { PageType } from '../types';

interface HeaderProps {
  currentPage: PageType;
  darkMode: boolean;
  onToggleTheme: () => void;
  activeExecutionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  darkMode,
  onToggleTheme,
  activeExecutionsCount,
}) => {
  const pageTitles: Record<PageType, string> = {
    dashboard: 'Dashboard',
    sandbox: 'Sandbox IDE',
    upload: 'Module Upload',
    executions: 'Executions',
    logs: 'Live Logs',
    settings: 'Settings',
  };

  return (
    <header id="app-top-header" className="h-14 border-b border-[#E5E5E7] bg-white px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
          {pageTitles[currentPage]}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Isolation Active badge from Design HTML */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#00A651] bg-[#E6F6EC] px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-[#00A651] rounded-full animate-pulse" />
          <span className="hidden sm:inline">Multi-Tenant Isolation Active</span>
          <span className="sm:hidden">Active</span>
        </div>

        {/* Runtime status indicator badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#F5F5F7] border border-[#E5E5E7] text-xs">
          <span className="text-[#86868B] font-mono text-[11px]">Wasmtime v22.0.0</span>
          <span className="text-[#E5E5E7]">|</span>
          <span className="text-[#1D1D1F] font-medium">Sandbox Online</span>
        </div>

        {activeExecutionsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-[#0066FF] font-medium animate-pulse">
            <Cpu className="w-3 h-3 text-[#0066FF]" />
            <span>{activeExecutionsCount} active</span>
          </div>
        )}

        {/* Security badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] border border-[#E5E5E7] text-xs text-[#424245]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0066FF]" />
          <span>WASI Zero-Trust</span>
        </div>

        {/* Theme toggle icon button */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
