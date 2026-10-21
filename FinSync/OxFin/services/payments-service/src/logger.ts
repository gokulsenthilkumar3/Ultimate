export interface LogContext { service: string; requestId?: string; userId?: string; [key: string]: any; }

export function logInfo(message: string, context: LogContext): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', message, ...context }));
}

export function logError(message: string, context: LogContext, error?: any): void {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR', message, error: error?.message || error, stack: error?.stack, ...context }));
}

export function logWarn(message: string, context: LogContext): void {
  console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', message, ...context }));
}