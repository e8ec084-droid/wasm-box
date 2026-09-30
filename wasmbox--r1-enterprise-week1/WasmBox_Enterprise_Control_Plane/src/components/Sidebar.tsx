import React from 'react';
import {
  LayoutDashboard, Terminal, Zap, Layers, Upload, Activity,
  FileText, Settings, LogOut, ShieldCheck, ChevronRight
} from 'lucide-react';
import { PageType } from '../types';

interface SidebarProps {
  currentPage: PageType;
  onSelectPage: (page: PageType) => void;
  userEmail: string;
  userName: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage, onSelectPage, userEmail, userName, onLogout
}) => {
  const groups: { title: string; items: { id: PageType; label: string; icon: React.ReactNode }[] }[] = [
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
        { id: 'sandbox', label: 'Sandbox IDE', icon: <Terminal size={16} /> },
        { id: 'webhooks', label: 'Plugins & Webhooks', icon: <Zap size={16} /> },
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'systems', label: 'Runtime Architecture', icon: <Layers size={16} /> },
        { id: 'upload', label: 'Module Registry', icon: <Upload size={16} /> },
        { id: 'executions', label: 'Execution History', icon: <Activity size={16} /> },
        { id: 'logs', label: 'Audit Logs', icon: <FileText size={16} /> },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'settings', label: 'Sandbox Policies', icon: <Settings size={16} /> },
      ]
    }
  ];

  return (
    <aside className="wb-sidebar flex flex-col shrink-0 select-none">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-[3px] border-[#155eef] rotate-45 rounded-[3px]" />
          </div>
          <div>
            <div className="text-[16px] font-bold tracking-tight text-white">WasmBox</div>
            <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-slate-400">Enterprise Control Plane</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="px-3 mb-2 text-[9px] font-extrabold uppercase tracking-[.16em] text-slate-500">
              {group.title}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectPage(item.id)}
                    className={`wb-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                      active ? 'wb-nav-active' : 'text-slate-300'
                    }`}
                  >
                    <span className={active ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {active && <ChevronRight size={14} className="opacity-70" />}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="rounded-xl bg-white/[.055] border border-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#155eef] text-white flex items-center justify-center text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white truncate">{userName}</div>
              <div className="text-[9px] text-slate-400 truncate">{userEmail}</div>
            </div>
            <button onClick={onLogout} title="Sign out" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <LogOut size={14} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-400">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Tenant isolation policy active</span>
          </div>
        </div>
        <div className="px-1 pt-3 flex justify-between text-[9px] text-slate-500">
          <span>WasmBox Core</span>
          <span>v1.0 • Demo</span>
        </div>
      </div>
    </aside>
  );
};
