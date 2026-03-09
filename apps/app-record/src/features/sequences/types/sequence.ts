/**
 * Re-export Sequence types from shared/types
 *
 * This maintains backward compatibility while following Bulletproof React
 * principles. Types are defined in shared/types to allow cross-feature usage.
 */
export type { Sequence, Book, Chapter, Verse } from '@/shared/types/sequence';

/**
 * Create Sequence Form Data
 *
 * Form data structure for creating a new sequence.
 */
export interface CreateSequenceFormData {
  name: string;
  description: string;
  book_id: string;
  chapter_id: string;
}
