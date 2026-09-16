const safeJson = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10000);
  try { return JSON.stringify(value).slice(0, 10000); } catch { return '[unserializable]'; }
};

export function normalizeLogEvent(input = {}) {
  return {
    category: String(input.category || 'system'),
    source: String(input.source || 'ultimate-api'),
    action: String(input.action || 'event'),
    severity: String(input.severity || 'info'),
    user_id: input.user_id ?? input.userId ?? null,
    user_name: input.user_name ?? input.userName ?? null,
    user_email: input.user_email ?? input.userEmail ?? null,
    table_name: input.table_name ?? null,
    item_id: input.item_id == null ? null : String(input.item_id),
    details: safeJson(input.details),
    request_id: input.request_id ?? input.requestId ?? null,
    actor_ip: input.actor_ip ?? input.ipAddress ?? null,
    user_agent: input.user_agent ?? input.userAgent ?? null,
    metadata: safeJson(input.metadata),
  };
}

export function createEventLogger({ prisma, logToFile }) {
  const diagnostics = { writes: 0, failures: 0, lastSuccessfulEvent: null, lastError: null };
  const write = async (input, req = null) => {
    const event = normalizeLogEvent({ ...input,
      request_id: input.request_id || req?.requestId,
      actor_ip: input.actor_ip || req?.ip,
      user_agent: input.user_agent || req?.headers?.['user-agent'],
    });
    try {
      const common = { ...event, actor_name: event.user_name || 'System', actor_email: event.user_email || 'admin@growthtrack.ultimate' };
      let record;
      if (event.category === 'auth') {
        record = await prisma.loginLog.create({ data: { user_id: event.user_id, email: event.user_email, action: event.action, failure_reason: event.details, ip_address: event.actor_ip, user_agent: event.user_agent, source: event.source, request_id: event.request_id, metadata: event.metadata } });
      } else if (event.category === 'session') {
        record = await prisma.sessionLog.create({ data: { user_id: event.user_id, action: event.action, details: event.details, ip_address: event.actor_ip, user_agent: event.user_agent, source: event.source, request_id: event.request_id, metadata: event.metadata } });
      } else {
        record = await prisma.auditLog.create({ data: common });
      }
      diagnostics.writes += 1; diagnostics.lastSuccessfulEvent = { ...event, timestamp: new Date().toISOString() }; diagnostics.lastError = null;
      try { logToFile(event.severity, `${event.category}:${event.action}`, event); } catch {}
      return record?.id || true;
    } catch (error) {
      diagnostics.failures += 1; diagnostics.lastError = String(error?.message || error); try { logToFile('error', 'logging_failure', { error: diagnostics.lastError }); } catch {} return false;
    }
  };
  return { write, diagnostics, queueSize: () => 0 };
}
