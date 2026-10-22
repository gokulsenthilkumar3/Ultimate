export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatVolume(value: number): string {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)}Cr`
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(2)}L`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}
