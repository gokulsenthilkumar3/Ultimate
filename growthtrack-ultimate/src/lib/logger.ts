import { apiRequest } from './apiClient';

/**
 * GrowthTrack Logger - Centralized logging system
 * Handles authentication, CRUD, session, and system logs
 */

export type LogCategory = 'auth' | 'crud' | 'session' | 'system';
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';
export type LogAction = 
  // Auth actions
  | 'login_success' | 'login_failed' | 'signup' | 'logout' | 'session_created' | 'session_expired' | 'session_refreshed'
  // CRUD actions
  | 'create' | 'update' | 'delete' | 'bulk_create' | 'bulk_delete'
  // Session actions
  | 'session_start' | 'session_validate' | 'session_end' | 'page_view'
  // System actions
  | 'export' | 'import' | 'sync' | 'error';

export interface LogEntry {
  id?: number;
  category: LogCategory;
  action: LogAction;
  table_name?: string;
  item_id?: string;
  details: string;
  timestamp?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  actor_ip?: string;
  user_agent?: string;
  severity?: LogSeverity;
}

export interface SessionLogEntry {
  id?: number;
  user_id?: string;
  session_token?: string;
  action: 'start' | 'end' | 'validate' | 'refresh';
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  details?: string;
}

export interface LoginLogEntry {
  id?: number;
  user_id?: string;
  email?: string;
  action: 'login_success' | 'login_failed' | 'signup' | 'logout';
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  failure_reason?: string;
}

/**
 * Get client IP address (fallback to unknown)
 */
/**
 * Get current user info from storage
 */
function getCurrentUser(): { user_id?: string; user_name?: string; user_email?: string } {
  const userStr = localStorage.getItem('growthtrack-user') || sessionStorage.getItem('growthtrack-user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return {
        user_id: user.id,
        user_name: user.fullName || user.name,
        user_email: user.email
      };
    } catch {}
  }
  return {};
}

/**
 * Core logging function - sends to audit_log table
 */
export async function logAction(entry: LogEntry): Promise<void> {
  try {
    const user = getCurrentUser();
    const payload: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      user_id: entry.user_id || user.user_id,
      user_name: entry.user_name || user.user_name,
      user_email: entry.user_email || user.user_email,
      severity: entry.severity || 'info'
    };

    await apiRequest('/api/logs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[Logger] Failed to log action:', error);
  }
}

/**
 * Log authentication events
 */
export async function logAuth(
  action: 'login_success' | 'login_failed' | 'signup' | 'logout',
  email?: string,
  failureReason?: string
): Promise<void> {
  const user = getCurrentUser();
  
  await logAction({
    category: 'auth',
    action,
    table_name: 'users',
    item_id: user.user_id,
    details: failureReason 
      ? `Authentication failed: ${failureReason}`
      : `User ${action} for ${email || user.user_email}`,
    user_email: email || user.user_email,
    severity: action === 'login_failed' ? 'warning' : 'info'
  });

  // Login success/failure is written by the server, where the actor and IP
  // cannot be forged by client payloads.
}

/**
 * Log CRUD operations
 */
export async function logCRUD(
  action: 'create' | 'update' | 'delete' | 'bulk_create' | 'bulk_delete',
  tableName: string,
  itemId: string | number,
  details: string,
  severity: LogSeverity = 'info'
): Promise<void> {
  await logAction({
    category: 'crud',
    action,
    table_name: tableName,
    item_id: String(itemId),
    details,
    severity
  });
}

/**
 * Log session events
 */
export async function logSession(
  action: 'start' | 'end' | 'validate' | 'refresh',
  details?: string
): Promise<void> {
  const user = getCurrentUser();
  
  await logAction({
    category: 'session',
    action: action === 'start' ? 'session_start' : 
           action === 'end' ? 'session_end' :
           action === 'validate' ? 'session_validate' : 'session_refreshed',
    table_name: 'sessions',
    item_id: user.user_id,
    details: details || `Session ${action}`,
    severity: 'info'
  });

  // Also log to session_logs table
  try {
    await apiRequest('/api/session-logs', {
      method: 'POST',
      body: JSON.stringify({
        action,
        details
      })
    });
  } catch (error) {
    console.error('[Logger] Failed to log to session_logs:', error);
  }
}

/**
 * Log page views
 */
export async function logPageView(pageName: string): Promise<void> {
  await logAction({
    category: 'session',
    action: 'page_view',
    table_name: 'navigation',
    details: `User navigated to ${pageName}`,
    severity: 'info'
  });
}

/**
 * Log system events
 */
export async function logSystem(
  action: 'export' | 'import' | 'sync' | 'error',
  details: string,
  severity: LogSeverity = 'info'
): Promise<void> {
  await logAction({
    category: 'system',
    action,
    details,
    severity
  });
}

/**
 * Log errors
 */
export async function logError(error: Error, context?: string): Promise<void> {
  await logSystem('error', `${context || 'Error occurred'}: ${error.message}`, 'error');
}
