import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type GeoJSONFeature = {
  type: 'Feature';
  properties: {
    grn_number?: number;
    nam_label?: string;
    iso?: string;
    c1?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
};

type GeoJSONResponse = {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  exceededTransferLimit?: boolean;
};

type GrnCoordinateCacheRow = {
  grn_number: number | null;
  language_name: string | null;
  iso_code: string | null;
  country_name: string | null;
  location: string | null; // PostGIS POINT as GeoJSON (null if invalid)
  last_synced_at: string;
  updated_at: string;
};

const ARCGIS_ENDPOINT =
  'https://gis.lightsys.org/server/rest/services/LanguageResources_v5Prod/MapServer/6/query';
const UPSERT_BATCH_SIZE = 500;
const MAX_RECORDS_PER_REQUEST = 2000;

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchArcGISPage(
  offset: number
): Promise<{ features: GeoJSONFeature[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'grn_number,nam_label,iso,c1',
    returnGeometry: 'true',
    f: 'geojson',
    resultRecordCount: MAX_RECORDS_PER_REQUEST.toString(),
    resultOffset: offset.toString(),
  });

  const url = `${ARCGIS_ENDPOINT}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `ArcGIS API request failed: ${response.status} ${response.statusText}`
    );
  }

  const data: GeoJSONResponse = await response.json();

  return {
    features: data.features || [],
    hasMore: data.exceededTransferLimit === true,
  };
}

async function fetchAllCoordinates(): Promise<GeoJSONFeature[]> {
  const allFeatures: GeoJSONFeature[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { features, hasMore: more } = await fetchArcGISPage(offset);
    allFeatures.push(...features);
    hasMore = more;
    offset += features.length;

    console.log(`Fetched ${allFeatures.length} coordinates so far...`);

    // Safety check to prevent infinite loops
    if (features.length === 0) {
      break;
    }
  }

  return allFeatures;
}

function normalizeCoordinate(
  feature: GeoJSONFeature,
  timestamp: string
): GrnCoordinateCacheRow {
  const grnNumber = coerceNumber(feature.properties.grn_number);
  const countryName = feature.properties.c1?.trim() || null;
  const languageName = feature.properties.nam_label?.trim() || null;
  const isoCode = feature.properties.iso?.trim() || null;

  // Try to extract coordinates (allow invalid/null)
  let locationGeoJSON: string | null = null;
  const coords = feature.geometry?.coordinates;
  if (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number' &&
    Number.isFinite(coords[0]) &&
    Number.isFinite(coords[1])
  ) {
    // Create PostGIS POINT as GeoJSON for Supabase
    // Supabase PostgREST will convert GeoJSON to PostGIS geometry automatically
    locationGeoJSON = JSON.stringify({
      type: 'Point',
      coordinates: [coords[0], coords[1]],
    });
  }

  return {
    grn_number: grnNumber,
    language_name: languageName,
    iso_code: isoCode,
    country_name: countryName,
    location: locationGeoJSON,
    last_synced_at: timestamp,
    updated_at: timestamp,
  };
}

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase service credentials' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching coordinates from ArcGIS MapServer...');
    const allFeatures = await fetchAllCoordinates();
    console.log(`Fetched ${allFeatures.length} total features`);

    const now = new Date().toISOString();

    // Normalize ALL features (cache everything, even invalid entries)
    const upserts: GrnCoordinateCacheRow[] = allFeatures.map(feature =>
      normalizeCoordinate(feature, now)
    );

    console.log(
      `Fetched ${allFeatures.length} features, caching all entries (including invalid ones)`
    );

    // Track valid (grn_number, country_name) pairs for full sync deduplication
    // Only entries with both grn_number and country_name can be deduplicated
    const validKeys = new Set<string>();
    for (const row of upserts) {
      if (row.grn_number !== null && row.country_name !== null) {
        validKeys.add(`${row.grn_number}:${row.country_name}`);
      }
    }

    // Batch upsert - cache everything
    // For entries with both grn_number and country_name, use upsert (update if exists)
    // For entries without both, use insert (no unique constraint)
    let upserted = 0;

    // Split into entries with both fields (can be upserted) and entries without (must be inserted)
    const entriesWithBothFields = upserts.filter(
      b => b.grn_number !== null && b.country_name !== null
    );
    const entriesWithoutBothFields = upserts.filter(
      b => b.grn_number === null || b.country_name === null
    );

    // Upsert entries with both fields (can use unique constraint)
    for (const batch of chunkArray(entriesWithBothFields, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('grn_language_coordinates_cache')
        .upsert(
          batch.map(b => ({
            grn_number: b.grn_number,
            language_name: b.language_name,
            iso_code: b.iso_code,
            country_name: b.country_name,
            location: b.location ? JSON.parse(b.location) : null,
            last_synced_at: b.last_synced_at,
            updated_at: b.updated_at,
          })),
          {
            onConflict: 'grn_number,country_name',
          }
        );

      if (error) {
        console.error('GRN coordinates cache upsert failed', error);
        throw new Error(
          `Failed to upsert GRN coordinates cache: ${error.message}`
        );
      }

      upserted += batch.length;
      console.log(
        `Upserted batch: ${upserted}/${entriesWithBothFields.length}`
      );
    }

    // Insert entries without both fields (no unique constraint, always insert)
    if (entriesWithoutBothFields.length > 0) {
      for (const batch of chunkArray(
        entriesWithoutBothFields,
        UPSERT_BATCH_SIZE
      )) {
        const { error } = await supabase
          .from('grn_language_coordinates_cache')
          .insert(
            batch.map(b => ({
              grn_number: b.grn_number,
              language_name: b.language_name,
              iso_code: b.iso_code,
              country_name: b.country_name,
              location: b.location ? JSON.parse(b.location) : null,
              last_synced_at: b.last_synced_at,
              updated_at: b.updated_at,
            }))
          );

        if (error) {
          console.error('GRN coordinates cache insert failed', error);
          throw new Error(
            `Failed to insert GRN coordinates cache: ${error.message}`
          );
        }

        upserted += batch.length;
        console.log(`Inserted batch: ${upserted}/${upserts.length}`);
      }
    }

    // Full sync: Delete rows not in current API response
    // Only delete entries that have both grn_number and country_name (can be uniquely identified)
    console.log('Performing full sync: deleting removed entries...');
    const { data: allCacheRows, error: fetchError } = await supabase
      .from('grn_language_coordinates_cache')
      .select('id, grn_number, country_name')
      .not('grn_number', 'is', null)
      .not('country_name', 'is', null);

    let deleted = 0;
    if (fetchError) {
      console.error('Failed to fetch cache rows for cleanup', fetchError);
    } else {
      const toDelete = (allCacheRows || []).filter(
        row =>
          row.grn_number !== null &&
          row.country_name !== null &&
          !validKeys.has(`${row.grn_number}:${row.country_name}`)
      );

      if (toDelete.length > 0) {
        // Delete by ID (more efficient than composite key)
        const deleteIds = toDelete.map(row => row.id);
        for (const deleteBatch of chunkArray(deleteIds, UPSERT_BATCH_SIZE)) {
          const { error: deleteError } = await supabase
            .from('grn_language_coordinates_cache')
            .delete()
            .in('id', deleteBatch);

          if (deleteError) {
            console.error('Failed to delete cache rows', deleteError);
          } else {
            deleted += deleteBatch.length;
          }
        }
        console.log(`Deleted ${deleted} removed entries`);
      }
    }

    // Count invalid entries for reporting
    const invalidCount = upserts.filter(
      row =>
        row.grn_number === null ||
        row.country_name === null ||
        row.location === null
    ).length;

    const summary = {
      success: true,
      fetched: allFeatures.length,
      cached: upserted,
      invalid_entries: invalidCount,
      deleted: deleted,
    };

    console.log('GRN coordinates sync summary:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled GRN coordinates sync error', error);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error while syncing GRN coordinates',
        details: (error as Error).message,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
});
