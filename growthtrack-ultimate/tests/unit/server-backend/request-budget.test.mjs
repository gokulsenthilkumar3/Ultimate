import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestBudget } from '../../../server/requestBudget.js';

function request(middleware, ip, path = '/state') {
  const result = { status: 200, headers: {}, passed: false };
  const response = {
    setHeader: (key, value) => { result.headers[key] = value; },
    status: code => { result.status = code; return response; },
    json: body => { result.body = body; },
  };
  middleware({ ip, path, method: 'GET' }, response, () => { result.passed = true; });
  return result;
}

test('read floods cannot evade the client budget by changing endpoint', () => {
  let time = 0;
  const budget = createRequestBudget({ limit: 2, now: () => time });
  assert.ok(request(budget, 'client', '/a').passed);
  assert.ok(request(budget, 'client', '/b').passed);
  const denied = request(budget, 'client', '/c');
  assert.equal(denied.status, 429);
  assert.equal(denied.headers['Retry-After'], '60');
  assert.ok(request(budget, 'other').passed);
  time = 60_000;
  assert.ok(request(budget, 'client').passed);
});

test('client tracking is capped and expired capacity is recovered', () => {
  let time = 0;
  const budget = createRequestBudget({ maxClients: 1, now: () => time });
  assert.ok(request(budget, 'first').passed);
  assert.equal(request(budget, 'second').status, 503);
  time = 60_000;
  assert.ok(request(budget, 'second').passed);
});
