export enum RecurringType {
  FIXED = 'fixed',
  INSTALLMENT = 'installment',
  VARIABLE = 'variable',
}

export enum Frequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum RecurringStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum EntryStatus {
  PENDING = 'pending',
  PAID = 'paid',
  MISSED = 'missed',
  SKIPPED = 'skipped',
}

export enum NotificationType {
  DUE_SOON = 'due_soon',
  DUE_TODAY = 'due_today',
  OVERDUE = 'overdue',
  BUDGET_WARNING = 'budget_warning',
  BUDGET_EXCEEDED = 'budget_exceeded',
}
