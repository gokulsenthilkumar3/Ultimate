import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_DEFAULTS_SQL } from './schema';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEB_DB_KEY = 'web_db_mock_v4';

let _db: any = null;

// ─── Web AsyncStorage Mock Database ───────────────────────────────────────────
// A complete in-memory database backed by AsyncStorage for web platform.

interface MockTables {
  categories: any[];
  payment_modes: any[];
  expenses: any[];
  recurring_templates: any[];
  recurring_entries: any[];
  budgets: any[];
}

class WebMockDB {
  private state: MockTables = {
    categories: [],
    payment_modes: [],
    expenses: [],
    recurring_templates: [],
    recurring_entries: [],
    budgets: [],
  };
  private loaded = false;
  private nextId = Date.now();

  private async ensureLoaded() {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(WEB_DB_KEY);
      if (raw) {
        const parsed: Partial<MockTables> = JSON.parse(raw);
        if (parsed.categories) this.state.categories = parsed.categories;
        if (parsed.payment_modes) this.state.payment_modes = parsed.payment_modes;
        if (parsed.expenses) this.state.expenses = parsed.expenses;
        if (parsed.recurring_templates) this.state.recurring_templates = parsed.recurring_templates;
        if (parsed.recurring_entries) this.state.recurring_entries = parsed.recurring_entries;
        if (parsed.budgets) this.state.budgets = parsed.budgets;
      }
    } catch (_) {}
    this.loaded = true;
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(WEB_DB_KEY, JSON.stringify(this.state));
    } catch (_) {}
  }

  private newId() { return this.nextId++; }

  async execAsync(_sql: string) {}

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    await this.ensureLoaded();
    const s = sql.trim();

    // ── Categories ──
    if (/INSERT\s+INTO\s+categories/i.test(s)) {
      const id = this.newId();
      this.state.categories.push({
        id, name: params[0], icon: params[1] ?? null, color: params[2] ?? null,
        parent_id: params[3] ?? null, is_system: 0, created_at: new Date().toISOString(),
      });
      await this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/UPDATE\s+categories/i.test(s)) {
      // params: [name, icon, color, id]
      const [name, icon, color, id] = params;
      const cat = this.state.categories.find(c => c.id === id);
      if (cat) { cat.name = name; cat.icon = icon ?? null; cat.color = color ?? null; await this.persist(); }
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (/DELETE\s+FROM\s+categories/i.test(s)) {
      this.state.categories = this.state.categories.filter(c => c.id !== params[0]);
      await this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // ── Payment Modes ──
    if (/INSERT\s+INTO\s+payment_modes/i.test(s)) {
      const id = this.newId();
      this.state.payment_modes.push({ id, name: params[0], is_system: 0 });
      await this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/DELETE\s+FROM\s+payment_modes/i.test(s)) {
      this.state.payment_modes = this.state.payment_modes.filter(p => p.id !== params[0]);
      await this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // ── Expenses ──
    if (/INSERT\s+INTO\s+expenses/i.test(s)) {
      const id = this.newId();
      const now = new Date().toISOString();
      this.state.expenses.push({
        id,
        amount: Number(params[0]) || 0,
        date: params[1],
        category_id: params[2] ?? null,
        subcategory_id: params[3] ?? null,
        payment_mode_id: params[4] ?? null,
        note: params[5] ?? null,
        tags: params[6] ?? null,
        created_at: now,
        updated_at: now,
      });
      await this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/UPDATE\s+expenses\s+SET/i.test(s)) {
      // Dynamic update — last param is always id
      const id = params[params.length - 1];
      const exp = this.state.expenses.find(e => e.id === id);
      if (exp) {
        const setClauses = s.match(/SET\s+(.*?)\s+WHERE/is)?.[1] ?? '';
        const pairs = setClauses.split(',').map(p => p.trim());
        let pi = 0;
        for (const pair of pairs) {
          const field = pair.split('=')[0].trim();
          if (field === 'updated_at') { exp.updated_at = new Date().toISOString(); continue; }
          if (pi < params.length - 1) {
            exp[field] = field === 'amount' ? (Number(params[pi]) || 0) : params[pi];
            pi++;
          }
        }
        await this.persist();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (/DELETE\s+FROM\s+expenses/i.test(s)) {
      this.state.expenses = this.state.expenses.filter(e => e.id !== params[0]);
      await this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // ── Recurring Templates ──
    if (/INSERT\s+INTO\s+recurring_templates/i.test(s)) {
      const id = this.newId();
      const now = new Date().toISOString();
      const [name, type, category_id, payment_mode_id, amount, total_periods,
        installment_amt, min_amount, max_amount, frequency, start_date,
        end_date, next_due_date, reminder_days, reminder_on_due, note] = params;
      this.state.recurring_templates.push({
        id, name, type,
        category_id: category_id ?? null,
        payment_mode_id: payment_mode_id ?? null,
        amount: amount != null ? Number(amount) : null,
        total_periods: total_periods != null ? Number(total_periods) : null,
        paid_periods: 0,
        installment_amt: installment_amt != null ? Number(installment_amt) : null,
        min_amount: min_amount != null ? Number(min_amount) : null,
        max_amount: max_amount != null ? Number(max_amount) : null,
        frequency, start_date,
        end_date: end_date ?? null,
        next_due_date,
        reminder_days: reminder_days ?? 1,
        reminder_on_due: reminder_on_due ?? 1,
        note: note ?? null,
        status: 'active',
        created_at: now,
        updated_at: now,
      });
      await this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/UPDATE\s+recurring_templates\s+SET/i.test(s)) {
      const id = params[params.length - 1];
      const tmpl = this.state.recurring_templates.find(t => t.id === id);
      if (tmpl) {
        const setClauses = s.match(/SET\s+(.*?)\s+WHERE/is)?.[1] ?? '';
        const pairs = setClauses.split(',').map(p => p.trim());
        let pi = 0;
        for (const pair of pairs) {
          const field = pair.split('=')[0].trim();
          if (field === 'updated_at') { tmpl.updated_at = new Date().toISOString(); continue; }
          if (/paid_periods\s*=\s*paid_periods\s*\+\s*1/i.test(pair)) {
            tmpl.paid_periods = (Number(tmpl.paid_periods) || 0) + 1;
            continue;
          }
          if (pi < params.length - 1) { tmpl[field] = params[pi++]; }
        }
        await this.persist();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }
    if (/DELETE\s+FROM\s+recurring_templates/i.test(s)) {
      const id = params[0];
      this.state.recurring_templates = this.state.recurring_templates.filter(t => t.id !== id);
      // Also delete associated entries
      this.state.recurring_entries = this.state.recurring_entries.filter(e => e.template_id !== id);
      await this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // ── Recurring Entries ──
    if (/INSERT\s+INTO\s+recurring_entries/i.test(s)) {
      const id = this.newId();
      const now = new Date().toISOString();
      const [template_id, due_date, actual_amount, status, note] = params;
      this.state.recurring_entries.push({
        id, template_id, due_date,
        actual_amount: actual_amount != null ? Number(actual_amount) : null,
        status: status ?? 'pending',
        paid_date: null,
        note: note ?? null,
        notification_ids: '',
        created_at: now,
      });
      await this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/UPDATE\s+recurring_entries\s+SET/i.test(s)) {
      const id = params[params.length - 1];
      const entry = this.state.recurring_entries.find(e => e.id === id);
      if (entry) {
        const setClauses = s.match(/SET\s+(.*?)\s+WHERE/is)?.[1] ?? '';
        const pairs = setClauses.split(',').map(p => p.trim());
        let pi = 0;
        for (const pair of pairs) {
          const field = pair.split('=')[0].trim();
          if (pi < params.length - 1) {
            entry[field] = field === 'actual_amount' ? (Number(params[pi]) || null) : params[pi];
            pi++;
          }
        }
        await this.persist();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // ── Budgets ──
    if (/INSERT\s+INTO\s+budgets/i.test(s)) {
      const id = this.newId();
      const [month, category_id, amount, alert_pct] = params;
      const existing = this.state.budgets.find(b =>
        b.month === month && (b.category_id ?? 0) === (category_id ?? 0)
      );
      if (existing) {
        existing.amount = Number(amount) || 0;
        existing.alert_pct = Number(alert_pct) || 80;
      } else {
        this.state.budgets.push({
          id, month,
          category_id: category_id ?? null,
          amount: Number(amount) || 0,
          alert_pct: Number(alert_pct) || 80,
          created_at: new Date().toISOString(),
        });
      }
      await this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }
    if (/DELETE\s+FROM\s+budgets/i.test(s)) {
      this.state.budgets = this.state.budgets.filter(b => b.id !== params[0]);
      await this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    return { lastInsertRowId: this.newId(), changes: 1 };
  }

  private enrichExpense(e: any) {
    const cat = this.state.categories.find(c => c.id === e.category_id);
    const subcat = this.state.categories.find(c => c.id === e.subcategory_id);
    const pm = this.state.payment_modes.find(p => p.id === e.payment_mode_id);
    return {
      ...e,
      amount: Number(e.amount) || 0,
      category_name: cat?.name ?? null,
      subcategory_name: subcat?.name ?? null,
      payment_mode_name: pm?.name ?? null,
    };
  }

  private enrichTemplate(t: any) {
    const cat = this.state.categories.find(c => c.id === t.category_id);
    const pm = this.state.payment_modes.find(p => p.id === t.payment_mode_id);
    return {
      ...t,
      amount: t.amount != null ? Number(t.amount) : null,
      category_name: cat?.name ?? null,
      payment_mode_name: pm?.name ?? null,
    };
  }

  // ─── IMPORTANT: GROUP BY check MUST come BEFORE BETWEEN check ───
  // The top-categories dashboard query contains BOTH BETWEEN and GROUP BY.
  // If BETWEEN matched first, it would return raw expense rows instead of
  // aggregated { name, total, color } objects → formatINR would show ₹NaN.
  async getAllAsync(sql: string, params: any[] = []): Promise<any[]> {
    await this.ensureLoaded();
    const s = sql.trim();

    // ── Static lookups ──
    if (/FROM\s+categories/i.test(s)) {
      return [...this.state.categories].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (/FROM\s+payment_modes/i.test(s)) {
      return [...this.state.payment_modes].sort((a, b) => a.name.localeCompare(b.name));
    }

    // ── Expenses: aggregation (GROUP BY) — MUST be before BETWEEN check ──
    if (/FROM\s+expenses/i.test(s) && /GROUP\s+BY/i.test(s)) {
      const [start, end] = params;
      const rows = this.state.expenses.filter(e => e.date >= start && e.date <= end);
      const byCategory: Record<string | number, { name: string; total: number; color: string | null }> = {};
      for (const e of rows) {
        const key = e.category_id ?? 0;
        const cat = this.state.categories.find(c => c.id === e.category_id);
        if (!byCategory[key]) {
          byCategory[key] = { name: cat?.name ?? 'Uncategorized', color: cat?.color ?? null, total: 0 };
        }
        byCategory[key].total += Number(e.amount) || 0;
      }
      return Object.values(byCategory).sort((a, b) => b.total - a.total).slice(0, 5);
    }

    // ── Expenses: date range ──
    if (/FROM\s+expenses/i.test(s) && /BETWEEN/i.test(s)) {
      const [start, end] = params;
      return this.state.expenses
        .filter(e => e.date >= start && e.date <= end)
        .map(e => this.enrichExpense(e))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    }

    // ── Expenses: all ──
    if (/FROM\s+expenses/i.test(s)) {
      return this.state.expenses
        .map(e => this.enrichExpense(e))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    }

    // ── Recurring templates ──
    if (/FROM\s+recurring_templates/i.test(s)) {
      return this.state.recurring_templates
        .map(t => this.enrichTemplate(t))
        .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
    }

    // ── Recurring entries: pending only ──
    if (/FROM\s+recurring_entries/i.test(s) && /status\s*=\s*'pending'/i.test(s)) {
      return this.state.recurring_entries
        .filter(e => e.status === 'pending')
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
    }

    // ── Recurring entries: by template ──
    if (/FROM\s+recurring_entries/i.test(s) && /template_id\s*=\s*\?/i.test(s)) {
      return this.state.recurring_entries
        .filter(e => e.template_id === params[0])
        .sort((a, b) => b.due_date.localeCompare(a.due_date));
    }

    // ── Recurring entries: all ──
    if (/FROM\s+recurring_entries/i.test(s)) {
      return [...this.state.recurring_entries].sort((a, b) => b.due_date.localeCompare(a.due_date));
    }

    // ── Budgets ──
    if (/FROM\s+budgets/i.test(s)) {
      const month = params[params.length - 1];
      const [y, m] = month.split('-').map(Number);
      const start = `${month}-01`;
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      return this.state.budgets
        .filter(b => b.month === month)
        .map(b => {
          const cat = this.state.categories.find(c => c.id === b.category_id);
          const spent = this.state.expenses
            .filter(e => e.date >= start && e.date <= end && (b.category_id == null || e.category_id === b.category_id))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          return { ...b, category_name: cat?.name ?? null, spent };
        });
    }

    return [];
  }

  async getFirstAsync(sql: string, params: any[] = []): Promise<any> {
    await this.ensureLoaded();
    const s = sql.trim();

    // Total & count for expenses in a date range
    if (/SUM\(amount\)/i.test(s) && /FROM\s+expenses/i.test(s)) {
      const [start, end] = params;
      const rows = this.state.expenses.filter(e => e.date >= start && e.date <= end);
      return {
        total: rows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        cnt: rows.length,
      };
    }

    // Pending recurring entries (due_date >= ?)
    if (/FROM\s+recurring_entries/i.test(s) && /status\s*=\s*'pending'/i.test(s) && /due_date\s*>=\s*\?/i.test(s)) {
      const cnt = this.state.recurring_entries.filter(e => e.status === 'pending' && e.due_date >= params[0]).length;
      return { cnt };
    }

    // Overdue recurring entries (due_date < ?)
    if (/FROM\s+recurring_entries/i.test(s) && /status\s*=\s*'pending'/i.test(s) && /due_date\s*<\s*\?/i.test(s)) {
      const cnt = this.state.recurring_entries.filter(e => e.status === 'pending' && e.due_date < params[0]).length;
      return { cnt };
    }

    return null;
  }

  async seedDefaults(): Promise<void> {
    await this.ensureLoaded();
    const DEFAULT_CATEGORIES = [
      { id: 1,  name: 'Food & Dining',    icon: '🍽️', color: '#f97316', parent_id: null, is_system: 1 },
      { id: 2,  name: 'Transport',        icon: '🚗', color: '#3b82f6', parent_id: null, is_system: 1 },
      { id: 3,  name: 'Groceries',        icon: '🛒', color: '#22c55e', parent_id: null, is_system: 1 },
      { id: 4,  name: 'Bills & Utilities',icon: '💡', color: '#eab308', parent_id: null, is_system: 1 },
      { id: 5,  name: 'Entertainment',    icon: '🎬', color: '#8b5cf6', parent_id: null, is_system: 1 },
      { id: 6,  name: 'Health',           icon: '💊', color: '#ec4899', parent_id: null, is_system: 1 },
      { id: 7,  name: 'Shopping',         icon: '🛍️', color: '#06b6d4', parent_id: null, is_system: 1 },
      { id: 8,  name: 'Education',        icon: '📚', color: '#6366f1', parent_id: null, is_system: 1 },
      { id: 9,  name: 'Rent',             icon: '🏠', color: '#64748b', parent_id: null, is_system: 1 },
      { id: 10, name: 'Savings',          icon: '💰', color: '#01696f', parent_id: null, is_system: 1 },
      { id: 11, name: 'Personal Care',    icon: '✂️', color: '#a16207', parent_id: null, is_system: 1 },
      { id: 12, name: 'Others',           icon: '📦', color: '#374151', parent_id: null, is_system: 1 },
    ];
    const DEFAULT_PAYMENT_MODES = [
      { id: 1, name: 'Cash',        is_system: 1 },
      { id: 2, name: 'UPI',         is_system: 1 },
      { id: 3, name: 'Credit Card', is_system: 1 },
      { id: 4, name: 'Debit Card',  is_system: 1 },
      { id: 5, name: 'Net Banking', is_system: 1 },
      { id: 6, name: 'Wallet',      is_system: 1 },
    ];
    const existingCatIds = new Set(this.state.categories.map((c: any) => c.id));
    for (const cat of DEFAULT_CATEGORIES) {
      if (!existingCatIds.has(cat.id)) {
        this.state.categories.push({ ...cat, created_at: new Date().toISOString() });
      }
    }
    const existingPmIds = new Set(this.state.payment_modes.map((p: any) => p.id));
    for (const pm of DEFAULT_PAYMENT_MODES) {
      if (!existingPmIds.has(pm.id)) {
        this.state.payment_modes.push(pm);
      }
    }
    await this.persist();
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    if (Platform.OS === 'web') {
      console.log('[DB] Web mode — using AsyncStorage mock DB (v4)');
      _db = new WebMockDB() as any;
    } else {
      _db = SQLite.openDatabaseSync('expense_tracker.db');
    }
  }
  return _db;
}

export async function initDB(): Promise<void> {
  const db = getDB();
  if (Platform.OS !== 'web') {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(CREATE_TABLES_SQL);
    await db.execAsync(SEED_DEFAULTS_SQL);
  } else {
    // Web mock: seed default categories and payment modes if not present
    const webDb = db as unknown as WebMockDB;
    await (webDb as any).seedDefaults?.();
  }
  console.log('[DB] Initialized successfully');
}
