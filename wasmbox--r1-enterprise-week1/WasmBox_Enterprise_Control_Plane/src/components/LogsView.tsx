import React, { useState } from 'react';
import { Search, ChevronDown, Radio, Trash2, RefreshCw } from 'lucide-react';
import { LogEntry, LogLevel } from '../types';

interface LogsViewProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
  onSimulateLog?: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({
  logs,
  onClearLogs,
  onSimulateLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | LogLevel>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (
      searchTerm &&
      !log.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.timestamp.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div id="logs-view-container" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Stream Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Live Logs</h1>
          <p className="text-sm text-[#86868B] mt-0.5">
            Search and filter WebSocket-backed runtime events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F6EC] border border-[#C6EAD3] text-xs text-[#00A651] font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>WebSocket Live Stream (Active)</span>
          </div>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              title="Clear logs"
              className="p-2 rounded-lg bg-white hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] border border-[#E5E5E7] transition-colors shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="logs-card" className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E5E5E7] flex flex-col sm:flex-row sm:items-center gap-3 bg-[#FAFAFA]">
          {/* Search bar with magnifying glass */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-logs-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-white border border-[#E5E5E7] rounded-lg pl-9 pr-3 py-2 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:border-[#0066FF] font-sans"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="relative w-full sm:w-44">
            <select
              id="log-level-dropdown"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'ALL' | LogLevel)}
              className="w-full appearance-none bg-white text-xs text-[#1D1D1F] border border-[#E5E5E7] rounded-lg px-3 py-2 pr-8 font-medium focus:outline-none focus:border-[#0066FF] cursor-pointer"
            >
              <option value="ALL">All levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#86868B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Logs Table / Stream List */}
        <div className="divide-y divide-[#E5E5E7] font-mono text-xs max-h-[560px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[#86868B] font-sans">
              No runtime log events match your query.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isError = log.level === 'ERROR';
              const isWarn = log.level === 'WARN';

              return (
                <div
                  key={log.id}
                  className="px-6 py-3.5 hover:bg-[#F5F5F7] transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6"
                >
                  {/* Timestamp */}
                  <span className="text-[#86868B] shrink-0 w-44 font-sans text-xs">
                    {log.timestamp}
                  </span>

                  {/* Level Tag */}
                  <span
                    className={`shrink-0 font-bold text-xs uppercase w-14 ${
                      isError
                        ? 'text-[#E02424]'
                        : isWarn
                        ? 'text-[#D97706]'
                        : 'text-[#0066FF]'
                    }`}
                  >
                    {log.level}
                  </span>

                  {/* Message */}
                  <div className="flex-1 overflow-hidden">
                    <span className="text-[#1D1D1F] break-all">
                      {log.message}
                    </span>
                    {log.details && (
                      <span className="block text-[11px] text-[#86868B] mt-0.5">
                        {log.details}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
