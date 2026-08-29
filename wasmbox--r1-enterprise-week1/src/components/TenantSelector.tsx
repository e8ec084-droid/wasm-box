import React from 'react';
import { Building2, Shield, Lock, Sliders, ChevronDown } from 'lucide-react';
import type { Tenant } from '../types';

interface TenantSelectorProps {
  tenants: Tenant[];
  selectedTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  memoryCapMB: number;
  fuelLimit: number;
  onChangeMemoryCap: (val: number) => void;
  onChangeFuelLimit: (val: number) => void;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  tenants,
  selectedTenant,
  onSelectTenant,
  memoryCapMB,
  fuelLimit,
  onChangeMemoryCap,
  onChangeFuelLimit
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
      
      {/* Tenant Dropdown */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-slate-400">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>Tenant Context:</span>
        </div>

        <div className="relative inline-block">
          <select
            id="select-tenant"
            value={selectedTenant.id}
            onChange={(e) => {
              const found = tenants.find(t => t.id === e.target.value);
              if (found) onSelectTenant(found);
            }}
            className="appearance-none bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-100 font-medium py-1.5 pl-3 pr-8 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} [{t.tier}]
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[11px]">
          <Shield className="w-3 h-3" />
          Isolated Namespace
        </span>
      </div>

      {/* Sandbox Resource Limits Configuration */}
      <div className="flex items-center flex-wrap gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Memory Cap:</span>
          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            <input
              type="range"
              id="slider-memory-cap"
              min="2"
              max="30"
              step="1"
              value={memoryCapMB}
              onChange={(e) => onChangeMemoryCap(Number(e.target.value))}
              className="w-16 sm:w-20 accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="font-semibold text-indigo-300">{memoryCapMB} MB</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Fuel (Instructions):</span>
          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            <input
              type="range"
              id="slider-fuel-limit"
              min="5000"
              max="100000"
              step="5000"
              value={fuelLimit}
              onChange={(e) => onChangeFuelLimit(Number(e.target.value))}
              className="w-16 sm:w-20 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="font-semibold text-amber-300">{(fuelLimit / 1000).toFixed(0)}k</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 text-slate-500 text-[11px]">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Syscalls: 0 Granted</span>
        </div>
      </div>

    </div>
  );
};
