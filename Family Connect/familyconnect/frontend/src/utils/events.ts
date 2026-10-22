import type { Member } from '../types/family';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: string;
  location?: string;
  description?: string;
}

export function getUpcomingBirthdays(members: Member[]): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = members
    .filter(m => m.birthDate && m.isAlive)
    .map(m => {
      const birthDate = new Date(m.birthDate!);
      // Calculate next birthday
      const nextDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      // If the birthday has already passed this year, their next birthday is next year
      if (nextDate < today) {
        nextDate.setFullYear(today.getFullYear() + 1);
      }
      
      const age = nextDate.getFullYear() - birthDate.getFullYear();

      return {
        id: `bday-${m.id}`,
        title: `${m.name}'s ${age}th Birthday`,
        date: nextDate,
        type: 'birthday',
        location: m.birthLocation,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return events;
}
