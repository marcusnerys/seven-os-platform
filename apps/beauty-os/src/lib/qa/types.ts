export type TestStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'RUNNING' | 'IDLE';

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  message?: string;
  module: string;
  duration?: number;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  module: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface PerformanceMetrics {
  renderTime: number;
  firebaseLatency: number;
  fps: number;
  memoryUsage?: number;
}
