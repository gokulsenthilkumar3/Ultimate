import { db } from '@/lib/db';
import { adminServiceAuthorized, adminDirectoryInput } from '@/lib/adminDirectory';

export const runtime = 'nodejs';
let active = 0;
export async function GET(request: Request) {
    const headers = { 'Cache-Control': 'no-store' };
    if (!adminServiceAuthorized(request.headers.get('authorization'), process.env.OXFIN_ADMIN_SERVICE_TOKEN)) return Response.json({ code: 'SERVICE_AUTH_REQUIRED' }, { status: 401, headers });
    let input;
    try { input = adminDirectoryInput(request.url); } catch { return Response.json({ code: 'INVALID_FILTER' }, { status: 400, headers }); }
    if (active >= 4) return Response.json({ code: 'DIRECTORY_BUSY' }, { status: 503, headers });
    active++;
    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
        await client.query("SET LOCAL statement_timeout = '5000ms'");
        const where = "WHERE ($1 = '' OR POSITION(lower($1) IN lower(COALESCE(name, '') || ' ' || email)) > 0) AND ($2 = '' OR $2 = 'unavailable') AND ($3 = '' OR $3 = 'unavailable')";
        const filters = [input.q, input.status, input.plan];
        const total = await client.query(`SELECT count(*)::text AS total FROM users ${where}`, filters);
        const result = await client.query(`SELECT id::text, name, email FROM users ${where} ORDER BY id LIMIT $4 OFFSET $5`, [...filters, input.limit, input.offset]);
        await client.query('COMMIT');
        return Response.json({ product: 'oxfin', total: Number(total.rows[0].total), limit: input.limit, offset: input.offset, rows: result.rows.map(row => ({ id: row.id, product: 'oxfin', name: String(row.name || '').slice(0, 500), email: String(row.email || '').slice(0, 500), status: 'unavailable', plan: 'unavailable', lastActiveAt: null })) }, { headers });
    } catch {
        if (client) await client.query('ROLLBACK').catch(() => {});
        return Response.json({ code: 'DIRECTORY_UNAVAILABLE' }, { status: 503, headers });
    } finally { client?.release(); active--; }
}
