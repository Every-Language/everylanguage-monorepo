/**
 * Formats population numbers with commas for readability.
 *
 * Examples:
 * - 24,012,000 -> "24,012,000"
 * - 1,500,000 -> "1,500,000"
 * - 500,000 -> "500,000"
 * - 50,000 -> "50,000"
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
  return num.toLocaleString();
}
