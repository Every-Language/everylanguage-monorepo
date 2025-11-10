import { useQuery } from '@tanstack/react-query';
import {
  fetchAudioVersionCoveragesForLanguageIds,
  fetchTextVersionCoveragesForLanguageIds,
} from '../inspector/queries/progress';

/**
 * Hook for fetching Bible translation progress (audio and text versions)
 * for a set of language IDs (typically self + descendants).
 */
export function useBibleProgress(languageIds: string[]) {
  const audioVersions = useQuery({
    enabled: languageIds.length > 0,
    queryKey: ['all-audio-coverages-aggregated', languageIds.join(',')],
    queryFn: () => fetchAudioVersionCoveragesForLanguageIds(languageIds),
  });

  const textVersions = useQuery({
    enabled: languageIds.length > 0,
    queryKey: ['all-text-coverages-aggregated', languageIds.join(',')],
    queryFn: () => fetchTextVersionCoveragesForLanguageIds(languageIds),
  });

  return {
    audioVersions,
    textVersions,
  };
}
