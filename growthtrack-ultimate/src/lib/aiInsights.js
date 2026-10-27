const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12 ? value : null;
const rounded = value => Math.round(value * 100) / 100;
const day = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = value.slice(0, 10), parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
};
const done = row => row.done === true || row.done === 1 || ['done', 'completed'].includes(String(row.status || '').toLowerCase());

/** Aggregate projected, owned records only. No source content or identities enter an overview. */
export function createAiOverviewCandidates(records, today) {
  return ['workspace', 'wellness', 'finance', 'journal'].flatMap(domain => {
    const source = records.filter(record => record.domain === domain);
    if (!source.length) return [];
    const rows = source.flatMap(record => { try { return [{ ...record, fields: JSON.parse(record.text) }]; } catch { return []; } });
    const of = type => rows.filter(row => row.type === type).map(row => row.fields);
    const coverage = Object.fromEntries([...new Set(rows.map(row => row.type))].map(type => [type, of(type).length]));
    const summary = { asOf: today, scope: 'Owner-filtered records currently loaded in GrowthTrack. Not a complete account export or live companion-service data.', recordsIncluded: rows.length, coverage, facts: {}, missing: [] };
    const dates = rows.map(row => day(row.fields.measuredAt || row.fields.date || row.fields.start)).filter(Boolean).sort();
    summary.recordDateSpan = { datedRecords: dates.length, firstDate: dates[0] || null, lastDate: dates.at(-1) || null };
    const tasks = of('tasks');
    if (tasks.length) summary.facts.tasks = {
      total: tasks.length, completed: tasks.filter(done).length, open: tasks.filter(row => !done(row)).length,
      overdue: tasks.filter(row => !done(row) && day(row.due_date || row.dueDate) && day(row.due_date || row.dueDate) < today).length,
      withoutDueDate: tasks.filter(row => !day(row.due_date || row.dueDate)).length,
    };
    const goals = of('goals');
    if (goals.length) {
      const measurable = goals.filter(row => finite(row.current_value) !== null && finite(row.target_value) !== null && row.target_value > 0);
      summary.facts.goals = { total: goals.length, withNumericProgress: measurable.length, targetsReached: measurable.filter(row => row.current_value >= row.target_value).length, withoutNumericProgress: goals.length - measurable.length };
    }
    if (of('habits').length) { summary.facts.habits = { total: of('habits').length }; summary.missing.push('Habit adherence cannot be calculated from a stored streak alone; check-in history is not included.'); }
    const time = of('timesheets').map(row => finite(row.hours)).filter(value => value !== null && value >= 0 && value <= 24);
    if (time.length) summary.facts.timesheets = { hoursInRecordedSessions: rounded(time.reduce((a, b) => a + b, 0)), sessionsWithHours: time.length };
    const sleep = of('sleep').filter(row => day(row.date) && day(row.date) <= today && finite(row.hours) !== null && row.hours >= 0 && row.hours <= 24);
    if (of('sleep').length) summary.facts.sleep = { usableLogs: sleep.length, excludedLogs: of('sleep').length - sleep.length, averageHoursPerLog: sleep.length ? rounded(sleep.reduce((sum, row) => sum + row.hours, 0) / sleep.length) : null, distinctDays: new Set(sleep.map(row => day(row.date))).size };
    const nutrition = of('nutrition').filter(row => day(row.date) && day(row.date) <= today);
    if (of('nutrition').length) {
      summary.facts.nutrition = { datedMeals: nutrition.length, excludedMeals: of('nutrition').length - nutrition.length, distinctDays: new Set(nutrition.map(row => day(row.date))).size };
      for (const field of ['calories', 'protein', 'carbs', 'fat']) {
        const values = nutrition.map(row => finite(row[field])).filter(value => value !== null && value >= 0);
        summary.facts.nutrition[field] = { totalInLoadedMeals: values.length ? rounded(values.reduce((a, b) => a + b, 0)) : null, mealsWithValue: values.length };
      }
      summary.missing.push('Meal totals cover loaded dated entries only; they are not complete daily intake or proof of meeting nutrition targets.');
    }
    const metricGroups = new Map();
    for (const row of of('metrics')) {
      if (!day(row.measuredAt || row.date) || day(row.measuredAt || row.date) > today || finite(row.value) === null || !row.metric || !row.unit) continue;
      const key = JSON.stringify([row.metric, row.unit]);
      if (!metricGroups.has(key)) metricGroups.set(key, []);
      metricGroups.get(key).push(row);
    }
    const trends = [...metricGroups.values()].slice(0, 8).map(group => {
      const ordered = [...group].sort((a, b) => String(a.measuredAt || a.date).localeCompare(String(b.measuredAt || b.date)));
      const first = ordered[0], last = ordered.at(-1);
      return { metric: String(last.metric).slice(0, 80), unit: String(last.unit).slice(0, 40), observations: group.length, firstDate: day(first.measuredAt || first.date), latestDate: day(last.measuredAt || last.date), firstValue: first.value, latestValue: last.value,
        change: day(first.measuredAt || first.date) !== day(last.measuredAt || last.date) ? rounded(last.value - first.value) : null };
    });
    if (of('metrics').length) { summary.facts.measurements = trends; summary.missing.push('Measurement groups require valid dates and matching units. Up to eight groups are summarized; changes do not establish causes.'); }
    if (domain === 'finance') {
      const totals = new Map(); let skipped = 0;
      for (const row of of('transactions')) {
        const currency = String(row.currency || '').toUpperCase(), amount = finite(row.amount), kind = String(row.type || '').toLowerCase();
        if (!/^[A-Z]{3}$/.test(currency) || amount === null || !['income', 'expense', 'investment'].includes(kind)) { skipped++; continue; }
        if (!totals.has(currency)) totals.set(currency, { currency, income: 0, expense: 0, investment: 0, records: 0 });
        const total = totals.get(currency); total[kind] += amount; total.records++;
      }
      summary.facts.transactions = { totalsByCurrency: [...totals.values()].slice(0, 8).map(row => ({ ...row, income: rounded(row.income), expense: rounded(row.expense), investment: rounded(row.investment) })), excludedFromTotals: skipped };
      summary.missing.push('Currencies are never combined. Missing currency/amount/type records are excluded from totals. Balances, full budgets, investment returns, and future prices cannot be inferred.');
    }
    if (domain === 'journal') summary.missing.push('This overview includes entry counts only. Select individual entries to discuss their content or themes.');
    summary.missing.push('Missing data is unknown, not zero. Counts describe the loaded subset; future-dated measurements and unusable values are excluded.');
    const text = JSON.stringify(summary);
    if (text.length > 6000) return []; // Never attach a truncated or invalid JSON overview.
    return [{ key: `${domain}_summary:loaded-overview`, id: 'loaded-overview', type: `${domain}_summary`, domain, group: 'App overviews', label: `${domain[0].toUpperCase() + domain.slice(1)} overview (${rows.length} record${rows.length === 1 ? '' : 's'})`, text,
      preview: `${Object.entries(coverage).map(([type, count]) => `${count} ${type}`).join(' · ')}. Shares counts and available calculations, without individual record text.` }];
  });
}
