process.env.REDIS_DISABLED = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProfileDates, describeDate, sameBirth, isDeceased, startOfPeriod } = require('../dist/services/datePrecision');
const { FamilyRuleError } = require('../dist/services/relationshipRules');
const { createFields, memberFields } = require('../dist/controllers/members.controller');

const iso = value => value && value.toISOString().slice(0, 10);

test('a date sent without certainty is exact, and month and year dates are stored as the first day', () => {
  const exact = normalizeProfileDates({ birthDate: '1950-03-12' });
  assert.deepEqual([iso(exact.birthDate), exact.birthDatePrecision, exact.birthDateApproximate], ['1950-03-12', 'day', false]);
  const month = normalizeProfileDates({ birthDate: '1950-03-27', birthDatePrecision: 'month' }), year = normalizeProfileDates({ birthDate: '1950-03-27T10:30:00Z', birthDatePrecision: 'year', birthDateApproximate: true });
  assert.deepEqual([iso(month.birthDate), month.birthDatePrecision], ['1950-03-01', 'month']);
  assert.deepEqual([iso(year.birthDate), year.birthDatePrecision, year.birthDateApproximate], ['1950-01-01', 'year', true]);
  assert.equal(iso(startOfPeriod(new Date('2001-09-09T00:00:00Z'), 'day')), '2001-09-09');
});

test('clearing a date resets its certainty, and only a recorded death without a date keeps a person deceased', () => {
  const cleared = normalizeProfileDates({ birthDate: '', birthDatePrecision: 'year', birthDateApproximate: true });
  assert.deepEqual([cleared.birthDate, cleared.birthDatePrecision, cleared.birthDateApproximate], [null, 'day', false]);
  assert.equal(normalizeProfileDates({ deathDate: '' }).deathRecorded, false, 'clearing the death date makes the person living again, as before');
  assert.deepEqual([normalizeProfileDates({ deathDate: null, deathRecorded: true }).deathDate, normalizeProfileDates({ deathDate: null, deathRecorded: true }).deathRecorded], [null, true]);
  const dated = normalizeProfileDates({ deathDate: '2001-05-05', deathRecorded: true });
  assert.deepEqual([iso(dated.deathDate), dated.deathRecorded], ['2001-05-05', false], 'a death date makes the flag redundant');
});

test('fields that are not in the payload stay untouched and certainty without a date is refused', () => {
  assert.deepEqual(normalizeProfileDates({ name: 'Fictional person' }), { name: 'Fictional person' });
  assert.deepEqual(normalizeProfileDates({ deathRecorded: true }), { deathRecorded: true });
  assert.deepEqual(normalizeProfileDates({ birthDatePrecision: 'day', birthDateApproximate: false }), { birthDatePrecision: 'day', birthDateApproximate: false });
  for (const payload of [{ birthDatePrecision: 'year' }, { deathDateApproximate: true }, { deathDatePrecision: 'month' }]) {
    assert.throws(() => normalizeProfileDates(payload), error => error instanceof FamilyRuleError && error.status === 400, JSON.stringify(payload));
  }
});

test('profile payloads validate certainty values and stay strict', () => {
  assert.equal(createFields.safeParse({ treeId: 't', name: 'A', birthDate: '1950-01-01', birthDatePrecision: 'year', birthDateApproximate: true }).success, true);
  assert.equal(memberFields.partial().strict().safeParse({ deathRecorded: true }).success, true);
  for (const bad of [{ birthDatePrecision: 'decade' }, { birthDateApproximate: 'yes' }, { deathRecorded: 1 }, { deathDatePrecision: null }]) assert.equal(memberFields.partial().strict().safeParse(bad).success, false, JSON.stringify(bad));
});

test('dates read back without inventing precision', () => {
  const at = '1950-03-12T00:00:00Z';
  assert.equal(describeDate({ date: at }), '12 Mar 1950');
  assert.equal(describeDate({ date: at, precision: 'month' }), 'Mar 1950'); assert.equal(describeDate({ date: at, precision: 'year' }), '1950');
  assert.equal(describeDate({ date: at, precision: 'year', approximate: true }), 'c. 1950'); assert.equal(describeDate({ date: at, approximate: true }), 'c. 12 Mar 1950');
  assert.equal(describeDate({ date: null }), 'Unknown'); assert.equal(describeDate({ date: 'not a date' }, 'date unknown'), 'date unknown');
});

test('birth comparison uses days for exact dates and years when either side is less certain or unknown', () => {
  const day = (date, extra = {}) => ({ date, ...extra });
  assert.equal(sameBirth(day('1950-03-12'), day('1950-03-12')), true); assert.equal(sameBirth(day('1950-03-12'), day('1950-03-13')), false);
  assert.equal(sameBirth(day('1950-03-12'), day('1950-01-01', { precision: 'year' })), true); assert.equal(sameBirth(day('1950-03-12'), day('1951-01-01', { precision: 'year' })), false);
  assert.equal(sameBirth(day('1950-03-12'), day('1950-09-09', { approximate: true })), true);
  assert.equal(sameBirth(day(null), day('1950-03-12')), true); assert.equal(sameBirth(day('1950-03-12'), day(undefined)), true);
});

test('one definition of deceased', () => {
  assert.equal(isDeceased({ deathDate: null, deathRecorded: false }), false); assert.equal(isDeceased({}), false);
  assert.equal(isDeceased({ deathDate: new Date() }), true); assert.equal(isDeceased({ deathDate: null, deathRecorded: true }), true);
});
