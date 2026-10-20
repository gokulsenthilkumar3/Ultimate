// Who may see external anatomy on the digital twin. Pure and synchronous so
// the renderer, the editor and tests apply exactly the same rule.

export const ADULT_AGE_YEARS = 18;

/** Age in whole years from a YYYY-MM-DD date of birth, or null when the date
    is missing, malformed, impossible or in the future. Age is never inferred. */
export function ageFromDateOfBirth(dateOfBirth, now = new Date()) {
  const match = String(dateOfBirth ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  if (year > today.year || (year === today.year && (month > today.month || (month === today.month && day > today.day)))) return null;
  let age = today.year - year;
  if (today.month < month || (today.month === month && today.day < day)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

export function normaliseBodyBase(value) {
  const base = String(value ?? '').trim().toLowerCase();
  if (['male', 'man', 'm'].includes(base)) return 'male';
  if (['female', 'woman', 'f'].includes(base)) return 'female';
  return 'neutral';
}

const MESSAGES = Object.freeze({
  'asset-unavailable': 'This body model has no external anatomy.',
  'neutral-base': 'A neutral body base shows no external anatomy. Choose a male or female base to enable it.',
  'asset-undeclared': 'This body model does not declare which anatomy it contains, so it stays covered.',
  'sex-mismatch': 'No authored anatomy matches the selected body base yet, so it stays covered.',
  'missing-dob': 'Add your date of birth to confirm you are an adult before using Anatomical mode.',
  'invalid-dob': 'Your saved date of birth is not a valid past date. Correct it to use Anatomical mode.',
  'under-age': 'Anatomical mode is only available to adults.',
});

/**
 * Decide whether external anatomy may be shown.
 * @returns {{ allowed: boolean, reason: string | null, message: string | null, age: number | null }}
 */
export function anatomyEligibility({ dateOfBirth, bodyBase, assetAnatomySex, hasPrivateAnatomy, now = new Date() } = {}) {
  const deny = (reason, age = null) => ({ allowed: false, reason, message: MESSAGES[reason], age });
  if (!hasPrivateAnatomy) return deny('asset-unavailable');
  const base = normaliseBodyBase(bodyBase);
  if (base === 'neutral') return deny('neutral-base');
  const declared = assetAnatomySex == null ? null : normaliseBodyBase(assetAnatomySex);
  if (!declared || declared === 'neutral') return deny('asset-undeclared');
  if (declared !== base) return deny('sex-mismatch');
  if (dateOfBirth == null || String(dateOfBirth).trim() === '') return deny('missing-dob');
  const age = ageFromDateOfBirth(dateOfBirth, now);
  if (age == null) return deny('invalid-dob');
  if (age < ADULT_AGE_YEARS) return deny('under-age', age);
  return { allowed: true, reason: null, message: null, age };
}
