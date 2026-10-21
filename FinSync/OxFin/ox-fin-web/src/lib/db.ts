import { Pool } from 'pg';

const globalForDb = global as unknown as { db: Pool };

export const db =
    globalForDb.db ||
    new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export const query = async (text: string, params?: any[]) => {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const start = Date.now();

        try {
            const res = await db.query(text, params);
            const duration = Date.now() - start;
            console.log('executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            if (!isTransientDatabaseError(error) || attempt === maxAttempts) {
                throw error;
            }

            // The database container may still be starting when Next.js is ready.
            await new Promise((resolve) => setTimeout(resolve, attempt * 250));
        }
    }

    throw new Error('Database query failed');
};

const isTransientDatabaseError = (error: unknown): boolean => {
    if (error instanceof AggregateError) {
        return error.errors.some(isTransientDatabaseError);
    }

    if (!error || typeof error !== 'object') return false;

    const code = 'code' in error ? error.code : undefined;
    return [
        'ECONNREFUSED',
        'ECONNRESET',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'ENOTFOUND',
        'ETIMEDOUT',
        '57P03',
    ].includes(code as string);
};
