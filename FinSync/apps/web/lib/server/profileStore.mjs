import { ProfileError } from './profileService.mjs';

export async function saveEncryptedProfile(database, uid, profile, encrypted, calculateBudget) {
  const user = database.collection('users').doc(uid);
  const privateProfile = database.collection('privateProfiles').doc(uid);
  await database.runTransaction(async transaction => {
    const existing = await transaction.get(user);
    const old = existing.data()?.profile;
    if (old && ['pan', 'dob', 'phone', 'income'].some(key => old[key] != null)) throw new ProfileError(409, 'PROFILE_MIGRATION_REQUIRED');
    const budget = calculateBudget(profile.income, profile.familySize);
    transaction.set(privateProfile, { ...encrypted, updatedAt: new Date().toISOString() });
    transaction.set(user, {
      profile: { name: profile.name, familySize: profile.familySize, onboarded: true }, budget,
    }, { merge: true });
  });
}
