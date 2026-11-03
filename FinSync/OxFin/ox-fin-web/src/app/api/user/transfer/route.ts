import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    let client;
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid transfer details' }, { status: 400 });
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid transfer details' }, { status: 400 });
        }
        const { fromWalletId, toWalletId, amount, description } = body;

        const userId = session.user.id;
        const transferAmount = String(amount);
        const requestKey = req.headers.get('Idempotency-Key');
        const validWalletId = (id: unknown) => (typeof id === 'number' || typeof id === 'string')
            && /^[1-9]\d{0,9}$/.test(String(id)) && Number(id) <= 2147483647;
        if (!requestKey || !/^[a-zA-Z0-9_-]{16,128}$/.test(requestKey)
            || (typeof amount !== 'number' && typeof amount !== 'string')
            || !/^\d{1,10}(\.\d{1,2})?$/.test(transferAmount) || Number(transferAmount) <= 0
            || !validWalletId(fromWalletId) || !validWalletId(toWalletId) || Number(fromWalletId) === Number(toWalletId)
            || (description != null && typeof description !== 'string')) {
            return NextResponse.json({ error: 'Use distinct wallets, a positive amount with at most two decimals, and an Idempotency-Key.' }, { status: 400 });
        }
        const fingerprint = JSON.stringify([Number(fromWalletId), Number(toWalletId), Number(transferAmount).toFixed(2), description || '']);

        client = await db.connect();
        await client.query('BEGIN');
        // Serialize retries before locking wallets; key ownership is per account.
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [userId + ':' + requestKey]);
        const replay = await client.query('SELECT fingerprint, response FROM transfer_requests WHERE user_id = $1 AND request_key = $2', [userId, requestKey]);
        if (replay.rows.length) {
            await client.query('ROLLBACK');
            return replay.rows[0].fingerprint === fingerprint
                ? NextResponse.json(replay.rows[0].response)
                : NextResponse.json({ error: 'Idempotency key was already used for a different transfer.' }, { status: 409 });
        }
        // Lock in a stable order so opposite-direction transfers cannot deadlock.
        const locked = await client.query('SELECT id, currency FROM wallets WHERE id = ANY($1::int[]) AND user_id = $2 ORDER BY id FOR UPDATE', [[Number(fromWalletId), Number(toWalletId)], userId]);
        if (locked.rows.length !== 2 || locked.rows[0].currency !== locked.rows[1].currency) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Choose two owned wallets with the same currency.' }, { status: 400 });
        }

        // 1. Verify source wallet exists, belongs to user, and has enough balance
        const fromWalletRes = await client.query(
            'SELECT balance >= $3::numeric AS sufficient FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [fromWalletId, userId, transferAmount]
        );

        if (fromWalletRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Source wallet not found or access denied' }, { status: 404 });
        }

        if (!fromWalletRes.rows[0].sufficient) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
        }

        // 2. Verify destination wallet exists (for internal transfers, we check user_id too)
        const toWalletRes = await client.query(
            'SELECT id FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [toWalletId, userId]
        );

        if (toWalletRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Destination wallet not found or access denied' }, { status: 404 });
        }

        // 3. Perform the transfer
        await client.query(
            'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
            [transferAmount, fromWalletId]
        );

        await client.query(
            'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
            [transferAmount, toWalletId]
        );

        // 4. Record transactions
        const desc = description || `Transfer to ${toWalletId}`;
        await client.query(
            'INSERT INTO transactions (wallet_id, amount, type, description) VALUES ($1, $2, $3, $4)',
            [fromWalletId, '-' + transferAmount, 'withdrawal', desc]
        );

        await client.query(
            'INSERT INTO transactions (wallet_id, amount, type, description) VALUES ($1, $2, $3, $4)',
            [toWalletId, transferAmount, 'deposit', `Transfer from ${fromWalletId}`]
        );

        const response = { message: 'Transfer successful', amount: Number(transferAmount), fromWalletId, toWalletId };
        await client.query('INSERT INTO transfer_requests (user_id, request_key, fingerprint, response) VALUES ($1, $2, $3, $4::jsonb)', [userId, requestKey, fingerprint, JSON.stringify(response)]);
        await client.query('COMMIT');

        return NextResponse.json(response);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Transfer error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}
