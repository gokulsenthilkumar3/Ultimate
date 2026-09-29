import { apiSync } from './useStore';
import { captureSession, createWriteQueue, mutationPayload, recordFields, requireAcknowledgement, requireRecord } from './persistence';

export function optionalPrice(value: any) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (typeof value === 'boolean' || !Number.isFinite(number) || number < 0 || number > 1e12) throw new Error('Prices must be finite, non-negative amounts.');
  return number;
}

export function safeShoppingUrl(value: any) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

function integer(value: any, label: string, minimum = 0) {
  const number = Number(value);
  if (value === '' || value == null || typeof value === 'boolean' || !Number.isSafeInteger(number) || number < minimum || number > 1e6) throw new Error(`${label} must be a whole number of at least ${minimum}.`);
  return number;
}

export function validateShopping(item: any) {
  const name = String(item.name ?? '').trim();
  if (!name) throw new Error('Item name is required.');
  const url = safeShoppingUrl(item.url);
  if (item.url && !url) throw new Error('Use a valid HTTP or HTTPS product link without credentials.');
  const priority = item.priority ?? 'medium';
  if (!['high', 'medium', 'low'].includes(priority)) throw new Error('Choose a valid priority.');
  const stage = item.stage ?? (item.purchased ? 'purchased' : 'future');
  if (!['future', 'ordered', 'arriving', 'purchased'].includes(stage)) throw new Error('Choose a valid purchase stage.');
  return { ...item, name, quantity: integer(item.quantity ?? 1, 'Quantity', 1), priority, stage, purchased: stage === 'purchased', url,
    estimatedCost: optionalPrice(item.estimatedCost), targetPrice: optionalPrice(item.targetPrice) };
}

export function shoppingEstimate(item: any) {
  try {
    const price = optionalPrice(item.estimatedCost);
    return price == null ? null : price * integer(item.quantity ?? 1, 'Quantity', 1);
  } catch { return null; }
}

export function validateMedia(item: any) {
  const title = String(item.title ?? '').trim();
  if (!title) throw new Error('Title cannot be empty.');
  const type = item.type ?? 'Series', status = item.status ?? 'Plan to Watch';
  if (!['Anime', 'Series', 'Movie', 'Documentary'].includes(type)) throw new Error('Choose a valid media type.');
  if (!['Watching', 'Plan to Watch', 'Completed', 'Dropped'].includes(status)) throw new Error('Choose a valid watch status.');
  const season = integer(item.season ?? 1, 'Season', 1);
  const episode = integer(item.episode ?? 0, 'Episodes watched');
  const total = item.total_episodes == null || item.total_episodes === '' || item.total_episodes === 0 ? null : integer(item.total_episodes, 'Total episodes', 1);
  if (total != null && episode > total) throw new Error('Episodes watched cannot exceed the known total.');
  const rating = item.rating == null || item.rating === '' ? null : Number(item.rating);
  if (rating != null && (!Number.isFinite(rating) || rating < 0 || rating > 10 || typeof item.rating === 'boolean')) throw new Error('Rating must be between 0 and 10.');
  return { ...item, title, type, status, season, episode, total_episodes: total, rating };
}

// These two nested collections use acknowledgement-first writes: a failure
// never deletes or overwrites the last acknowledged record. Queue rebasing
// preserves audit metadata and prevents rapid progress edits racing each other.
export function createLibraryActions(set: any, get: any, container: string, key: string, route: string, validate: (row: any) => any) {
  const queue = createWriteQueue();
  const rows = () => get()[container]?.[key] ?? [];
  const run = (operation: (current: () => boolean) => Promise<any>) => {
    const current = captureSession(get);
    return queue(`${get()._sessionVersion}:${get().user?.id}:${container}`, async () => {
      if (!current()) throw new Error('The session changed. Refresh and try again.');
      return operation(current);
    });
  };
  const publish = (current: () => boolean, saved: any) => {
    if (current()) set((state: any) => ({ [container]: { ...state[container], [key]: [saved, ...(state[container]?.[key] ?? []).filter((row: any) => String(row.id) !== String(saved.id))] } }));
  };
  const add = (input: any) => run(async current => {
    const payload = validate({ ...input, id: input.id ?? crypto.randomUUID() });
    let response;
    try { response = requireRecord(await apiSync(route, 'POST', payload)); }
    catch (error) {
      // A lost create response is ambiguous. Reconcile the stable identifier;
      // never resend or silently replace a different existing record.
      try {
        const existing = await apiSync(route, 'GET');
        const match = Array.isArray(existing) && existing.find((row: any) => String(row.id) === String(payload.id));
        if (match && Object.entries(payload).every(([field, value]) => ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'userId', 'data'].includes(field) || JSON.stringify(match[field]) === JSON.stringify(value))) response = match;
      } catch { /* Preserve the original save failure. */ }
      if (!response) throw error;
    }
    if (String(response.id) !== String(payload.id)) throw new Error('The server acknowledged a different record. Refresh before retrying.');
    const saved = { ...payload, ...response }; publish(current, saved); return saved;
  });
  const update = (id: string, patch: any) => run(async current => {
    const previous = rows().find((row: any) => String(row.id) === String(id));
    if (!previous) throw new Error('Record not found. Refresh before saving.');
    const updates = typeof patch === 'function' ? patch(previous) : patch;
    const normalized = validate({ ...previous, ...updates });
    const payload = Object.fromEntries(Object.keys(updates).map(field => [field, normalized[field]]));
    // Purchase stage and checkbox must remain consistent in both directions.
    if (container === 'shopping' && ('stage' in updates || 'purchased' in updates)) {
      const stage = 'stage' in updates ? normalized.stage : updates.purchased ? 'purchased' : 'future';
      payload.stage = stage; payload.purchased = stage === 'purchased';
    }
    const response = requireAcknowledgement(await apiSync(`${route}/${encodeURIComponent(id)}`, 'PUT', mutationPayload(previous, payload)));
    const saved = { ...previous, ...payload, ...recordFields(response) }; publish(current, saved); return saved;
  });
  return {
    add, update, run,
    remove: (id: string) => run(async current => {
      const previous = rows().find((row: any) => String(row.id) === String(id));
      if (!previous) throw new Error('Record not found. Refresh before deleting.');
      requireAcknowledgement(await apiSync(`${route}/${encodeURIComponent(id)}`, 'DELETE', mutationPayload(previous)));
      if (current()) set((state: any) => ({ [container]: { ...state[container], [key]: state[container][key].filter((row: any) => String(row.id) !== String(id)) } }));
      return previous;
    }),
  };
}

// Separate from finance methods owned by another worker. A deterministic
// transaction ID makes retry safe if the expense saved but its item link did not.
export function createShoppingConversion(set: any, get: any, shopping: ReturnType<typeof createLibraryActions>) {
  const queue = createWriteQueue();
  return (id: string, details: any, confirmed = false) => {
    const current = captureSession(get);
    return queue(`${get()._sessionVersion}:${get().user?.id}:expense:${id}`, async () => {
      if (!confirmed) throw new Error('Confirm the actual expense amount and date before recording it.');
      if (!current()) throw new Error('The session changed. Refresh and try again.');
      const item = get().shopping.items.find((row: any) => String(row.id) === String(id));
      if (!item?.purchased) throw new Error('Mark the item purchased before recording an expense.');
      const amount = optionalPrice(details.amount);
      if (amount == null || amount <= 0) throw new Error('Enter the actual total paid, greater than zero.');
      const date = String(details.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Enter a valid expense date.');
      const expenseId = item.expenseId || `shopping-expense-${item.id}`;
      const all = await apiSync('/finance', 'GET');
      if (!Array.isArray(all)) throw new Error('Existing expenses could not be verified. No expense was created.');
      if (!current()) throw new Error('The session changed. Refresh and try again.');
      let saved = all.find((row: any) => row.id === expenseId);
      const payload = { id: expenseId, type: 'Expense', amount, date, category: 'Shopping', method: details.method || 'Other', note: `Shopping: ${item.name} (quantity ${item.quantity ?? 1}; item ${item.id})` };
      if (saved && (saved.type !== 'Expense' || Number(saved.amount) !== amount || saved.date !== date)) throw new Error('This purchase already has an expense with a different amount or date. Review it in Finance.');
      if (!saved) {
        try { saved = requireRecord(await apiSync('/finance', 'POST', payload)); }
        catch (error) {
          try { const rows = await apiSync('/finance', 'GET'); saved = Array.isArray(rows) && rows.find((row: any) => row.id === expenseId && Number(row.amount) === amount && row.date === date && row.type === 'Expense'); } catch { /* Preserve the save error. */ }
          if (!saved) throw error;
        }
      }
      if (saved.id !== expenseId) throw new Error('Expense acknowledgement did not match this purchase. Refresh before retrying.');
      if (!current()) throw new Error('The expense saved for the previous session. Refresh your account before continuing.');
      set((state: any) => ({ finance: { ...state.finance, transactions: { ...state.finance.transactions, [saved.id]: saved } } }));
      try { await shopping.update(id, { expenseId: saved.id, actualCost: Number(saved.amount), expenseDate: saved.date }); }
      catch (error) { throw new Error(`Expense saved, but the shopping link failed. Retry with the same amount/date to finish linking: ${error instanceof Error ? error.message : 'Save failed'}`); }
      return saved;
    });
  };
}
