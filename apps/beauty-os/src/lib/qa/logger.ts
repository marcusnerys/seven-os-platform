import { LogEntry } from './types';

class QALogger {
  private logs: LogEntry[] = [];
  private maxLogs = 200;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };

    this.logs = [newEntry, ...this.logs].slice(0, this.maxLogs);
    console.log(`[QA][${entry.module}] ${entry.message}`, entry.details || '');
    this.notify();
  }

  error(module: string, message: string, details?: any, stack?: string) {
    this.log({ level: 'error', module, message, details, stack });
  }

  warn(module: string, message: string, details?: any) {
    this.log({ level: 'warn', module, message, details });
  }

  info(module: string, message: string, details?: any) {
    this.log({ level: 'info', module, message, details });
  }

  getLogs() {
    return this.logs;
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }

  clear() {
    this.logs = [];
    this.notify();
  }
}

export const logger = new QALogger();
