import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function findLatestUser() {
    try {
        const res = await pool.query('SELECT email FROM users ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length > 0) {
            console.log(`LATEST_USER_EMAIL: ${res.rows[0].email}`);
        } else {
            console.log('NO_USERS_FOUND');
        }
    } catch (err) {
        console.error('Error finding user:', err);
    } finally {
        await pool.end();
    }
}

findLatestUser();
