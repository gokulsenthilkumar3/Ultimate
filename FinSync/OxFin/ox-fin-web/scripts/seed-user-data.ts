import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedUser(email: string) {
    if (!email) {
        console.error('Usage: npx ts-node scripts/seed-user-data.ts user@example.com');
        process.exit(1);
    }

    console.log(`🌱 Seeding data for: ${email}...`);

    try {
        // 1. Find the user
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.error(`❌ User not found: ${email}`);
            process.exit(1);
        }
        const userId = userRes.rows[0].id;

        // 2. Create Wallets if they don't exist
        console.log('💳 Creating wallets...');

        // Ox Wallet (Full)
        const walletResult = await pool.query(
            'INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, $3) RETURNING id',
            [userId, 24500.50, 'USD']
        );
        const mainWalletId = walletResult.rows[0].id;

        // Wallet Lite
        const liteWalletResult = await pool.query(
            'INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, $3) RETURNING id',
            [userId, 3950.00, 'USD']
        );
        const liteWalletId = liteWalletResult.rows[0].id;

        // 3. Create Transactions
        console.log('📝 Creating transactions...');
        const txs = [
            { wallet_id: mainWalletId, amount: -15.99, type: 'withdrawal', description: 'Netflix Subscription' },
            { wallet_id: mainWalletId, amount: -299.00, type: 'withdrawal', description: 'Apple Store' },
            { wallet_id: mainWalletId, amount: 4500.00, type: 'deposit', description: 'Direct Deposit' },
            { wallet_id: mainWalletId, amount: -32.50, type: 'withdrawal', description: 'Uber Eats' },
            { wallet_id: mainWalletId, amount: -120.00, type: 'withdrawal', description: 'Grocery Market' },
            { wallet_id: liteWalletId, amount: 50.00, type: 'deposit', description: 'Transfer from Main' },
        ];

        for (const tx of txs) {
            await pool.query(
                'INSERT INTO transactions (wallet_id, amount, type, description) VALUES ($1, $2, $3, $4)',
                [tx.wallet_id, tx.amount, tx.type, tx.description]
            );
        }

        console.log('✅ Seeding complete!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await pool.end();
    }
}

const email = process.argv[2];
seedUser(email);
