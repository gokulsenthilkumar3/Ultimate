export const MODELS = { lgb: 'LightGBM', xgb: 'XGBoost', stacking: 'Stacking ensemble' };
const COLORS = ['#338568', '#9b6ac5', '#d47c42', '#448ac4', '#b46078', '#9c8629'];

export function buildForexSeries(series, mode, model) {
  return series.flatMap((item, index) => {
    const base = item.points.find(point => Number.isFinite(point.observed) && point.observed !== 0)?.observed;
    const value = rate => Number.isFinite(rate) ? mode === 'single' ? rate : base ? (rate / base - 1) * 100 : null : null;
    return [{ label: `${item.currency} observed`, color: COLORS[index % COLORS.length], points: item.points.map(point => ({ date: point.date, value: value(point.observed) })) }, { label: `${item.currency} ${MODELS[model] || model}`, color: COLORS[index % COLORS.length], dashed: true, points: item.points.map(point => ({ date: point.date, value: value(point.modelRate) })) }];
  });
}
export function forexCSV(series) {
  const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return ['currency,date,source_date,observed,model_rate,estimated_date', ...series.flatMap(item => item.points.map(point => [item.currency, point.date, point.sourceDate, point.observed, point.modelRate, point.estimatedDate].map(cell).join(',')))].join('\r\n');
}
