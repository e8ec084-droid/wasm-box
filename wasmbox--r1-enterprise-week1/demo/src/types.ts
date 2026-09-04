export type PageType = 'dashboard' | 'sandbox' | 'upload' | 'executions' | 'logs' | 'settings';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

export type ExecutionStatus = 'COMPLETED' | 'FAILED' | 'RUNNING';

export interface ExecutionRecord {
  id: string;
  module: string;
  status: ExecutionStatus;
  command: string;
  started: string;
  duration: string; // e.g. "3.4ms" or "—"
  memoryUsed: string; // e.g. "4.1 MB"
  output: string;
  error?: string;
  securityViolation?: 'FILESYSTEM' | 'NETWORK' | 'MEMORY_LIMIT' | 'INSTRUCTION_LIMIT' | null;
}

export interface WasmModuleItem {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  version: string;
  description: string;
  isDefault?: boolean;
}

export interface SandboxPreset {
  id: string;
  name: string;
  category: 'benign' | 'enterprise' | 'security_fs' | 'security_net' | 'resource_memory' | 'resource_loop';
  description: string;
  code: string;
  command: string;
  expectedStatus: 'COMPLETED' | 'FAILED';
  expectedDuration: string;
}

export interface SandboxConfig {
  module: string;
  allowFilesystem: boolean;
  allowNetwork: boolean;
  allowEnvironment: boolean;
  memoryLimitMb: number;
  instructionLimitFuel: number;
}
