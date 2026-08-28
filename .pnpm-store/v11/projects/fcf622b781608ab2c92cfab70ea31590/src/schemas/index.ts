import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(['Income', 'Expense', 'Investment']),
  category: z.string(),
  method: z.string().optional(),
  date: z.string(),
  note: z.string().optional()
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const BudgetSchema = z.object({
  id: z.string(),
  category: z.string(),
  limit_amount: z.number(),
  month: z.string().optional()
});

export type Budget = z.infer<typeof BudgetSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['pending', 'in-progress', 'completed']),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

export type Task = z.infer<typeof TaskSchema>;

export const MetricLogSchema = z.object({
  id: z.string(),
  date: z.string(),
  metric: z.string(),
  value: z.number()
});

export type MetricLog = z.infer<typeof MetricLogSchema>;
