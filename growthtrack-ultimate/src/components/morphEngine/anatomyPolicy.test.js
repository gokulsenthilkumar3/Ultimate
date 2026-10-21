import { describe, expect, it } from 'vitest';
import { ADULT_AGE_YEARS, ageFromDateOfBirth, anatomyEligibility } from './anatomyPolicy';

const now = new Date(2026, 9, 19); // 19 October 2026, local time
const eligibleMale = { bodyBase: 'male', assetAnatomySex: 'male', hasPrivateAnatomy: true, now };

describe('age from date of birth', () => {
  it('counts whole years and respects the birthday boundary', () => {
    expect(ageFromDateOfBirth('2008-10-19', now)).toBe(18);
    expect(ageFromDateOfBirth('2008-10-20', now)).toBe(17);
    expect(ageFromDateOfBirth('2008-11-01', now)).toBe(17);
    expect(ageFromDateOfBirth('1990-02-28T00:00:00.000Z', now)).toBe(36);
    expect(ageFromDateOfBirth('2000-02-29', new Date(2026, 1, 28))).toBe(25);
  });
  it.each(['', null, undefined, 'yesterday', '2026-13-01', '2023-02-29', '2026-10-20', '1700-01-01'])('rejects %s', value => {
    expect(ageFromDateOfBirth(value, now)).toBeNull();
  });
});

describe('anatomy eligibility', () => {
  it('allows an adult owner whose body base matches the asset', () => {
    expect(anatomyEligibility({ ...eligibleMale, dateOfBirth: '1990-05-01' })).toEqual({ allowed: true, reason: null, message: null, age: 36 });
    expect(anatomyEligibility({ ...eligibleMale, dateOfBirth: '2008-10-19' }).allowed).toBe(true);
    expect(ADULT_AGE_YEARS).toBe(18);
  });

  it.each([
    [{ dateOfBirth: '2008-10-20' }, 'under-age'],
    [{ dateOfBirth: null }, 'missing-dob'],
    [{ dateOfBirth: '  ' }, 'missing-dob'],
    [{ dateOfBirth: '2030-01-01' }, 'invalid-dob'],
    [{ dateOfBirth: '1990-05-01', bodyBase: 'female' }, 'sex-mismatch'],
    [{ dateOfBirth: '1990-05-01', bodyBase: 'neutral' }, 'neutral-base'],
    [{ dateOfBirth: '1990-05-01', bodyBase: undefined }, 'neutral-base'],
    [{ dateOfBirth: '1990-05-01', assetAnatomySex: null }, 'asset-undeclared'],
    [{ dateOfBirth: '1990-05-01', hasPrivateAnatomy: false }, 'asset-unavailable'],
  ])('denies %j with %s', (overrides, reason) => {
    const result = anatomyEligibility({ ...eligibleMale, ...overrides });
    expect(result).toMatchObject({ allowed: false, reason });
    expect(result.message).toMatch(/\w/);
  });

  it('never shows male anatomy on a female base, whatever the age', () => {
    expect(anatomyEligibility({ ...eligibleMale, bodyBase: 'woman', dateOfBirth: '1980-01-01' }).reason).toBe('sex-mismatch');
    expect(anatomyEligibility({ ...eligibleMale, bodyBase: 'F', assetAnatomySex: 'female', dateOfBirth: '1980-01-01' }).allowed).toBe(true);
  });

  it('checks the asset before the owner so a mismatch never prompts for a birth date', () => {
    expect(anatomyEligibility({ ...eligibleMale, bodyBase: 'female', dateOfBirth: null }).reason).toBe('sex-mismatch');
  });
});
