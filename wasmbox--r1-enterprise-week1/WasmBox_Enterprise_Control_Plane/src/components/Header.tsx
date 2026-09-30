import React from 'react';
import { Sun, Moon, ShieldCheck, Activity, ChevronDown } from 'lucide-react';
import { PageType } from '../types';

interface HeaderProps {
  currentPage: PageType;
  darkMode: boolean;
  onToggleTheme: () => void;
  activeExecutionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, darkMode, onToggleTheme, activeExecutionsCount }) => {
  const pageTitles: Record<PageType, { title: string; section: string }> = {
    dashboard: { title: 'Environment Overview', section: 'Workspace' },
    sandbox: { title: 'Sandbox IDE', section: 'Workspace' },
    webhooks: { title: 'Plugins & Webhooks', section: 'Workspace' },
    systems: { title: 'Runtime Architecture', section: 'Operations' },
    upload: { title: 'Module Registry', section: 'Operations' },
    executions: { title: 'Execution History', section: 'Operations' },
    logs: { title: 'Audit Logs', section: 'Operations' },
    settings: { title: 'Sandbox Policies', section: 'Administration' },
  };
  const page = pageTitles[currentPage];

  return (
    <header className="wb-header sticky top-0 z-20 px-5 lg:px-7 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>{page.section}</span><span>/</span>
        </div>
        <div className="text-sm font-bold text-slate-800 truncate">{page.title}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700">
          <span className="wb-status-dot bg-emerald-500 animate-pulse" />
          Control plane healthy
        </div>

        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600">
          <Activity size={13} className="text-[#155eef]" />
          Wasmtime 22.0
        </div>

        {activeExecutionsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            {activeExecutionsCount} running
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600">
          <ShieldCheck size={13} className="text-[#155eef]" />
          Zero-trust policy
        </div>

        <button
          onClick={onToggleTheme}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button className="hidden sm:flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-50">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">P</div>
          <ChevronDown size={13} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
};
