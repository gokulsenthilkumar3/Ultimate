import { finiteObservation, observationDate } from '../utils/projectGoal';

export function portfolioSnapshotKey(user) {
  return 'growthtrack:portfolio-snapshots:v1:' + encodeURIComponent(String(user?.id || user?.email || 'local-profile'));
}

export function readPortfolioSnapshots(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function holdingSnapshot(holding, snapshots) {
  const price = finiteObservation(holding?.currentPrice);
  const entry = snapshots?.[String(holding?.id)];
  // Dates are valid only for the exact price and asset entered by the user.
  const date = entry?.price === price && entry?.name === holding?.name && entry?.symbol === (holding?.symbol || '')
    ? observationDate(entry.date) : null;
  return { price: price !== null && price > 0 ? price : null, date };
}

export function summarizePortfolio(portfolio, snapshots) {
  const holdings = (Array.isArray(portfolio) ? portfolio : []).map(holding => {
    const units = finiteObservation(holding?.units);
    const buyPrice = finiteObservation(holding?.buyPrice);
    const rawCost = units !== null && units > 0 && buyPrice !== null && buyPrice > 0 ? units * buyPrice : null;
    const cost = Number.isFinite(rawCost) ? rawCost : null;
    const snapshot = holdingSnapshot(holding, snapshots);
    const rawValue = units !== null && units > 0 && snapshot.price !== null && snapshot.date ? units * snapshot.price : null;
    const value = Number.isFinite(rawValue) ? rawValue : null;
    const difference = value !== null && cost !== null ? value - cost : null;
    return { ...holding, cost, snapshot, value, difference };
  });
  const sumKnown = key => {
    if (!holdings.length) return 0;
    if (!holdings.every(holding => holding[key] !== null)) return null;
    const value = holdings.reduce((sum, holding) => sum + holding[key], 0);
    return Number.isFinite(value) ? value : null;
  };
  const totalCost = sumKnown('cost');
  const totalValue = sumKnown('value');
  return { holdings, totalCost, totalValue, totalDifference: totalCost !== null && totalValue !== null ? totalValue - totalCost : null };
}
