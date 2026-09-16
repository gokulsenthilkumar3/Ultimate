import { create } from 'zustand';
import {
  getRecurringTemplatesWithDetails,
  addRecurringTemplate as dbAddTemplate,
  updateRecurringTemplate as dbUpdateTemplate,
  deleteRecurringTemplate as dbDeleteTemplate,
  getRecurringEntries,
  addRecurringEntry as dbAddEntry,
  updateRecurringEntry as dbUpdateEntry,
  markEntryPaid as dbMarkPaid,
  getPendingEntries,
  RecurringTemplateWithDetails,
  RecurringTemplateInsert,
  RecurringEntry,
} from '../db/queries';
import { getNextDueDate, toISO } from '../utils/date';
import { Frequency } from '../constants/enums';
import {
  scheduleAllNotificationsForEntry,
  cancelEntryNotifications,
} from '../services/notifications';

interface RecurringStore {
  templates: RecurringTemplateWithDetails[];
  entries: RecurringEntry[];
  pendingEntries: RecurringEntry[];
  loading: boolean;

  loadAll: () => Promise<void>;
  loadEntries: (templateId?: number) => Promise<void>;
  loadPending: () => Promise<void>;

  addTemplate: (template: RecurringTemplateInsert) => Promise<number>;
  updateTemplate: (id: number, fields: Partial<RecurringTemplateInsert & { status: string; paid_periods: number; next_due_date: string }>) => Promise<void>;
  deleteTemplate: (id: number) => Promise<void>;

  markPaid: (entryId: number, actualAmount: number, templateId: number) => Promise<void>;
  skipEntry: (entryId: number, templateId: number) => Promise<void>;
  autoGenerateEntry: (templateId: number) => Promise<void>;
}

export const useRecurringStore = create<RecurringStore>((set, get) => ({
  templates: [],
  entries: [],
  pendingEntries: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const templates = await getRecurringTemplatesWithDetails();
    set({ templates, loading: false });
  },

  loadEntries: async (templateId) => {
    const entries = await getRecurringEntries(templateId);
    set({ entries });
  },

  loadPending: async () => {
    const pendingEntries = await getPendingEntries();
    set({ pendingEntries });
  },

  addTemplate: async (template) => {
    const id = await dbAddTemplate(template);
    // Auto-create the first pending entry
    const entryId = await dbAddEntry({ template_id: id, due_date: template.next_due_date });
    // Schedule reminders for this entry
    scheduleAllNotificationsForEntry(
      entryId,
      template.name,
      template.amount,
      new Date(template.next_due_date),
      template.reminder_days,
      template.reminder_on_due === 1
    ).catch(() => {});
    const templates = await getRecurringTemplatesWithDetails();
    set({ templates });
    return id;
  },

  updateTemplate: async (id, fields) => {
    await dbUpdateTemplate(id, fields);
    const templates = await getRecurringTemplatesWithDetails();
    set({ templates });
  },

  deleteTemplate: async (id) => {
    await dbDeleteTemplate(id);
    const templates = await getRecurringTemplatesWithDetails();
    set({ templates });
  },

  markPaid: async (entryId, actualAmount, templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;
    const nextDue = toISO(getNextDueDate(new Date(template.next_due_date), template.frequency as Frequency));

    // Cancel existing notifications for this entry before marking paid
    cancelEntryNotifications(entryId).catch(() => {});

    // Check if installment-based and all periods done
    const newPaid = template.paid_periods + 1;
    const isDone = template.type === 'installment' && template.total_periods !== null && newPaid >= template.total_periods;

    await dbMarkPaid(entryId, actualAmount, templateId, nextDue);

    if (isDone) {
      await dbUpdateTemplate(templateId, { status: 'completed' });
    } else {
      // Create next pending entry and schedule its notifications
      const nextEntryId = await dbAddEntry({ template_id: templateId, due_date: nextDue });
      scheduleAllNotificationsForEntry(
        nextEntryId,
        template.name,
        template.amount,
        new Date(nextDue),
        template.reminder_days,
        template.reminder_on_due === 1
      ).catch(() => {});
    }

    const templates = await getRecurringTemplatesWithDetails();
    const pendingEntries = await getPendingEntries();
    set({ templates, pendingEntries });
  },

  skipEntry: async (entryId, templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;
    const nextDue = toISO(getNextDueDate(new Date(template.next_due_date), template.frequency as Frequency));
    // Cancel notifications for the skipped entry
    cancelEntryNotifications(entryId).catch(() => {});
    await dbUpdateEntry(entryId, { status: 'skipped' });
    await dbUpdateTemplate(templateId, { next_due_date: nextDue });
    const nextEntryId = await dbAddEntry({ template_id: templateId, due_date: nextDue });
    // Schedule notifications for the next period
    scheduleAllNotificationsForEntry(
      nextEntryId,
      template.name,
      template.amount,
      new Date(nextDue),
      template.reminder_days,
      template.reminder_on_due === 1
    ).catch(() => {});
    const [templates, pendingEntries] = await Promise.all([
      getRecurringTemplatesWithDetails(),
      getPendingEntries(),
    ]);
    set({ templates, pendingEntries });
  },

  autoGenerateEntry: async (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;
    await dbAddEntry({ template_id: templateId, due_date: template.next_due_date });
    const pendingEntries = await getPendingEntries();
    set({ pendingEntries });
  },
}));
