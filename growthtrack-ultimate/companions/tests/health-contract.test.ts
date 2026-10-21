import { describe, expect, it } from 'vitest';
import { HealthBatchSchema, HealthCredentialsSchema, HealthPermissionsSchema, HttpsOriginSchema,
  PairingCodeSchema, healthSourceKey, parseHealthBatch, type HealthConnection } from '../../src/contracts/health';

const id = '22222222-2222-4222-8222-222222222222';
const source = { provider: 'apple_health' as const, externalId: 'sample-1', origin: 'com.apple.health' };
const sample = { kind: 'weight' as const, source, startAt: '2026-09-28T10:00:00Z',
  endAt: '2026-09-28T10:00:00Z', value: { kilograms: 72.5 } };
const batch = () => ({ protocolVersion: 1, connectionId: id, batchId: id, metric: 'weight',
  windowStart: '2026-09-22T00:00:00Z', windowEnd: '2026-09-29T00:00:00Z', samples: [sample], deletions: [] });
const permissions = { weight: { optedIn: true, access: 'unknown' as const },
  steps: { optedIn: false, access: 'not_requested' as const },
  sleep: { optedIn: false, access: 'not_requested' as const },
  workouts: { optedIn: false, access: 'not_requested' as const } };
const connection: HealthConnection = { connectionId: id, provider: 'apple_health', status: 'active',
  permissions, lastReceivedAt: null };

describe('health wire boundary', () => {
  it('accepts real UTC samples and deletion-only/empty acknowledgement batches', () => {
    expect(parseHealthBatch(batch(), connection).samples[0]).toEqual(sample);
    expect(HealthBatchSchema.parse({ ...batch(), samples: [], deletions: [
      { kind: 'weight', source: { provider: 'apple_health', externalId: 'sample-1' } },
    ] }).deletions).toHaveLength(1);
    expect(HealthBatchSchema.safeParse({ ...batch(), samples: [] }).success).toBe(true);
  });
  it('rejects unknown/manual/owner fields, wrong units, strings, and nonfinite values', () => {
    for (const s of [{ ...sample, userId: 'owner' }, { ...sample, source: { ...source, manual: true } },
      { ...sample, value: { pounds: 150 } }, { ...sample, value: { kilograms: '72' } },
      { ...sample, value: { kilograms: Infinity } }, { ...sample, value: { kilograms: NaN } }])
      expect(HealthBatchSchema.safeParse({ ...batch(), samples: [s] }).success).toBe(false);
    expect(HealthBatchSchema.safeParse({ ...batch(), overwriteManual: true }).success).toBe(false);
  });
  it('rejects offsets, local dates, reversed/oversized windows, and outside samples', () => {
    for (const windowEnd of ['2026-09-29', '2026-09-29T00:00:00+05:30', '2026-09-21T00:00:00Z', '2026-10-02T00:00:00Z'])
      expect(HealthBatchSchema.safeParse({ ...batch(), windowEnd }).success).toBe(false);
    expect(HealthBatchSchema.safeParse({ ...batch(), windowStart: '2026-09-28T11:00:00Z' }).success).toBe(false);
  });
  it('bounds operations and rejects duplicates, mixed providers and metric confusion', () => {
    expect(HealthBatchSchema.safeParse({ ...batch(), samples: Array(201).fill(sample) }).success).toBe(false);
    expect(HealthBatchSchema.safeParse({ ...batch(), samples: [sample, sample] }).success).toBe(false);
    expect(HealthBatchSchema.safeParse({ ...batch(), metric: 'sleep' }).success).toBe(false);
    expect(HealthBatchSchema.safeParse({ ...batch(), samples: [sample, { ...sample,
      source: { ...source, provider: 'health_connect', externalId: 'other' } }] }).success).toBe(false);
  });
  it('checks connection identity, revocation, consent and provider against server state', () => {
    expect(() => parseHealthBatch(batch(), { ...connection, status: 'revoked' })).toThrow('CONNECTION_REVOKED');
    expect(() => parseHealthBatch(batch(), { ...connection, connectionId: '33333333-3333-4333-8333-333333333333' })).toThrow();
    expect(() => parseHealthBatch(batch(), { ...connection, provider: 'health_connect' })).toThrow('INVALID_PAYLOAD');
    expect(() => parseHealthBatch(batch(), { ...connection, permissions: { ...permissions,
      weight: { optedIn: false, access: 'not_requested' } } })).toThrow('CONSENT_REQUIRED');
  });
  it('preserves provider/metric/source identity across retries without using value or origin', () => {
    expect(healthSourceKey(sample)).toBe(healthSourceKey({ ...sample, value: { kilograms: 73 },
      source: { ...source, origin: 'changed' } }));
    expect(healthSourceKey(sample)).not.toBe(healthSourceKey({ ...sample, source: { ...source, externalId: 'other' } }));
  });
  it('rejects fabricated HealthKit modification dates and invalid interval semantics', () => {
    expect(HealthBatchSchema.safeParse({ ...batch(), samples: [{ ...sample,
      source: { ...source, modifiedAt: sample.startAt } }] }).success).toBe(false);
    expect(HealthBatchSchema.safeParse({ ...batch(), metric: 'workouts', samples: [{ ...sample,
      kind: 'workouts', endAt: '2026-09-28T10:10:00Z', value: { activityCode: 'hk:37', durationSeconds: 601 } }] }).success).toBe(false);
  });
  it('requires all consent entries and safe pairing/HTTPS credentials', () => {
    expect(HealthPermissionsSchema.safeParse({ weight: permissions.weight }).success).toBe(false);
    expect(PairingCodeSchema.safeParse('1AB2CD3EF4').success).toBe(true);
    expect(PairingCodeSchema.safeParse('123').success).toBe(false);
    for (const endpoint of ['http://example.com', 'https://user:token@example.com', 'https://example.com/api', 'https://example.com/?token=x'])
      expect(HttpsOriginSchema.safeParse(endpoint).success).toBe(false);
    expect(HttpsOriginSchema.safeParse('https://example.com:443').success).toBe(true);
    expect(HealthCredentialsSchema.safeParse({ connectionId: id, provider: 'apple_health',
      accessToken: 'secret', expiresAt: '2026-09-29T00:00:00Z' }).success).toBe(false);
  });
});
