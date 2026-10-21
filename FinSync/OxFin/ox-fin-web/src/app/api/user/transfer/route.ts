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

        const { fromWalletId, toWalletId, amount, description } = await req.json();

        if (!fromWalletId || !toWalletId || !amount || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: 'Invalid transfer details' }, { status: 400 });
        }

        const userId = session.user.id;
        const transferAmount = parseFloat(amount);

        client = await db.connect();
        await client.query('BEGIN');

        // 1. Verify source wallet exists, belongs to user, and has enough balance
        const fromWalletRes = await client.query(
            'SELECT balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [fromWalletId, userId]
        );

        if (fromWalletRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Source wallet not found or access denied' }, { status: 404 });
        }

        const currentBalance = parseFloat(fromWalletRes.rows[0].balance);
        if (currentBalance < transferAmount) {
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
            [fromWalletId, -transferAmount, 'withdrawal', desc]
        );

        await client.query(
            'INSERT INTO transactions (wallet_id, amount, type, description) VALUES ($1, $2, $3, $4)',
            [toWalletId, transferAmount, 'deposit', `Transfer from ${fromWalletId}`]
        );

        await client.query('COMMIT');

        return NextResponse.json({
            message: 'Transfer successful',
            amount: transferAmount,
            fromWalletId,
            toWalletId
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Transfer error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}
