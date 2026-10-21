/**
 * Backup & Restore service
 * Exports all local DB data as a JSON file and restores from it.
 * No cloud sync — file is saved to device storage and shared manually.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB } from '../db';
import { SQLiteBindParams } from 'expo-sqlite';

interface BackupData {
  version: number;
  exportedAt: string;
  categories: Record<string, unknown>[];
  paymentModes: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  recurringTemplates: Record<string, unknown>[];
  recurringEntries: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function exportBackup(): Promise<void> {
  const db = getDB();

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories:         await db.getAllAsync('SELECT * FROM categories'),
    paymentModes:       await db.getAllAsync('SELECT * FROM payment_modes'),
    expenses:           await db.getAllAsync('SELECT * FROM expenses'),
    recurringTemplates: await db.getAllAsync('SELECT * FROM recurring_templates'),
    recurringEntries:   await db.getAllAsync('SELECT * FROM recurring_entries'),
    budgets:            await db.getAllAsync('SELECT * FROM budgets'),
  };

  const filename = `expense_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const path = `${(FileSystem as any).documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Save Backup File' });
}

// ─── Pick file & import ───────────────────────────────────────────────────────
export async function pickAndImportBackup(): Promise<{ success: boolean; message: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) {
    return { success: false, message: 'Cancelled.' };
  }
  return importBackup(result.assets[0].uri);
}

// ─── Import ───────────────────────────────────────────────────────────────────
export async function importBackup(
  fileUri: string
): Promise<{ success: boolean; message: string }> {
  try {
    const raw  = await FileSystem.readAsStringAsync(fileUri);
    const data: BackupData = JSON.parse(raw);

    if (data.version !== 1) {
      return { success: false, message: 'Unsupported backup version.' };
    }

    const db = getDB();

    // Clear existing user data (preserve system-seeded rows)
    await db.execAsync(`
      DELETE FROM notifications_log;
      DELETE FROM budgets;
      DELETE FROM recurring_entries;
      DELETE FROM recurring_templates;
      DELETE FROM expenses;
      DELETE FROM categories    WHERE is_system = 0;
      DELETE FROM payment_modes WHERE is_system = 0;
    `);

    // Restore categories (skip system rows — already seeded)
    for (const r of data.categories) {
      if (r.is_system) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO categories
         (id, name, icon, color, parent_id, is_system, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.icon ?? null, r.color ?? null,
         r.parent_id ?? null, r.is_system ?? 0, r.created_at]
      );
    }

    // Restore payment modes (skip system rows)
    for (const r of data.paymentModes) {
      if (r.is_system) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO payment_modes (id, name, is_system) VALUES (?, ?, ?)`,
        [r.id, r.name, r.is_system ?? 0]
      );
    }

    // Restore expenses
    for (const r of data.expenses) {
      await db.runAsync(
        `INSERT OR REPLACE INTO expenses
         (id, amount, date, category_id, subcategory_id, payment_mode_id,
          note, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.amount, r.date, r.category_id ?? null,
         r.subcategory_id ?? null, r.payment_mode_id ?? null,
         r.note ?? null, r.tags ?? null, r.created_at, r.updated_at]
      );
    }

    // Restore recurring templates
    for (const r of data.recurringTemplates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO recurring_templates
         (id, name, type, category_id, payment_mode_id, amount, total_periods,
          paid_periods, installment_amt, min_amount, max_amount, frequency,
          start_date, end_date, next_due_date, reminder_days, reminder_on_due,
          status, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.type, r.category_id ?? null, r.payment_mode_id ?? null,
         r.amount ?? null, r.total_periods ?? null, r.paid_periods ?? 0,
         r.installment_amt ?? null, r.min_amount ?? null, r.max_amount ?? null,
         r.frequency, r.start_date, r.end_date ?? null, r.next_due_date,
         r.reminder_days ?? 1, r.reminder_on_due ?? 1,
         r.status ?? 'active', r.note ?? null, r.created_at, r.updated_at]
      );
    }

    // Restore recurring entries
    for (const r of data.recurringEntries) {
      await db.runAsync(
        `INSERT OR REPLACE INTO recurring_entries
         (id, template_id, due_date, actual_amount, status, paid_date,
          note, notification_ids, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.template_id, r.due_date, r.actual_amount ?? null,
         r.status ?? 'pending', r.paid_date ?? null, r.note ?? null,
         r.notification_ids ?? '[]', r.created_at]
      );
    }

    // Restore budgets
    for (const r of data.budgets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO budgets
         (id, month, category_id, amount, alert_pct, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.month, r.category_id ?? null, r.amount,
         r.alert_pct ?? 80, r.created_at]
      );
    }

    return {
      success: true,
      message:
        `Restored ${data.expenses.length} expenses, ` +
        `${data.recurringTemplates.length} recurring templates, ` +
        `${data.budgets.length} budgets.`,
    };
  } catch (e) {
    return { success: false, message: `Restore failed: ${(e as Error).message}` };
  }
}
