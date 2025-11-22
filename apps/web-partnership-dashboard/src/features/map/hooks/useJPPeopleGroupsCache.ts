/**
 * Cache-first hooks for Joshua Project people groups data
 *
 * Fetches people groups from relationship views (vw_people_groups_in_region, vw_people_groups_by_language).
 * Returns data in JPPeopleGroup format for compatibility with existing components.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  type JPPeopleGroup,
  type ExternalIdSource,
  fetchPeopleGroupsByFIPS,
  fetchPeopleGroupsByLanguage,
  extractFIPSFromRegionSources,
  extractROL3FromLanguageSources,
} from '../services/joshuaProjectApi';

/**
 * Fetches external ID sources for a region from our database
 */
function useRegionExternalIds(regionId: string | null) {
  return useQuery({
    queryKey: ['region-external-ids', regionId],
    queryFn: async () => {
      if (!regionId) return [];

      const { data, error } = await supabase
        .from('region_sources')
        .select('external_id_type, external_id')
        .eq('region_id', regionId)
        .not('external_id', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as ExternalIdSource[];
    },
    enabled: !!regionId,
    staleTime: 60 * 60 * 1000, // 1 hour - external IDs rarely change
  });
}

/**
 * Fetches external ID sources for a language entity from our database
 */
function useLanguageExternalIds(languageEntityId: string | null) {
  return useQuery({
    queryKey: ['language-external-ids', languageEntityId],
    queryFn: async () => {
      if (!languageEntityId) return [];

      const { data, error } = await supabase
        .from('language_entity_sources')
        .select('external_id_type, external_id')
        .eq('language_entity_id', languageEntityId)
        .not('external_id', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as ExternalIdSource[];
    },
    enabled: !!languageEntityId,
    staleTime: 60 * 60 * 1000, // 1 hour - external IDs rarely change
  });
}

const CACHE_CONFIG = {
  staleTime: 60 * 60 * 1000, // 1 hour - cache data doesn't change frequently
  gcTime: 24 * 60 * 60 * 1000, // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

/**
 * Map sort field from API format to database column name
 */
function mapSortFieldToColumn(sortField: string): string {
  const fieldMap: Record<string, string> = {
    PeopNameInCountry: 'peop_name_in_country',
    Population: 'instance_population',
    JPScale: 'jpscale',
    PercentEvangelical: 'percent_evangelical',
  };
  return fieldMap[sortField] || 'instance_population';
}

/**
 * Transform cache data to JPPeopleGroup format
 */
function transformPeopleGroupFromCache(data: any): JPPeopleGroup {
  return {
    PeopleID3: data.people_id3?.toString() || '',
    PeopNameInCountry:
      data.peop_name_in_country || data.people_group_name || '',
    ROG3: '', // Not available in view
    ISO3: '', // Not available in view
    Ctry: data.region_name || '',
    PrimaryLanguageName: data.primary_language_name || '',
    PrimaryLanguageDialect: null, // Not available in view
    ROL3: data.primary_language_rol3 || '',
    PrimaryReligion: data.primary_religion || '',
    RLG3: '', // Not available in view
    PercentEvangelical: data.percent_evangelical || 0,
    PercentChristianPC: data.percent_christian_pc || 0,
    PercentChristianPD: 0, // Not available in view
    JPScale: data.jpscale,
    JPScaleText: null, // Not available in view
    JPScalePCtxt: null, // Not available in view
    JPScalePCimg: null, // Not available in view
    LeastReached: data.least_reached ? 'Y' : 'N',
    LeastReachedBasis: '', // Not available in view
    Unengaged: null, // Not available in view
    FrontierPeopleGroup: data.frontier ? 'Y' : 'N',
    MapID: '', // Not available in view
    RaceCode: null, // Not available in view
    RaceName: null, // Not available in view
    AffinityBloc: '', // Not available in view
    PeopleCluster: '', // Not available in view
    PeopNameAcrossCountries: data.people_group_name || '',
    Population: data.instance_population || data.population || 0,
    PopulationPercentUN: 0, // Not available in view
    ROG2: '', // Not available in view
    ROP3: '', // Not available in view
    ROP2: '', // Not available in view
    ROP25: '', // Not available in view
    RegionCode: '', // Not available in view
    RegionName: data.region_name || '',
    ContinentCode: '', // Not available in view
    ContinentName: '', // Not available in view
    WindowStatus: '', // Not available in view
    Longitude: data.longitude || 0,
    Latitude: data.latitude || 0,
    SecurityLevel: 0, // Not available in view
    BibleStatus:
      data.bible_status || data.primary_language_bible_status || null,
    BibleYear: null, // Not available in view
    NTYear: null, // Not available in view
    PortionsYear: null, // Not available in view
    TranslationNeedYear: null, // Not available in view
    TranslationNeedQuestionable: null, // Not available in view
    BibleTranslationNeed: '', // Not available in view
    JF: data.has_jesus_film ? 'Y' : 'N',
    HasJesusFilm: data.has_jesus_film ? 'Y' : null,
    JFLang: '', // Not available in view
    JFPrimaryText: '', // Not available in view
    AudioScripture: '', // Not available in view
    HasAudioRecordings: data.has_audio_recordings ? 'Y' : null,
    AudioRecordings: data.has_audio_recordings ? 'Y' : null,
    GRN: '', // Not available in view
    GRNLang: '', // Not available in view
    FourLaws: '', // Not available in view
    GodStory: '', // Not available in view
    IndigenousLanguage: null, // Not available in view
    SomeMediumLanguage: null, // Not available in view
    PrimaryMediumLanguage: null, // Not available in view
    GospelRadio: '', // Not available in view
    ImageURL: data.image_url || null,
    PhotoAddress: null, // Not available in view
    PhotoCredits: null, // Not available in view
    ProfileTextExists: 0, // Not available in view
    PeopleGroupURL: '', // Not available in view
    PeopleGroupPhotoURL: '', // Not available in view
    CountryURL: '', // Not available in view
    JPScaleImageURL: null, // Not available in view
    Summary: null, // Not available in view
    Resources: null, // Not available in view
    NTOnline: null, // Not available in view
    NumberLanguagesSpoken: data.language_count || null,
    OfficialLang: null, // Not available in view
    SpeakNationalLang: null, // Not available in view
  };
}

/**
 * Fetches people groups from cache for a given region (country)
 * Supports pagination and sorting
 */
export function useJPPeopleGroupsByCountryCache(
  regionId: string | null,
  page: number = 1,
  limit: number = 20,
  sortField: string = 'Population',
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const fips = externalIds ? extractFIPSFromRegionSources(externalIds) : null;
  const sortColumn = mapSortFieldToColumn(sortField);
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: [
      'jp-people-groups-country-cache',
      regionId,
      page,
      limit,
      sortField,
      sortDirection,
    ],
    queryFn: async () => {
      if (!regionId) {
        return [];
      }

      try {
        // Query vw_people_groups_in_region with pagination and sorting
        const query = supabase
          .from('vw_people_groups_in_region')
          .select('*')
          .eq('region_id', regionId)
          .order(sortColumn, { ascending: sortDirection === 'asc' })
          .range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          return data.map(transformPeopleGroupFromCache);
        }

        // Fallback to API if cache miss
        if (fips) {
          return await fetchPeopleGroupsByFIPS(
            fips,
            page,
            limit,
            sortField,
            sortDirection
          );
        }

        return [];
      } catch (error) {
        console.warn(
          `Cache fetch failed for people groups in region ${regionId}, falling back to API:`,
          error
        );
        // Fallback to API
        if (fips) {
          try {
            return await fetchPeopleGroupsByFIPS(
              fips,
              page,
              limit,
              sortField,
              sortDirection
            );
          } catch (apiError) {
            console.error('API fallback also failed:', apiError);
            return [];
          }
        }
        return [];
      }
    },
    enabled: !!regionId && !idsLoading,
    ...CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from cache for a given language entity
 * Supports pagination and sorting
 */
export function useJPPeopleGroupsByLanguageCache(
  languageEntityId: string | null,
  page: number = 1,
  limit: number = 20,
  sortField: string = 'Population',
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;
  const sortColumn = mapSortFieldToColumn(sortField);
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: [
      'jp-people-groups-language-cache',
      languageEntityId,
      page,
      limit,
      sortField,
      sortDirection,
    ],
    queryFn: async () => {
      if (!languageEntityId) {
        return [];
      }

      try {
        // Query vw_people_groups_by_language with pagination and sorting
        const query = supabase
          .from('vw_people_groups_by_language')
          .select('*')
          .eq('language_entity_id', languageEntityId)
          .order(sortColumn, { ascending: sortDirection === 'asc' })
          .range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          return data.map(transformPeopleGroupFromCache);
        }

        // Fallback to API if cache miss
        if (rol3) {
          return await fetchPeopleGroupsByLanguage(
            rol3,
            page,
            limit,
            sortField,
            sortDirection
          );
        }

        return [];
      } catch (error) {
        console.warn(
          `Cache fetch failed for people groups by language ${languageEntityId}, falling back to API:`,
          error
        );
        // Fallback to API
        if (rol3) {
          try {
            return await fetchPeopleGroupsByLanguage(
              rol3,
              page,
              limit,
              sortField,
              sortDirection
            );
          } catch (apiError) {
            console.error('API fallback also failed:', apiError);
            return [];
          }
        }
        return [];
      }
    },
    enabled: !!languageEntityId && !idsLoading,
    ...CACHE_CONFIG,
  });
}
