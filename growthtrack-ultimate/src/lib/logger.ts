import safeLocalStorage from '../utils/safeLocalStorage';
import { apiRequest, getCsrfToken, refreshCsrfToken } from './apiClient';

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
  const userStr = safeLocalStorage.getItem('growthtrack-user') || sessionStorage.getItem('growthtrack-user');
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

let authUser: ReturnType<typeof getCurrentUser> = {};
const queue: LogEntry[] = [];
const recent = new Map<string, number>();
let flushTimer: number | undefined;
export function setLoggingUser(user: any) {
  authUser = user ? { user_id: user.id, user_name: user.fullName || user.name, user_email: user.email } : {};
  if (authUser.user_id) void flushLogQueue();
}
function scheduleFlush() { if (flushTimer) return; flushTimer = window.setTimeout(() => { flushTimer = undefined; void flushLogQueue(); }, 350); }
export async function flushLogQueue(): Promise<void> {
  if (!getCsrfToken() || !authUser.user_id || !queue.length) return;
  while (queue.length) {
    const event = queue[0];
    try { await apiRequest('/api/logs', { method: 'POST', body: JSON.stringify(event) }); queue.shift(); }
    catch (error: any) {
      if (error?.status === 403) {
        try { await refreshCsrfToken(); await apiRequest('/api/logs', { method: 'POST', body: JSON.stringify(event) }); queue.shift(); continue; } catch {}
      }
      if (error?.status === 401) queue.shift();
      break;
    }
  }
}

/**
 * Core logging function - sends to audit_log table
 */
export async function logAction(entry: LogEntry): Promise<void> {
  const currentUser = authUser.user_id ? authUser : getCurrentUser();
  const payload: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      user_id: entry.user_id || currentUser.user_id,
      user_name: entry.user_name || currentUser.user_name,
      user_email: entry.user_email || currentUser.user_email,
      severity: entry.severity || 'info'
    };
  const key = `${payload.category}|${payload.action}|${payload.table_name || ''}|${payload.item_id || ''}|${payload.details}`;
  const now = Date.now(); if (recent.has(key) && now - recent.get(key)! < 2000) return; recent.set(key, now);
  if (!payload.user_id) return;
  // Queue the event and schedule a batched flush — do NOT call flushLogQueue()
  // inline here. Doing so causes 403s on first session mount: the CSRF token
  // may be stale and hasn't been refreshed yet. The scheduled flush (350 ms)
  // fires after React's commit phase, by which time the token is current.
  queue.push(payload); if (queue.length > 100) queue.shift(); scheduleFlush();
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
  if (!user.user_id || !getCsrfToken()) return;
  
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

}

/**
 * Log page views
 */
export async function logPageView(pageName: string): Promise<void> {
  // Degrade silently when there is no authenticated session. This prevents
  // 401 console errors during the login page and first-paint before the CSRF
  // token has been exchanged.
  if (!getCsrfToken()) return;
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
