/**
 * Debug Logger for PWA/Offline functionality
 * Provides detailed logging for debugging sync and offline issues
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 500;
  private enabled: boolean = true;
  private categories = {
    PWA: '🔧',
    SYNC: '🔄',
    CACHE: '💾',
    NETWORK: '🌐',
    OFFLINE: '📴',
    SW: '⚙️'
  };

  constructor() {
    // Enable debug mode in development or with query param
    this.enabled = import.meta.env.DEV || 
      new URLSearchParams(window.location.search).has('debug');
    
    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__pwaDebug = this;
    }
  }

  private formatTime(): string {
    return new Date().toISOString();
  }

  private getPrefix(category: keyof typeof this.categories): string {
    return this.categories[category] || '📝';
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTime(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);

    // Keep log size manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to localStorage for persistence
    try {
      const storedLogs = JSON.parse(localStorage.getItem('pwa-debug-logs') || '[]');
      storedLogs.push(entry);
      if (storedLogs.length > 100) {
        storedLogs.splice(0, storedLogs.length - 100);
      }
      localStorage.setItem('pwa-debug-logs', JSON.stringify(storedLogs));
    } catch (e) {
      // Ignore storage errors
    }
  }

  debug(category: keyof typeof this.categories, message: string, data?: any) {
    if (!this.enabled) return;
    const prefix = this.getPrefix(category);
    console.debug(`${prefix} [${category}] ${message}`, data || '');
    this.addLog('debug', category, message, data);
  }

  info(category: keyof typeof this.categories, message: string, data?: any) {
    const prefix = this.getPrefix(category);
    console.info(`${prefix} [${category}] ${message}`, data || '');
    this.addLog('info', category, message, data);
  }

  warn(category: keyof typeof this.categories, message: string, data?: any) {
    const prefix = this.getPrefix(category);
    console.warn(`${prefix} [${category}] ${message}`, data || '');
    this.addLog('warn', category, message, data);
  }

  error(category: keyof typeof this.categories, message: string, data?: any) {
    const prefix = this.getPrefix(category);
    console.error(`${prefix} [${category}] ${message}`, data || '');
    this.addLog('error', category, message, data);
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs from localStorage
  getStoredLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('pwa-debug-logs') || '[]');
    } catch {
      return [];
    }
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('pwa-debug-logs');
  }

  // Export logs as JSON string
  exportLogs(): string {
    return JSON.stringify({
      memoryLogs: this.logs,
      storedLogs: this.getStoredLogs(),
      exportedAt: this.formatTime(),
      userAgent: navigator.userAgent,
      online: navigator.onLine
    }, null, 2);
  }

  // Log service worker events
  logSWEvent(event: string, data?: any) {
    this.info('SW', `Service Worker: ${event}`, data);
  }

  // Log sync events
  logSyncEvent(event: string, data?: any) {
    this.info('SYNC', `Sync: ${event}`, data);
  }

  // Log cache events  
  logCacheEvent(event: string, data?: any) {
    this.debug('CACHE', `Cache: ${event}`, data);
  }

  // Log network events
  logNetworkEvent(event: string, data?: any) {
    this.debug('NETWORK', `Network: ${event}`, data);
  }

  // Log PWA lifecycle events
  logPWAEvent(event: string, data?: any) {
    this.info('PWA', `PWA: ${event}`, data);
  }

  // Log offline events
  logOfflineEvent(event: string, data?: any) {
    this.info('OFFLINE', `Offline: ${event}`, data);
  }
}

export const pwaLogger = new DebugLogger();

// Helper to get current connection info
export function getConnectionInfo() {
  const connection = (navigator as any).connection;
  return {
    online: navigator.onLine,
    type: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 'unknown',
    rtt: connection?.rtt || 'unknown',
    saveData: connection?.saveData || false
  };
}
