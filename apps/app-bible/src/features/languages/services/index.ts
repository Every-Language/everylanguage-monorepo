/**
 * Clean services export - new PowerSync-based architecture
 */

// Core User Versions Service (PowerSync-based)
export {
  userVersionsService,
  UserVersionsService,
} from './userVersionsService';

// Enhanced Language Search Service (with debouncing)
export {
  languageSearchService,
  LanguageSearchService,
} from './languageSearchService';

// Fuzzy Search Service (server-side API)
export { fuzzySearchService, FuzzySearchService } from './fuzzySearchService';
export type {
  LanguageSearchResult,
  FuzzySearchOptions,
  LanguageSearchWithVersionsOptions,
  AudioVersionDetail,
  TextVersionDetail,
} from './fuzzySearchService';

// Note: Legacy services have been removed in favor of the new PowerSync-based architecture
// If you need the old functionality, please migrate to userVersionsService
