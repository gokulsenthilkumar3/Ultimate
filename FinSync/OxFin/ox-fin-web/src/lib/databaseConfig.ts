import type { PoolConfig } from 'pg';

/** Production TLS policy must not be weakened by pg's connection-string overrides. */
export function databaseConfig(environment: NodeJS.ProcessEnv = process.env): PoolConfig {
    const connectionString = environment.DATABASE_URL;
    if (environment.NODE_ENV !== 'production') return { connectionString };

    let productionUrl = connectionString;
    if (connectionString) {
        const url = new URL(connectionString);
        // pg merges parsed URL options after Pool options. Centralize TLS here.
        for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
            url.searchParams.delete(key);
        }
        productionUrl = url.toString();
    }

    return {
        connectionString: productionUrl,
        ssl: {
            rejectUnauthorized: true,
            ...(environment.DATABASE_SSL_CA ? { ca: environment.DATABASE_SSL_CA } : {}),
        },
    };
}
