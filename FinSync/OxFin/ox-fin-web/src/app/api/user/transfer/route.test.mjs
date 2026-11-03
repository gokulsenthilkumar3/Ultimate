import { vi, test, expect, beforeEach } from 'vitest';
import { POST } from './route.ts';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('../../auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ db: { connect: vi.fn() } }));

const request = (amount = '0.29', key = 'retry_key_123456789') => new Request('http://localhost/api/user/transfer', {
 method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
 body: JSON.stringify({ fromWalletId: 1, toWalletId: 2, amount })
});
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getServerSession).mockResolvedValue({ user: { id: '1' } }); });
test.each(['NaN', '1.001', '2oops', '-1', '0'])('rejects invalid amount %s before connecting', async amount => {
 expect((await POST(request(amount))).status).toBe(400); expect(db.connect).not.toHaveBeenCalled();
});
test.each([true, [1], 0, -1, 2147483648, '1oops'])('rejects invalid SERIAL wallet ID %s before connecting', async fromWalletId => {
 const req = new Request('http://localhost/api/user/transfer', { method: 'POST', headers: { 'Idempotency-Key': 'retry_key_123456789' }, body: JSON.stringify({ fromWalletId, toWalletId: 2, amount: '0.29' }) });
 expect((await POST(req)).status).toBe(400); expect(db.connect).not.toHaveBeenCalled();
});
test('rejects malformed JSON before connecting', async () => {
 expect((await POST(new Request('http://localhost/api/user/transfer', {method:'POST', body:'{'}))).status).toBe(400);
 expect(db.connect).not.toHaveBeenCalled();
});
test('rejects cross-currency transfers without changing balances', async () => {
 const query = vi.fn(async (sql) => ({ rows: sql.includes('SELECT id, currency') ? [{id:1,currency:'USD'},{id:2,currency:'INR'}] : [] }));
 vi.mocked(db.connect).mockResolvedValue({ query, release: vi.fn() });
 expect((await POST(request())).status).toBe(400);
 expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});
test('replays committed response without debiting again', async () => {
 const response = { message: 'Transfer successful', amount: .29, fromWalletId:1,toWalletId:2 };
 const query = vi.fn(async (sql) => ({ rows: sql.includes('SELECT fingerprint') ? [{ fingerprint: JSON.stringify([1,2,'0.29','']), response }] : [] }));
 vi.mocked(db.connect).mockResolvedValue({ query, release: vi.fn() });
 expect(await (await POST(request())).json()).toEqual(response);
 expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});
