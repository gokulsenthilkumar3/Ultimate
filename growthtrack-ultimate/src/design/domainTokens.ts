export const domainAccents = {
  today: '#3FD8E0', body: '#8B7CF6', wellness: '#4FD1A5', insights: '#F5B84C',
  work: '#5AA9E6', money: '#E0C168', life: '#F0797B', system: '#9AA5B8',
} as const;
export type DomainId = keyof typeof domainAccents;
