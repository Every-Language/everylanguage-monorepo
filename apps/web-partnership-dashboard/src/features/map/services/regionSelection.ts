/**
 * Region Selection Service
 *
 * Business logic for selecting the primary region for a language entity
 * based on dominance-related metrics.
 */

type JoinRow = Record<string, unknown> & {
  regions?: { id?: string | null } | null;
};

/**
 * Score a region join row based on dominance-related fields.
 * Higher scores indicate more dominant/primary regions.
 */
export function scoreRegionDominance(row: Record<string, unknown>): number {
  const dominanceKeys: Array<{
    key: string;
    weight: number;
    preferHigher: boolean;
  }> = [
    { key: 'dominance_level', weight: 1, preferHigher: true },
    { key: 'dominance', weight: 1, preferHigher: true },
    { key: 'speaker_share', weight: 1, preferHigher: true },
    { key: 'share', weight: 1, preferHigher: true },
    { key: 'weight', weight: 1, preferHigher: true },
    { key: 'percent_speakers', weight: 1, preferHigher: true },
    // Booleans indicating primacy
    { key: 'is_primary', weight: 1000, preferHigher: true },
    { key: 'primary', weight: 1000, preferHigher: true },
    // If there is a rank field, prefer lower rank
    { key: 'rank', weight: 1, preferHigher: false },
    { key: 'dominance_rank', weight: 1, preferHigher: false },
  ];

  let score = 0;
  for (const cfg of dominanceKeys) {
    const v = row[cfg.key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      score += cfg.preferHigher ? v * cfg.weight : -v * cfg.weight;
    } else if (typeof v === 'boolean') {
      score += (v ? 1 : 0) * cfg.weight;
    } else if (typeof v === 'string') {
      const parsed = Number(v);
      if (!Number.isNaN(parsed)) {
        score += (cfg.preferHigher ? parsed : -parsed) * cfg.weight;
      }
    }
  }
  return score;
}

/**
 * Select the primary region for a language entity from join table rows.
 * Returns the region ID with the highest dominance score, or null if none found.
 */
export function selectPrimaryRegion(rows: JoinRow[]): string | null {
  if (!rows.length) return null;

  let best: JoinRow | null = null;
  let bestScore = -Infinity;

  for (const row of rows) {
    const score = scoreRegionDominance(row);
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }

  const regionId = (best?.regions?.id ?? null) as string | null;
  return regionId;
}
