import { domainError, transactionWithRetry } from './errors.js';

const invalid = message => { throw domainError(400, 'INVALID_SOCIAL_PROFILE', message); };
const conflict = () => domainError(409, 'SOCIAL_PROFILE_CONFLICT', 'A social profile changed on another device. Refresh before saving.');

function natural(value, label) {
  const number = value == null || value === '' ? 0 : Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 1_000_000_000) invalid(`${label} must be a non-negative whole number.`);
  return number;
}

function providerName(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80 || [...value].some(character => character.codePointAt(0) < 32)) invalid('Provider name is invalid.');
  return value.trim();
}

function version(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) invalid('Profile revision is invalid.');
  return new Date(value);
}

export function normalizeSocialProfiles(input) {
  const legacy = Array.isArray(input);
  const source = legacy ? input : input?.rows;
  const removed = legacy ? [] : input?.removed ?? [];
  if (!Array.isArray(source) || source.length > 50 || !Array.isArray(removed) || removed.length > 50) invalid('Save at most 50 social profiles.');
  const seen = new Set();
  const rows = source.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) invalid('A profile object is required.');
    const provider = providerName(row.provider);
    if (seen.has(provider)) invalid('Duplicate providers cannot be saved together.');
    seen.add(provider);
    const profileUrl = row.profileUrl == null || row.profileUrl === '' ? null : String(row.profileUrl).trim();
    if (profileUrl) {
      if (profileUrl.length > 2048) invalid('Profile link is too long.');
      try {
        const url = new URL(profileUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid('Profile links must be HTTP or HTTPS URLs without credentials.');
      } catch (error) { if (error?.status) throw error; invalid('Profile link is invalid.'); }
    }
    return { provider, profileUrl, followers: natural(row.followers, 'Followers'), avgLikes: natural(row.avgLikes, 'Average likes'),
      avgViews: natural(row.avgViews, 'Average views'), enabled: Boolean(profileUrl), expectedUpdatedAt: legacy ? undefined : version(row.expectedUpdatedAt) };
  });
  const deletes = removed.map(row => {
    const provider = providerName(row?.provider);
    if (seen.has(provider)) invalid('A provider cannot be saved and removed together.');
    seen.add(provider);
    return { provider, expectedUpdatedAt: version(row.expectedUpdatedAt) };
  });
  return { rows, removed: deletes, legacy };
}

export async function saveSocialProfiles(prisma, userId, input) {
  const { rows, removed, legacy } = normalizeSocialProfiles(input);
  return transactionWithRetry(prisma, async tx => {
    const saved = [];
    for (const [index, row] of rows.entries()) {
      const { expectedUpdatedAt, ...data } = row;
      const existing = await tx.socialProfile.findUnique({ where: { userId_provider: { userId, provider: row.provider } } });
      if (existing) {
        if (!legacy && (!expectedUpdatedAt || existing.updatedAt.getTime() !== expectedUpdatedAt.getTime())) throw conflict();
        const result = await tx.socialProfile.updateMany({ where: { id: existing.id, userId, updatedAt: existing.updatedAt }, data: { ...data, sortOrder: index, updatedBy: userId } });
        if (result.count !== 1) throw conflict();
        saved.push(await tx.socialProfile.findUnique({ where: { id: existing.id } }));
      } else {
        if (expectedUpdatedAt) throw conflict();
        saved.push(await tx.socialProfile.create({ data: { ...data, userId, sortOrder: index, createdBy: userId, updatedBy: userId } }));
      }
    }
    for (const row of removed) {
      const existing = await tx.socialProfile.findUnique({ where: { userId_provider: { userId, provider: row.provider } } });
      if (!existing || !row.expectedUpdatedAt || existing.updatedAt.getTime() !== row.expectedUpdatedAt.getTime()) throw conflict();
      const result = await tx.socialProfile.deleteMany({ where: { id: existing.id, userId, updatedAt: existing.updatedAt } });
      if (result.count !== 1) throw conflict();
    }
    return saved;
  });
}
