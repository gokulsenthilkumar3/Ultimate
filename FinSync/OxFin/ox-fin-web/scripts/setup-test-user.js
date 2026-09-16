const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function setupFreshTestUser() {
    const email = 'agent@oxfin.com';
    const password = 'TestPassword123!';
    const name = 'Agent Smith';

    console.log(`🚀 Setting up fresh test environment for: ${email}...`);

    try {
        // 1. Create User
        console.log('👤 Creating user...');
        const hashedPassword = await bcrypt.hash(password, 12);
        const userRes = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET password_hash = $3 RETURNING id',
            [name, email, hashedPassword]
        );
        const userId = userRes.rows[0].id;

        // 2. Create Wallets
        console.log('💳 Creating wallets...');

        // Ox Wallet (Full)
        const walletResult = await pool.query(
            'INSERT INTO wallets (user_id, balance, currency, type) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, 24500.50, 'USD', 'full']
        );
        const mainWalletId = walletResult.rows[0].id;

        // Wallet Lite
        const liteWalletResult = await pool.query(
            'INSERT INTO wallets (user_id, balance, currency, type) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, 3950.00, 'USD', 'lite']
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

        console.log('✅ Final Setup Complete!');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
    } catch (err) {
        console.error('❌ Setup failed:', err);
    } finally {
        await pool.end();
    }
}

setupFreshTestUser();
