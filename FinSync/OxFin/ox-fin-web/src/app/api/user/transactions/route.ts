import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Fetch recent transactions for the user across all their wallets
        const result = await query(
            `SELECT t.id, t.amount, t.type, t.description, t.created_at, w.currency 
             FROM transactions t
             JOIN wallets w ON t.wallet_id = w.id
             WHERE w.user_id = $1
             ORDER BY t.created_at DESC
             LIMIT 20`,
            [userId]
        );

        return NextResponse.json({
            transactions: result.rows
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
