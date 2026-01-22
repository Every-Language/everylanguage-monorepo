import { create } from 'zustand';

interface CreateSequenceState {
  book_id: string;
  chapter_id: string;
  setBookId: (bookId: string) => void;
  setChapterId: (chapterId: string) => void;
  reset: () => void;
}

/**
 * Store for managing create sequence form state
 *
 * Used to pass book_id and chapter_id between navigation screens.
 */
export const useCreateSequenceStore = create<CreateSequenceState>()(set => ({
  book_id: '',
  chapter_id: '',
  setBookId: (bookId: string) => set({ book_id: bookId }),
  setChapterId: (chapterId: string) => set({ chapter_id: chapterId }),
  reset: () => set({ book_id: '', chapter_id: '' }),
}));
