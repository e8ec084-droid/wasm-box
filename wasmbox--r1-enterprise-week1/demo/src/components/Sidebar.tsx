import React from 'react';
import { 
  LayoutDashboard, 
  Terminal, 
  Upload, 
  Activity, 
  FileText, 
  Settings, 
  LogOut 
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
  currentPage,
  onSelectPage,
  userEmail,
  userName,
  onLogout,
}) => {
  const navItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'sandbox', label: 'Sandbox IDE', icon: <Terminal className="w-4 h-4" /> },
    { id: 'upload', label: 'Module Upload', icon: <Upload className="w-4 h-4" /> },
    { id: 'executions', label: 'Executions', icon: <Activity className="w-4 h-4" /> },
    { id: 'logs', label: 'Live Logs', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside id="main-sidebar" className="w-64 bg-white border-r border-[#E5E5E7] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Logo Header matching Clean Minimalism Design */}
        <div id="sidebar-logo" className="px-6 py-4 flex items-center gap-3 border-b border-[#E5E5E7]">
          <div className="w-6 h-6 bg-[#000] rounded-md flex items-center justify-center shrink-0">
            <div className="w-2 h-2 border-2 border-white rotate-45"></div>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold text-lg text-[#1D1D1F] tracking-tight">
              WasmBox<span className="text-[#0066FF] font-normal italic ml-0.5">Core</span>
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav id="sidebar-nav" className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-[#424245] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-[#86868B]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile */}
      <div id="sidebar-footer-section" className="p-4 border-t border-[#E5E5E7]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#E5E5E7] text-[#1D1D1F] font-bold text-xs flex items-center justify-center shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="text-xs font-semibold text-[#1D1D1F] truncate">{userName}</span>
              <span className="text-[11px] text-[#86868B] truncate">{userEmail}</span>
            </div>
          </div>
          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            title="Sign out / Switch account"
            className="text-[#86868B] hover:text-[#1D1D1F] p-1.5 rounded hover:bg-[#E5E5E7] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 px-1 text-[10px] text-[#86868B] flex flex-col gap-0.5">
          <span className="font-semibold text-[#424245]">WasmBox Core © 2026</span>
          <span>Secure Multi-Tenant Plugin Sandbox</span>
        </div>
      </div>
    </aside>
  );
};
