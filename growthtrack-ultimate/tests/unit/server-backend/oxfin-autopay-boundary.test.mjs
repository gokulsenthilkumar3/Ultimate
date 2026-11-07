import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual route with synthetic transport/auth dependencies, without
// starting any OxFin service or requiring its external database/JWT secrets.
const source = fs.readFileSync(new URL('../../../../FinSync/OxFin/services/api-gateway/src/index.ts', import.meta.url), 'utf8');
const start = source.indexOf("app.post('/v1/bills/:id/autopay'");
const route = source.slice(start, source.indexOf("app.get('/v1/autopay-rules'", start));
const script = ts.transpileModule(route, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test('autopay rejects path/authority injection before forwarding and pins the service for valid IDs', async () => {
  const calls = []; let handler;
  vm.runInNewContext(script, { app: { post: (...args) => { handler = args.at(-1); } }, authenticate() {}, rateLimit: () => () => {},
    billsServiceUrl: 'https://bills.example.invalid', forwardError: () => assert.fail('Unexpected upstream error'),
    axios: { post: async (...args) => { calls.push(args); return { status: 200, data: { success: true } }; } } });
  for (const id of ['//attacker.invalid', '../other', '\\attacker.invalid', 'a/b', 'a%2fb', ['bill', 'other']]) {
    const response = { status(code) { this.code = code; return this; }, json() {} };
    await handler({ params: { id }, body: {}, headers: {}, user: { sub: 'synthetic' } }, response);
    assert.equal(response.code, 400);
  }
  assert.equal(calls.length, 0);
  const response = { status(code) { this.code = code; return this; }, json() {} };
  await handler({ params: { id: 'bill-123' }, body: { enabled: true }, headers: {}, user: { sub: 'synthetic' } }, response);
  assert.equal(response.code, 200);
  assert.equal(calls[0][0], '/v1/bills/bill-123/autopay');
  assert.equal(calls[0][2].baseURL, 'https://bills.example.invalid');
  assert.equal(calls[0][2].allowAbsoluteUrls, false);
  assert.equal(calls[0][2].maxRedirects, 0);
});
