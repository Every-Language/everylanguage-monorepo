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
  grn_number: number;
  language_name: string | null;
  iso_code: string | null;
  country_name: string;
  location: string; // PostGIS POINT as WKT or GeoJSON
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
): GrnCoordinateCacheRow | null {
  const grnNumber = coerceNumber(feature.properties.grn_number);
  const countryName = feature.properties.c1?.trim();

  if (!grnNumber || !countryName) {
    return null;
  }

  const [lon, lat] = feature.geometry.coordinates;
  if (
    typeof lon !== 'number' ||
    typeof lat !== 'number' ||
    !Number.isFinite(lon) ||
    !Number.isFinite(lat)
  ) {
    return null;
  }

  // Create PostGIS POINT as GeoJSON for Supabase
  // Supabase PostgREST will convert GeoJSON to PostGIS geometry automatically
  const locationGeoJSON = JSON.stringify({
    type: 'Point',
    coordinates: [lon, lat],
  });

  return {
    grn_number: grnNumber,
    language_name: feature.properties.nam_label?.trim() || null,
    iso_code: feature.properties.iso?.trim() || null,
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
    const upserts: GrnCoordinateCacheRow[] = allFeatures
      .map(feature => normalizeCoordinate(feature, now))
      .filter((row): row is GrnCoordinateCacheRow => Boolean(row));

    console.log(`Normalized ${upserts.length} coordinates`);

    // Track all (grn_number, country_name) pairs for full sync
    const apiKeys = new Set(
      upserts.map(u => `${u.grn_number}:${u.country_name}`)
    );

    // Batch upsert
    let upserted = 0;
    for (const batch of chunkArray(upserts, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('grn_language_coordinates_cache')
        .upsert(
          batch.map(b => ({
            grn_number: b.grn_number,
            language_name: b.language_name,
            iso_code: b.iso_code,
            country_name: b.country_name,
            location: JSON.parse(b.location), // Parse GeoJSON string to object for Supabase
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
      console.log(`Upserted batch: ${upserted}/${upserts.length}`);
    }

    // Full sync: Delete rows not in current API response
    console.log('Performing full sync: deleting removed entries...');
    const { data: allCacheRows, error: fetchError } = await supabase
      .from('grn_language_coordinates_cache')
      .select('grn_number, country_name');

    let deleted = 0;
    if (fetchError) {
      console.error('Failed to fetch cache rows for cleanup', fetchError);
    } else {
      const toDelete = (allCacheRows || []).filter(
        row => !apiKeys.has(`${row.grn_number}:${row.country_name}`)
      );

      if (toDelete.length > 0) {
        // Delete in batches - need to delete each row individually due to composite key
        for (const deleteBatch of chunkArray(toDelete, UPSERT_BATCH_SIZE)) {
          for (const row of deleteBatch) {
            const { error: deleteError } = await supabase
              .from('grn_language_coordinates_cache')
              .delete()
              .eq('grn_number', row.grn_number)
              .eq('country_name', row.country_name);

            if (deleteError) {
              console.error(
                `Failed to delete cache row ${row.grn_number}:${row.country_name}`,
                deleteError
              );
            } else {
              deleted++;
            }
          }
        }
        console.log(`Deleted ${deleted} removed entries`);
      }
    }

    const summary = {
      success: true,
      upserted: upserts.length,
      deleted: deleted,
      total_fetched: allFeatures.length,
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
