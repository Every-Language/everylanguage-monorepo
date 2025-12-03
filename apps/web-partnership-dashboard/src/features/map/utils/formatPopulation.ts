/**
 * Formats population numbers with compact notation for large numbers.
 *
 * Examples:
 * - 1,200,000,000 -> "1.2B"
 * - 24,012,000 -> "24M"
 * - 1,500,000 -> "1.5M"
 * - 500,000 -> "500K"
 * - 50,000 -> "50K"
 * - 5,000 -> "5,000"
 * - 500 -> "500"
 */
export function formatPopulationCompact(
  value: number | null | undefined
): string {
  if (value == null || isNaN(value)) {
    return 'N/A';
  }

  const num = Number(value);

  // Use compact notation for numbers >= 1 million
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  return num.toLocaleString();
}
