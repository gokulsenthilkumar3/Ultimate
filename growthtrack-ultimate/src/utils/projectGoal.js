/**
 * projectGoal — Linear regression trend + ETA calculator
 * 
 * @param {Array<{date: string, value: number}>} dataPoints - Historical data sorted oldest→newest
 * @param {number} targetValue - The goal target to project towards
 * @returns {{ weeksToTarget: number|null, trend: 'accelerating'|'slowing'|'stalled'|'insufficient_data', 
 *             projectedDate: string|null, weeklyRate: number, confidence: 'high'|'medium'|'low' }}
 */
export function projectGoal(dataPoints, targetValue) {
  if (!dataPoints || dataPoints.length < 2) {
    return { weeksToTarget: null, trend: 'insufficient_data', projectedDate: null, weeklyRate: 0, confidence: 'low' };
  }

  // Convert dates to numeric x-values (days since first entry)
  const first = new Date(dataPoints[0].date).getTime();
  const points = dataPoints.map(p => ({
    x: (new Date(p.date).getTime() - first) / (1000 * 60 * 60 * 24), // days
    y: p.value,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { weeksToTarget: null, trend: 'stalled', projectedDate: null, weeklyRate: 0, confidence: 'low' };
  }

  const slope = (n * sumXY - sumX * sumY) / denom; // units per day
  const intercept = (sumY - slope * sumX) / n;

  const currentValue = intercept + slope * points[n - 1].x;
  const weeklyRate = slope * 7;

  // ETA: solve for x when y = targetValue
  let weeksToTarget = null;
  let projectedDate = null;

  if (Math.abs(slope) > 0.0001) {
    const daysToTarget = (targetValue - currentValue) / slope;
    if (daysToTarget > 0) {
      weeksToTarget = Math.round(daysToTarget / 7);
      const etaDate = new Date(new Date(dataPoints[n - 1].date).getTime() + daysToTarget * 86400000);
      projectedDate = etaDate.toISOString().slice(0, 10);
    }
  }

  // Trend: compare first-half slope vs second-half slope
  const mid = Math.floor(n / 2);
  const firstHalf = dataPoints.slice(0, mid);
  const secondHalf = dataPoints.slice(mid);
  const firstRate = firstHalf.length > 1 ? (firstHalf[firstHalf.length - 1].value - firstHalf[0].value) : 0;
  const secondRate = secondHalf.length > 1 ? (secondHalf[secondHalf.length - 1].value - secondHalf[0].value) : 0;

  let trend;
  if (Math.abs(weeklyRate) < 0.01) {
    trend = 'stalled';
  } else if (secondRate > firstRate * 1.2) {
    trend = 'accelerating';
  } else if (secondRate < firstRate * 0.6) {
    trend = 'slowing';
  } else {
    trend = 'steady';
  }

  const confidence = n >= 10 ? 'high' : n >= 5 ? 'medium' : 'low';

  return { weeksToTarget, trend, projectedDate, weeklyRate: parseFloat(weeklyRate.toFixed(3)), confidence };
}

/**
 * generateProjectionChartData — Build Recharts-compatible data for a trend + projection line
 * 
 * @param {Array<{date: string, value: number}>} dataPoints
 * @param {number} targetValue
 * @param {number} projectionWeeks - How many weeks to project into the future
 */
export function generateProjectionChartData(dataPoints, targetValue, projectionWeeks = 12) {
  if (!dataPoints || dataPoints.length < 2) return [];

  const result = dataPoints.map(p => ({ date: p.date, actual: p.value, projected: null }));

  const { weeksToTarget, weeklyRate } = projectGoal(dataPoints, targetValue);
  const lastPoint = dataPoints[dataPoints.length - 1];
  const lastValue = lastPoint.value;
  const lastDate = new Date(lastPoint.date);

  const maxWeeks = weeksToTarget ? Math.min(weeksToTarget + 2, projectionWeeks) : projectionWeeks;

  for (let w = 1; w <= maxWeeks; w++) {
    const projDate = new Date(lastDate.getTime() + w * 7 * 86400000);
    const projValue = parseFloat((lastValue + weeklyRate * w).toFixed(2));
    result.push({
      date: projDate.toISOString().slice(0, 10),
      actual: null,
      projected: projValue,
    });
  }

  return result;
}
