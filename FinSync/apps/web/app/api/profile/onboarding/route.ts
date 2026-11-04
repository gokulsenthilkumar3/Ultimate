import { firebaseAdmin } from '@/lib/server/firebaseAdmin';
import { createProfileHandler } from '@/lib/server/profileService.mjs';
import { saveEncryptedProfile } from '@/lib/server/profileStore.mjs';
import { calculateMonthlyIncome, calculatePersonalisedBudget } from '@/packages/utils/validators';

export const runtime = 'nodejs';
const attempts = new Map<string, { count: number; reset: number }>();
function budget(uid: string) {
  const now = Date.now();
  if (attempts.size >= 10_000) for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key);
  let entry = attempts.get(uid);
  if (!entry || entry.reset <= now) {
    if (attempts.size >= 10_000 && !entry) return false;
    entry = { count: 0, reset: now + 60_000 }; attempts.set(uid, entry);
  }
  return ++entry.count <= 10;
}

export const POST = createProfileHandler({
  verifyToken: token => firebaseAdmin().auth.verifyIdToken(token, true),
  budget,
  async save(uid, profile, encrypted) {
    const { database } = firebaseAdmin();
    await saveEncryptedProfile(database, uid, profile, encrypted, (income, familySize) => {
      const monthly = calculateMonthlyIncome(income);
      const plan = calculatePersonalisedBudget(monthly, familySize);
      return { monthly: { income: monthly, needs: plan.needs, wants: plan.wants, savings: plan.savings }, rule: plan.rule };
    });
  },
});
