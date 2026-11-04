import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { databaseConfig } from './databaseConfig.ts';

test('production pg client verifies certificates despite URL TLS overrides', () => {
    for (const suffix of ['sslmode=no-verify', 'sslmode=disable', 'sslmode=require&uselibpqcompat=true', 'ssl=no-verify']) {
        const client = new pg.Client(databaseConfig({ NODE_ENV: 'production', DATABASE_URL: `postgresql://synthetic:synthetic@db.example.invalid/test?${suffix}&application_name=policy-test` }));
        assert.equal(client.ssl.rejectUnauthorized, true);
        assert.equal(client.connectionParameters.application_name, 'policy-test');
    }
});

test('production supports an explicit server-only CA without disabling verification', () => {
    const config = databaseConfig({ NODE_ENV: 'production', DATABASE_SSL_CA: 'synthetic-ca' });
    assert.deepEqual(config.ssl, { rejectUnauthorized: true, ca: 'synthetic-ca' });
});

test('development retains local connection options', () => {
    const connectionString = 'postgresql://localhost/test?sslmode=disable';
    assert.deepEqual(databaseConfig({ NODE_ENV: 'development', DATABASE_URL: connectionString }), { connectionString });
});
