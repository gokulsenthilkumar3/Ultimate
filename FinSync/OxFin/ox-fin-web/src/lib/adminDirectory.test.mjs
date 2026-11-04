import test from 'node:test';
import assert from 'node:assert/strict';
import { adminServiceAuthorized, adminDirectoryInput } from './adminDirectory.ts';

test('OxFin service authentication and pagination fail closed', () => {
    const token = '22'.repeat(32);
    assert.ok(adminServiceAuthorized(`Bearer ${token}`, token));
    assert.equal(adminServiceAuthorized(`Bearer ${'11'.repeat(32)}`, token), false);
    assert.equal(adminServiceAuthorized(null, token), false);
    assert.equal(adminServiceAuthorized(`Bearer ${token}`, undefined), false);
    assert.equal(adminDirectoryInput('https://oxfin.example/?limit=25').limit, 25);
    for (const query of ['limit=1000', 'offset=-1', 'product=finsync', 'q=a&q=b']) assert.throws(() => adminDirectoryInput('https://oxfin.example/?' + query));
});
