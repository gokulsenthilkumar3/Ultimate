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

        // Fetch all wallets for the user
        const result = await query(
            'SELECT id, balance, currency, type FROM wallets WHERE user_id = $1',
            [userId]
        );

        const wallets = result.rows;

        // Calculate total balance (assuming all in same currency for demo, or converting if needed)
        // For now, we'll sum them up.
        const totalBalance = wallets.reduce((acc, wallet) => acc + parseFloat(wallet.balance), 0);

        return NextResponse.json({
            totalBalance,
            wallets,
            currency: 'USD', // Default display currency
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
