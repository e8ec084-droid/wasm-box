export interface Tenant {
  id: string;
  name: string;
  tier: 'Enterprise' | 'Scale' | 'Starter';
  maxMemoryMB: number;
  fuelLimit: number;
  timeoutMs: number;
  allowedImports: string[];
}

export interface SecurityTrap {
  timestamp: string;
  vector: 'FILE_SYSTEM' | 'NETWORK' | 'CPU_LOOP' | 'MEMORY_BOMB' | 'SUBPROCESS' | 'ENV_LEAK';
  target: string;
  action: 'INTERCEPTED_AND_BLOCKED';
  reason: string;
  trapCode: string;
  syscall: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface ExecutionMetrics {
  executionTimeMs: number;
  compilationTimeMs: number;
  coldStartTimeMs: number;
  memoryUsedBytes: number;
  memoryLimitBytes: number;
  fuelConsumed: number;
  fuelLimit: number;
  wasmPagesAllocated: number;
  wasmBinarySizeBytes: number;
  isWarmInstance: boolean;
}

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  outputPayload?: string;
  traps: SecurityTrap[];
  metrics: ExecutionMetrics;
  watDisassembly?: string;
  error?: string;
  timestamp: string;
}

export interface PluginTemplate {
  id: string;
  title: string;
  category: 'data_parser' | 'security_audit' | 'anonymizer' | 'compute';
  description: string;
  code: string;
  defaultInput: string;
  isAuditAttempt?: boolean;
}

export interface BenchmarkReport {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  trappedRuns: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50TimeMs: number;
  p95TimeMs: number;
  p99TimeMs: number;
  throughputPerSec: number;
  latencies: number[];
  memoryStability: string;
}

export interface AuditSuiteItem {
  id: string;
  name: string;
  description: string;
  code: string;
  expectedTrap: string;
  category: 'Filesystem' | 'Network' | 'Infinite Loop' | 'Memory Bomb' | 'Process Escape' | 'Secrets Leak';
  status?: 'passed' | 'failed' | 'running' | 'idle';
  result?: ExecutionResult;
}
