import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 86_400_000;

/** Date-only birth dates use UTC. Feb 29 is observed on Feb 28 in non-leap years. */
export function upcomingBirthday(birthDate: Date, now: Date, windowDays = 7) {
  if (!Number.isFinite(birthDate.getTime()) || !Number.isFinite(now.getTime())) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const occurrence = (year: number) => {
    const month = birthDate.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Date.UTC(year, month, Math.min(birthDate.getUTCDate(), lastDay));
  };
  let year = now.getUTCFullYear(), next = occurrence(year);
  if (next < today) next = occurrence(++year);
  const daysUntil = Math.round((next - today) / DAY), ageTurning = year - birthDate.getUTCFullYear();
  return daysUntil <= windowDays && ageTurning >= 0 ? { daysUntil, ageTurning } : null;
}

export async function generateUpcomingBirthdayNotifications(database = prisma, now = new Date()) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + DAY);
  let cursor: string | undefined;
  let created = 0;
  for (;;) {
    const members = await database.member.findMany({
      where: { deathDate: null, birthDate: { not: null }, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' }, take: 250,
      include: { tree: { select: { accessControl: { select: { userId: true, role: true } } } } },
    });
    for (const member of members) {
      if (!member.birthDate || member.deathDate) continue;
      const birthday = upcomingBirthday(member.birthDate, now);
      if (!birthday) continue;
      const { daysUntil, ageTurning } = birthday;
      const title = daysUntil === 0 ? 'Birthday Today!' : 'Upcoming Birthday';
      const message = daysUntil === 0
        ? `It's ${member.name}'s birthday today! They are turning ${ageTurning}.`
        : `${member.name}'s birthday is coming up in ${daysUntil} days. They will be turning ${ageTurning}.`;
      for (const access of member.tree.accessControl) {
        if (!['admin', 'family_head'].includes(access.role)) continue;
        const existing = await database.notification.findFirst({ where: {
          userId: access.userId, title, message, createdAt: { gte: dayStart, lt: dayEnd },
        } });
        if (!existing) {
          await database.notification.create({ data: { userId: access.userId, title, message } });
          created++;
        }
      }
    }
    if (members.length < 250) break;
    cursor = members[members.length - 1].id;
  }
  return { created };
}

export const startCronJobs = () => {
  let running = false;
  return cron.schedule('0 0 * * *', async () => {
    if (running) return;
    running = true;
    try { await generateUpcomingBirthdayNotifications(); }
    catch { console.error('Family birthday reminder job failed.'); }
    finally { running = false; }
  }, { timezone: 'UTC' });
};
