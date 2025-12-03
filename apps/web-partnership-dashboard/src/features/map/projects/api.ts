import { supabase } from '@/shared/services/supabase';
import { extractPointCoordinates } from '../services/locationUtils';

export interface ProjectWithLocation {
  id: string;
  name: string;
  target_language_name: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
}

/**
 * Fetch all projects with location data and target language names
 * Returns projects that have a location (not null)
 */
export async function fetchProjectsWithLocation(): Promise<
  ProjectWithLocation[]
> {
  // Query projects with location and target language
  // PostgREST should return PostGIS geometry as GeoJSON automatically
  const { data, error } = await (supabase as any)
    .from('projects')
    .select(
      `
      id,
      name,
      location,
      target_language:language_entities!projects_target_language_entity_id_fkey (
        name
      )
    `
    )
    .is('deleted_at', null)
    .not('location', 'is', null);

  if (error) throw error;
  if (!data) return [];

  // Process the data to extract coordinates and language name
  return (data ?? [])
    .map((row: any) => {
      const coords = extractPointCoordinates(row.location);
      const location: { type: 'Point'; coordinates: [number, number] } | null =
        coords
          ? {
              type: 'Point',
              coordinates: coords,
            }
          : null;

      // Extract target language name
      const targetLanguage =
        Array.isArray(row.target_language) && row.target_language.length > 0
          ? row.target_language[0]
          : row.target_language;

      const targetLanguageName = targetLanguage?.name ?? null;

      return {
        id: row.id,
        name: row.name,
        target_language_name: targetLanguageName,
        location,
      };
    })
    .filter(
      (project: ProjectWithLocation) =>
        project.location !== null &&
        Array.isArray(project.location.coordinates) &&
        project.location.coordinates.length === 2 &&
        typeof project.location.coordinates[0] === 'number' &&
        typeof project.location.coordinates[1] === 'number'
    );
}
