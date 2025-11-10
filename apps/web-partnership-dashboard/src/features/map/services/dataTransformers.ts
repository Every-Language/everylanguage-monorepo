/**
 * Data Transformers Service
 *
 * Pure functions for transforming and aggregating analytics data.
 */

export type LanguageUsageByCountry = {
  country_code: string | null;
  downloads_total: number;
  listened_total_seconds: number;
  top_chapters: string[];
};

export type LanguageUsageByRegion = {
  region_id: string | null;
  downloads_total: number;
  listened_total_seconds: number;
  top_chapters: string[];
};

export type RegionUsageByLanguage = {
  language_entity_id: string;
  downloads_total: number;
  listened_total_seconds: number;
  top_chapters: string[];
};

type UsageRow = {
  country_code?: string | null;
  region_id?: string | null;
  language_entity_id?: string | null;
  chapter_id?: string | null;
  downloads?: number | null;
  total_listened_seconds?: number | null;
  listen_count?: number | null;
};

/**
 * Aggregate usage data by country code
 */
export function aggregateUsageByCountry(
  rows: UsageRow[]
): LanguageUsageByCountry[] {
  const byCountry = new Map<
    string | null,
    { downloads: number; seconds: number; chapterCounts: Map<string, number> }
  >();

  for (const r of rows) {
    const key = (r.country_code ?? null) as string | null;
    if (!byCountry.has(key)) {
      byCountry.set(key, {
        downloads: 0,
        seconds: 0,
        chapterCounts: new Map(),
      });
    }
    const agg = byCountry.get(key)!;
    if (r.downloads != null) agg.downloads += Number(r.downloads);
    if (r.total_listened_seconds != null)
      agg.seconds += Number(r.total_listened_seconds);
    if (r.chapter_id) {
      const prev = agg.chapterCounts.get(r.chapter_id) ?? 0;
      agg.chapterCounts.set(r.chapter_id, prev + Number(r.listen_count ?? 0));
    }
  }

  const result: LanguageUsageByCountry[] = [];
  for (const [code, agg] of byCountry.entries()) {
    const top = Array.from(agg.chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([chapter]) => chapter);
    result.push({
      country_code: typeof code === 'string' ? code.toUpperCase() : null,
      downloads_total: agg.downloads,
      listened_total_seconds: agg.seconds,
      top_chapters: top,
    });
  }
  result.sort((a, b) => (b.downloads_total ?? 0) - (a.downloads_total ?? 0));
  return result;
}

/**
 * Aggregate usage data by region ID
 */
export function aggregateUsageByRegion(
  rows: UsageRow[]
): LanguageUsageByRegion[] {
  const byRegion = new Map<
    string | null,
    { downloads: number; seconds: number; chapterCounts: Map<string, number> }
  >();

  for (const r of rows) {
    const key = (r.region_id ?? null) as string | null;
    if (!byRegion.has(key)) {
      byRegion.set(key, { downloads: 0, seconds: 0, chapterCounts: new Map() });
    }
    const agg = byRegion.get(key)!;
    if (r.downloads != null) agg.downloads += Number(r.downloads);
    if (r.total_listened_seconds != null)
      agg.seconds += Number(r.total_listened_seconds);
    if (r.chapter_id) {
      const prev = agg.chapterCounts.get(r.chapter_id) ?? 0;
      agg.chapterCounts.set(r.chapter_id, prev + Number(r.listen_count ?? 0));
    }
  }

  const result: LanguageUsageByRegion[] = [];
  for (const [rid, agg] of byRegion.entries()) {
    const top = Array.from(agg.chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([chapter]) => chapter);
    result.push({
      region_id: rid,
      downloads_total: agg.downloads,
      listened_total_seconds: agg.seconds,
      top_chapters: top,
    });
  }
  result.sort((a, b) => (b.downloads_total ?? 0) - (a.downloads_total ?? 0));
  return result;
}

/**
 * Aggregate usage data by language entity ID
 */
export function aggregateUsageByLanguage(
  rows: UsageRow[]
): RegionUsageByLanguage[] {
  const byLang = new Map<
    string,
    { downloads: number; seconds: number; chapterCounts: Map<string, number> }
  >();

  for (const r of rows) {
    const lang = r.language_entity_id;
    if (!lang) continue;
    if (!byLang.has(lang)) {
      byLang.set(lang, { downloads: 0, seconds: 0, chapterCounts: new Map() });
    }
    const agg = byLang.get(lang)!;
    if (r.downloads != null) agg.downloads += Number(r.downloads);
    if (r.total_listened_seconds != null)
      agg.seconds += Number(r.total_listened_seconds);
    if (r.chapter_id) {
      const prev = agg.chapterCounts.get(r.chapter_id) ?? 0;
      agg.chapterCounts.set(r.chapter_id, prev + Number(r.listen_count ?? 0));
    }
  }

  const result: RegionUsageByLanguage[] = [];
  for (const [lang, agg] of byLang.entries()) {
    const top = Array.from(agg.chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([chapter]) => chapter);
    result.push({
      language_entity_id: lang,
      downloads_total: agg.downloads,
      listened_total_seconds: agg.seconds,
      top_chapters: top,
    });
  }
  result.sort((a, b) => (b.downloads_total ?? 0) - (a.downloads_total ?? 0));
  return result;
}
