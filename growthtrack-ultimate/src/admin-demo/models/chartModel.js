export const SAMPLE_DATE = '2026-10-28';
export const SERIES = Object.freeze({
  '7 days': [30, 36, 32, 44, 38, 52, 62, 60, 76, 69, 88, 94, 91, 110],
  '30 days': [27, 32, 28, 36, 33, 38, 36, 53, 50, 60, 54, 76, 70, 73, 95, 91, 108, 103, 120, 113, 128, 123],
  '90 days': [10, 28, 19, 37, 25, 48, 35, 54, 45, 65, 49, 80, 71, 85, 76, 96, 90, 114, 102, 131],
});

export function chartDates(range = '30 days') {
  const days = Object.hasOwn(SERIES, range) ? Number.parseInt(range, 10) : 30;
  const end = Date.parse(`${SAMPLE_DATE}T00:00:00Z`);
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(end - Math.round((days - 1) * (1 - i / 5)) * 86400000);
    return { iso: date.toISOString().slice(0, 10), label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }) };
  });
}

export function chartGeometry(range, referenceValue) {
  const source = SERIES[range] || SERIES['30 days'];
  const quoted = Number.isFinite(referenceValue) && referenceValue > 0;
  const values = quoted ? source.map(v => referenceValue * (1 + (v - source.at(-1)) / 150 * .03)) : source;
  const span = Math.max(...values) - Math.min(...values);
  const min = quoted ? Math.min(...values) - span * .2 : 0;
  const max = quoted ? Math.max(...values) + span * .2 : 150;
  const coordinates = values.map((value, i) => [100 + i * (600 / (values.length - 1)), 194 - (value - min) / (max - min) * 154]);
  const ticks = Array.from({ length: 4 }, (_, i) => ({ y: 40 + i * 154 / 3, value: max - i * (max - min) / 3 }));
  const decimals = quoted ? referenceValue < 1 ? 4 : 2 : 0;
  return { coordinates, ticks, format: value => value.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) };
}
