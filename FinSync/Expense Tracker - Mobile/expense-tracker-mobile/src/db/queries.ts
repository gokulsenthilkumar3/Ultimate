import { getDB } from './index';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: number | null;
  is_system: number;
  created_at: string;
}

export interface PaymentMode {
  id: number;
  name: string;
  is_system: number;
}

export interface Expense {
  id: number;
  amount: number;
  date: string;
  category_id: number | null;
  subcategory_id: number | null;
  payment_mode_id: number | null;
  note: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category_name: string | null;
  subcategory_name: string | null;
  payment_mode_name: string | null;
}

export interface ExpenseInsert {
  amount: number;
  date: string;
  category_id: number | null;
  subcategory_id: number | null;
  payment_mode_id: number | null;
  note: string | null;
  tags: string | null;
}

export interface RecurringTemplate {
  id: number;
  name: string;
  type: 'fixed' | 'installment' | 'variable';
  category_id: number | null;
  payment_mode_id: number | null;
  amount: number | null;
  total_periods: number | null;
  paid_periods: number;
  installment_amt: number | null;
  min_amount: number | null;
  max_amount: number | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  reminder_days: number;
  reminder_on_due: number;
  status: 'active' | 'paused' | 'completed';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTemplateWithDetails extends RecurringTemplate {
  category_name: string | null;
  payment_mode_name: string | null;
}

export type RecurringTemplateInsert = Omit<
  RecurringTemplate,
  'id' | 'created_at' | 'updated_at' | 'paid_periods' | 'status'
>;

export interface RecurringEntry {
  id: number;
  template_id: number;
  due_date: string;
  actual_amount: number | null;
  status: 'pending' | 'paid' | 'missed' | 'skipped';
  paid_date: string | null;
  note: string | null;
  notification_ids: string;
  created_at: string;
}

export interface RecurringEntryInsert {
  template_id: number;
  due_date: string;
  actual_amount?: number | null;
  status?: 'pending' | 'paid' | 'missed' | 'skipped';
  note?: string | null;
}

export interface Budget {
  id: number;
  month: string;
  category_id: number | null;
  amount: number;
  alert_pct: number;
  created_at: string;
}

export interface BudgetWithDetails extends Budget {
  category_name: string | null;
  spent: number;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = getDB();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY is_system DESC, name ASC');
}

export async function addCategory(
  name: string,
  icon: string | null,
  color: string | null,
  parent_id: number | null
): Promise<number> {
  const db = getDB();
  const r = await db.runAsync(
    'INSERT INTO categories (name, icon, color, parent_id, is_system) VALUES (?, ?, ?, ?, 0)',
    [name, icon, color, parent_id]
  );
  return r.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  name: string,
  icon: string | null,
  color: string | null
): Promise<void> {
  const db = getDB();
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
    [name, icon, color, id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM categories WHERE id = ? AND is_system = 0', [id]);
}

// ─── Payment Modes ────────────────────────────────────────────────────────────

export async function getPaymentModes(): Promise<PaymentMode[]> {
  const db = getDB();
  return db.getAllAsync<PaymentMode>('SELECT * FROM payment_modes ORDER BY is_system DESC, name ASC');
}

export async function addPaymentMode(name: string): Promise<number> {
  const db = getDB();
  const r = await db.runAsync(
    'INSERT INTO payment_modes (name, is_system) VALUES (?, 0)',
    [name]
  );
  return r.lastInsertRowId;
}

export async function deletePaymentMode(id: number): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM payment_modes WHERE id = ? AND is_system = 0', [id]);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const db = getDB();
  return db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY date DESC, id DESC');
}

export async function getExpensesWithDetails(): Promise<ExpenseWithDetails[]> {
  const db = getDB();
  return db.getAllAsync<ExpenseWithDetails>(`
    SELECT e.*,
           c.name  AS category_name,
           sc.name AS subcategory_name,
           p.name  AS payment_mode_name
    FROM expenses e
    LEFT JOIN categories   c  ON c.id  = e.category_id
    LEFT JOIN categories   sc ON sc.id = e.subcategory_id
    LEFT JOIN payment_modes p ON p.id  = e.payment_mode_id
    ORDER BY e.date DESC, e.id DESC
  `);
}

export async function getExpensesByDateRange(
  startDate: string,
  endDate: string
): Promise<ExpenseWithDetails[]> {
  const db = getDB();
  return db.getAllAsync<ExpenseWithDetails>(
    `SELECT e.*,
            c.name  AS category_name,
            sc.name AS subcategory_name,
            p.name  AS payment_mode_name
     FROM expenses e
     LEFT JOIN categories   c  ON c.id  = e.category_id
     LEFT JOIN categories   sc ON sc.id = e.subcategory_id
     LEFT JOIN payment_modes p ON p.id  = e.payment_mode_id
     WHERE e.date BETWEEN ? AND ?
     ORDER BY e.date DESC, e.id DESC`,
    [startDate, endDate]
  );
}

export async function addExpense(expense: ExpenseInsert): Promise<number> {
  const db = getDB();
  const r = await db.runAsync(
    `INSERT INTO expenses
       (amount, date, category_id, subcategory_id, payment_mode_id, note, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.amount, expense.date, expense.category_id,
      expense.subcategory_id, expense.payment_mode_id,
      expense.note, expense.tags,
    ]
  );
  return r.lastInsertRowId;
}

export async function updateExpense(
  id: number,
  fields: Partial<ExpenseInsert>
): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (fields.amount       !== undefined) { sets.push('amount = ?');          vals.push(fields.amount); }
  if (fields.date         !== undefined) { sets.push('date = ?');            vals.push(fields.date); }
  if (fields.category_id  !== undefined) { sets.push('category_id = ?');     vals.push(fields.category_id); }
  if (fields.subcategory_id !== undefined) { sets.push('subcategory_id = ?'); vals.push(fields.subcategory_id); }
  if (fields.payment_mode_id !== undefined) { sets.push('payment_mode_id = ?'); vals.push(fields.payment_mode_id); }
  if (fields.note         !== undefined) { sets.push('note = ?');            vals.push(fields.note); }
  if (fields.tags         !== undefined) { sets.push('tags = ?');            vals.push(fields.tags); }
  if (!sets.length) return;
  sets.push("updated_at = datetime('now')");
  vals.push(id);
  await db.runAsync(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteExpense(id: number): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ─── Recurring Templates ──────────────────────────────────────────────────────

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const db = getDB();
  return db.getAllAsync<RecurringTemplate>(
    'SELECT * FROM recurring_templates ORDER BY next_due_date ASC'
  );
}

export async function getRecurringTemplatesWithDetails(): Promise<RecurringTemplateWithDetails[]> {
  const db = getDB();
  return db.getAllAsync<RecurringTemplateWithDetails>(`
    SELECT t.*,
           c.name AS category_name,
           p.name AS payment_mode_name
    FROM recurring_templates t
    LEFT JOIN categories    c ON c.id = t.category_id
    LEFT JOIN payment_modes p ON p.id = t.payment_mode_id
    ORDER BY t.next_due_date ASC
  `);
}

export async function addRecurringTemplate(
  template: RecurringTemplateInsert
): Promise<number> {
  const db = getDB();
  const r = await db.runAsync(
    `INSERT INTO recurring_templates
       (name, type, category_id, payment_mode_id, amount, total_periods,
        installment_amt, min_amount, max_amount, frequency, start_date,
        end_date, next_due_date, reminder_days, reminder_on_due, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.name, template.type, template.category_id,
      template.payment_mode_id, template.amount, template.total_periods,
      template.installment_amt, template.min_amount, template.max_amount,
      template.frequency, template.start_date, template.end_date,
      template.next_due_date, template.reminder_days,
      template.reminder_on_due, template.note,
    ]
  );
  return r.lastInsertRowId;
}

export async function updateRecurringTemplate(
  id: number,
  fields: Partial<RecurringTemplateInsert & { status: string; paid_periods: number; next_due_date: string }>
): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const vals: unknown[] = [];
  const allowed = [
    'name','type','category_id','payment_mode_id','amount','total_periods',
    'installment_amt','min_amount','max_amount','frequency','start_date',
    'end_date','next_due_date','reminder_days','reminder_on_due','note',
    'status','paid_periods',
  ] as const;
  for (const key of allowed) {
    if (key in fields) { sets.push(`${key} = ?`); vals.push((fields as Record<string,unknown>)[key]); }
  }
  if (!sets.length) return;
  sets.push("updated_at = datetime('now')");
  vals.push(id);
  await db.runAsync(`UPDATE recurring_templates SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteRecurringTemplate(id: number): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM recurring_templates WHERE id = ?', [id]);
}

// ─── Recurring Entries ────────────────────────────────────────────────────────

export async function getRecurringEntries(
  templateId?: number
): Promise<RecurringEntry[]> {
  const db = getDB();
  if (templateId !== undefined) {
    return db.getAllAsync<RecurringEntry>(
      'SELECT * FROM recurring_entries WHERE template_id = ? ORDER BY due_date DESC',
      [templateId]
    );
  }
  return db.getAllAsync<RecurringEntry>(
    'SELECT * FROM recurring_entries ORDER BY due_date DESC'
  );
}

export async function getPendingEntries(): Promise<RecurringEntry[]> {
  const db = getDB();
  return db.getAllAsync<RecurringEntry>(
    `SELECT * FROM recurring_entries
     WHERE status = 'pending'
     ORDER BY due_date ASC`
  );
}

export async function addRecurringEntry(
  entry: RecurringEntryInsert
): Promise<number> {
  const db = getDB();
  const r = await db.runAsync(
    `INSERT INTO recurring_entries
       (template_id, due_date, actual_amount, status, note)
     VALUES (?, ?, ?, ?, ?)`,
    [
      entry.template_id, entry.due_date,
      entry.actual_amount ?? null,
      entry.status ?? 'pending',
      entry.note ?? null,
    ]
  );
  return r.lastInsertRowId;
}

export async function updateRecurringEntry(
  id: number,
  fields: {
    actual_amount?: number | null;
    status?: 'pending' | 'paid' | 'missed' | 'skipped';
    paid_date?: string | null;
    note?: string | null;
  }
): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if ('actual_amount' in fields) { sets.push('actual_amount = ?'); vals.push(fields.actual_amount); }
  if ('status'        in fields) { sets.push('status = ?');        vals.push(fields.status); }
  if ('paid_date'     in fields) { sets.push('paid_date = ?');     vals.push(fields.paid_date); }
  if ('note'          in fields) { sets.push('note = ?');          vals.push(fields.note); }
  if (!sets.length) return;
  vals.push(id);
  await db.runAsync(`UPDATE recurring_entries SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function markEntryPaid(
  entryId: number,
  actualAmount: number,
  templateId: number,
  nextDueDate: string
): Promise<void> {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `UPDATE recurring_entries
     SET status = 'paid', paid_date = ?, actual_amount = ?
     WHERE id = ?`,
    [today, actualAmount, entryId]
  );
  // Advance template next_due_date and increment paid_periods
  await db.runAsync(
    `UPDATE recurring_templates
     SET next_due_date = ?,
         paid_periods  = paid_periods + 1,
         updated_at    = datetime('now')
     WHERE id = ?`,
    [nextDueDate, templateId]
  );
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export async function getBudgets(month: string): Promise<BudgetWithDetails[]> {
  const db = getDB();
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end   = new Date(y, m, 0).toISOString().split('T')[0];
  return db.getAllAsync<BudgetWithDetails>(
    `SELECT b.*,
            c.name AS category_name,
            COALESCE((
              SELECT SUM(e.amount)
              FROM expenses e
              WHERE e.date BETWEEN ? AND ?
                AND (b.category_id IS NULL OR e.category_id = b.category_id)
            ), 0) AS spent
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.month = ?
     ORDER BY b.category_id IS NULL DESC, c.name ASC`,
    [start, end, month]
  );
}

export async function upsertBudget(
  month: string,
  category_id: number | null,
  amount: number,
  alert_pct: number
): Promise<void> {
  const db = getDB();
  await db.runAsync(
    `INSERT INTO budgets (month, category_id, amount, alert_pct)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(month, COALESCE(category_id, 0))
     DO UPDATE SET amount = excluded.amount, alert_pct = excluded.alert_pct`,
    [month, category_id, amount, alert_pct]
  );
}

export async function deleteBudget(id: number): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalSpent: number;
  expenseCount: number;
  pendingDues: number;
  overdueCount: number;
  topCategories: { name: string; total: number; color: string | null }[];
}

export async function getDashboardStats(month: string): Promise<DashboardStats> {
  const db = getDB();
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end   = new Date(y, m, 0).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const totRow = await db.getFirstAsync<{ total: number; cnt: number }>(
    `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt
     FROM expenses WHERE date BETWEEN ? AND ?`,
    [start, end]
  );

  const pendRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM recurring_entries
     WHERE status = 'pending' AND due_date >= ?`,
    [today]
  );

  const overRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM recurring_entries
     WHERE status = 'pending' AND due_date < ?`,
    [today]
  );

  const cats = await db.getAllAsync<{ name: string; total: number; color: string | null }>(
    `SELECT COALESCE(c.name, 'Uncategorized') AS name, c.color, SUM(e.amount) AS total
     FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.date BETWEEN ? AND ?
     GROUP BY COALESCE(e.category_id, 0)
     ORDER BY total DESC
     LIMIT 5`,
    [start, end]
  );

  return {
    totalSpent:     totRow?.total    ?? 0,
    expenseCount:   totRow?.cnt      ?? 0,
    pendingDues:    pendRow?.cnt     ?? 0,
    overdueCount:   overRow?.cnt     ?? 0,
    topCategories:  cats,
  };
}
