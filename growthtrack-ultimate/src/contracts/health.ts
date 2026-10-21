import { z } from 'zod';

/** Wire protocol only. Mount/service implementation belongs to the backend owner. */
export const HEALTH_PROTOCOL_VERSION = 1 as const;
export const HEALTH_METRICS = ['weight', 'steps', 'sleep', 'workouts'] as const;
export const HEALTH_PROVIDERS = ['apple_health', 'health_connect'] as const;
export const HEALTH_LIMITS = { pageSize: 200, maxWindowDays: 8, pairingLifetimeSeconds: 120 } as const;
export const HEALTH_ROUTES = {
  pairings: '/api/health-companions/pairings',
  redeem: '/api/health-companions/pairings/redeem',
  connection: '/api/health-companions/connection',
  consent: '/api/health-companions/connection/consent',
  batches: '/api/health-companions/batches',
} as const;

export const HealthMetricSchema = z.enum(HEALTH_METRICS);
export const HealthProviderSchema = z.enum(HEALTH_PROVIDERS);
// UTC only; no timezone-free dates or numeric timestamps. Native fractional precision may differ.
export const UtcInstantSchema = z.iso.datetime({ offset: false });
const Id = z.string().min(1).max(256).regex(/^[^\s\u0000-\u001f\u007f]+$/);
const Uuid = z.uuid();
export const PairingCodeSchema = z.string().regex(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/);
export const HttpsOriginSchema = z.string().max(2048).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
      && !url.search && !url.hash && (url.pathname === '/' || url.pathname === '');
  } catch { return false; }
}, 'Expected an HTTPS origin without credentials, path, query, or fragment');

export const HealthPermissionSchema = z.strictObject({
  optedIn: z.boolean(),
  access: z.enum(['not_requested', 'unknown', 'granted', 'denied', 'unavailable']),
}).refine(p => p.optedIn || p.access === 'not_requested', 'Disabled metrics must be not_requested');
export const HealthPermissionsSchema = z.strictObject({
  weight: HealthPermissionSchema, steps: HealthPermissionSchema,
  sleep: HealthPermissionSchema, workouts: HealthPermissionSchema,
});
export const HealthConsentSchema = z.strictObject({ permissions: HealthPermissionsSchema });
export const CreateHealthPairingSchema = z.strictObject({ provider: HealthProviderSchema });
export const HealthPairingSchema = z.strictObject({ code: PairingCodeSchema, expiresAt: UtcInstantSchema });
export const RedeemHealthPairingSchema = z.strictObject({
  code: PairingCodeSchema, provider: HealthProviderSchema,
  deviceName: z.string().trim().min(1).max(80),
});
export const HealthCredentialsSchema = z.strictObject({
  connectionId: Uuid, provider: HealthProviderSchema,
  accessToken: z.string().min(32).max(512).regex(/^[A-Za-z0-9_-]+$/),
  expiresAt: UtcInstantSchema,
});
export const HealthConnectionSchema = z.strictObject({
  connectionId: Uuid, provider: HealthProviderSchema,
  status: z.enum(['active', 'revoked']), permissions: HealthPermissionsSchema,
  lastReceivedAt: UtcInstantSchema.nullable(),
});

const SourceSchema = z.strictObject({
  provider: HealthProviderSchema, externalId: Id, origin: Id,
  modifiedAt: UtcInstantSchema.optional(),
});
const common = { source: SourceSchema, startAt: UtcInstantSchema, endAt: UtcInstantSchema };
export const HealthSampleSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('weight'), ...common,
    value: z.strictObject({ kilograms: z.number().finite().positive().max(1000) }) }),
  z.strictObject({ kind: z.literal('steps'), ...common,
    value: z.strictObject({ count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }) }),
  z.strictObject({ kind: z.literal('sleep'), ...common,
    value: z.strictObject({ stage: z.enum(['session', 'in_bed', 'asleep', 'awake', 'core', 'deep', 'rem']) }) }),
  z.strictObject({ kind: z.literal('workouts'), ...common,
    value: z.strictObject({ activityCode: Id, durationSeconds: z.number().finite().positive() }) }),
]).superRefine((s, context) => {
  const duration = (Date.parse(s.endAt) - Date.parse(s.startAt)) / 1000;
  if (s.kind === 'weight' ? duration !== 0 : duration <= 0)
    context.addIssue({ code: 'custom', message: 'Weight must be an instant; intervals must have positive duration' });
  if (s.kind === 'workouts' && s.value.durationSeconds > duration + 0.001)
    context.addIssue({ code: 'custom', message: 'Workout duration exceeds its interval' });
  if (s.source.provider === 'apple_health' && s.source.modifiedAt !== undefined)
    context.addIssue({ code: 'custom', message: 'HealthKit has no sample modification timestamp' });
});
export const HealthDeletionSchema = z.strictObject({
  kind: HealthMetricSchema,
  source: z.strictObject({ provider: HealthProviderSchema, externalId: Id }),
});
export const HealthBatchSchema = z.strictObject({
  protocolVersion: z.literal(HEALTH_PROTOCOL_VERSION), connectionId: Uuid, batchId: Uuid,
  metric: HealthMetricSchema, windowStart: UtcInstantSchema, windowEnd: UtcInstantSchema,
  samples: z.array(HealthSampleSchema).max(HEALTH_LIMITS.pageSize),
  deletions: z.array(HealthDeletionSchema).max(HEALTH_LIMITS.pageSize),
}).superRefine((batch, context) => {
  const start = Date.parse(batch.windowStart), end = Date.parse(batch.windowEnd);
  if (end <= start || end - start > HEALTH_LIMITS.maxWindowDays * 86400000)
    context.addIssue({ code: 'custom', message: 'Window must be positive and at most eight days' });
  if (batch.samples.length + batch.deletions.length > HEALTH_LIMITS.pageSize)
    context.addIssue({ code: 'custom', message: 'At most 200 operations per batch' });
  const keys = new Set<string>();
  const providers = new Set<string>();
  for (const operation of [...batch.samples, ...batch.deletions]) {
    if (operation.kind !== batch.metric)
      context.addIssue({ code: 'custom', message: 'All operations must match the batch metric' });
    const key = healthSourceKey(operation);
    if (keys.has(key)) context.addIssue({ code: 'custom', message: 'Duplicate source ID in batch' });
    keys.add(key); providers.add(operation.source.provider);
  }
  if (providers.size > 1) context.addIssue({ code: 'custom', message: 'A batch must have one provider' });
  for (const sample of batch.samples) {
    if (Date.parse(sample.startAt) < start || Date.parse(sample.endAt) > end)
      context.addIssue({ code: 'custom', message: 'Sample outside read window' });
  }
});
export const HealthBatchAckSchema = z.strictObject({
  batchId: Uuid, accepted: z.literal(true), syncedAt: UtcInstantSchema,
});
export const HealthErrorSchema = z.strictObject({
  code: z.enum(['PAIRING_INVALID_OR_EXPIRED', 'PAIRING_PROVIDER_MISMATCH', 'CONNECTION_REVOKED',
    'TOKEN_EXPIRED', 'UNAUTHORIZED', 'CONSENT_REQUIRED', 'INVALID_PAYLOAD', 'BATCH_CONFLICT',
    'RATE_LIMITED', 'SERVICE_UNAVAILABLE']),
  message: z.string().min(1).max(200),
});

export type HealthMetric = z.infer<typeof HealthMetricSchema>;
export type HealthProvider = z.infer<typeof HealthProviderSchema>;
export type HealthSample = z.infer<typeof HealthSampleSchema>;
export type HealthDeletion = z.infer<typeof HealthDeletionSchema>;
export type HealthBatch = z.infer<typeof HealthBatchSchema>;
export type HealthPermissions = z.infer<typeof HealthPermissionsSchema>;
export type HealthCredentials = z.infer<typeof HealthCredentialsSchema>;
export type HealthConnection = z.infer<typeof HealthConnectionSchema>;

/** Scope by authenticated owner as well; never dedupe by day/value or match a manual row. */
export function healthSourceKey(operation: HealthSample | HealthDeletion): string {
  return JSON.stringify([operation.source.provider, operation.kind, operation.source.externalId]);
}

/** Contextual checks in addition to structural parsing; server must repeat these. */
export function parseHealthBatch(input: unknown, connection: HealthConnection): HealthBatch {
  const batch = HealthBatchSchema.parse(input);
  if (connection.status !== 'active' || batch.connectionId !== connection.connectionId)
    throw new Error('CONNECTION_REVOKED');
  if (!connection.permissions[batch.metric].optedIn) throw new Error('CONSENT_REQUIRED');
  const access = connection.permissions[batch.metric].access;
  if (connection.provider === 'apple_health' ? access !== 'unknown' : access !== 'granted')
    throw new Error('CONSENT_REQUIRED');
  if ([...batch.samples, ...batch.deletions].some(s => s.source.provider !== connection.provider))
    throw new Error('INVALID_PAYLOAD');
  return batch;
}
