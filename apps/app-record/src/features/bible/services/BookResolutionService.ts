import type { BookWithMetadata } from '../types';

/**
 * Centralized book resolution service that ensures consistent book data
 * across all features (Bible navigation, search results, deep linking, etc.)
 */
export class BookResolutionService {
  /**
   * Resolves a book object to ensure it has all required fields.
   * If the book is incomplete, it will be looked up in the provided books array.
   *
   * @param incomingBook - The book object to resolve (may be incomplete)
   * @param availableBooks - Array of complete books from the database
   * @returns Complete book object or null if not found
   */
  static resolveBook(
    incomingBook: BookWithMetadata | null | undefined,
    availableBooks: BookWithMetadata[]
  ): BookWithMetadata | null {
    if (!incomingBook) {
      return null;
    }

    // Check if the book is complete (has all required fields)
    if (this.isCompleteBook(incomingBook)) {
      return incomingBook;
    }

    // If incomplete, try to find the complete book from the database
    const completeBook = availableBooks.find(
      book => book.id === incomingBook.id
    );
    if (completeBook) {
      return completeBook;
    }

    // Fallback to the incomplete book if we can't find a complete one
    // This ensures graceful degradation for edge cases
    return incomingBook;
  }

  /**
   * Resolves a book by ID from the available books array.
   *
   * @param bookId - The ID of the book to resolve
   * @param availableBooks - Array of complete books from the database
   * @returns Complete book object or null if not found
   */
  static resolveBookById(
    bookId: string | null | undefined,
    availableBooks: BookWithMetadata[]
  ): BookWithMetadata | null {
    if (!bookId) {
      return null;
    }

    return availableBooks.find(book => book.id === bookId) || null;
  }

  /**
   * Checks if a book object has all required fields to be considered complete.
   *
   * @param book - The book object to check
   * @returns True if the book is complete, false otherwise
   */
  static isCompleteBook(book: BookWithMetadata): boolean {
    // Check for required fields that indicate a complete book from the database
    return !!(
      book.id &&
      book.name &&
      book.bible_version_id && // This field is only present in complete books from DB
      typeof book.book_number === 'number'
    );
  }

  /**
   * Creates a minimal book object from search results or other incomplete sources.
   * This is used when we only have basic book information.
   *
   * @param bookData - Basic book data (id, name, etc.)
   * @returns Minimal book object that can be resolved later
   */
  static createMinimalBook(bookData: {
    id: string;
    name: string;
    book_number: number;
    testament?: 'old' | 'new' | 'OT' | 'NT' | null;
    global_order?: number | null;
    chaptersCount?: number;
  }): BookWithMetadata {
    return {
      id: bookData.id,
      name: bookData.name,
      book_number: bookData.book_number,
      testament:
        bookData.testament === 'OT'
          ? 'old'
          : bookData.testament === 'NT'
            ? 'new'
            : bookData.testament || null,
      global_order: bookData.global_order ?? bookData.book_number,
      bible_version_id: '', // Will be resolved by resolveBook()
      created_at: null,
      updated_at: null,
      chaptersCount: bookData.chaptersCount,
    } as BookWithMetadata;
  }

  /**
   * Resolves multiple books at once.
   *
   * @param books - Array of book objects to resolve (may be incomplete)
   * @param availableBooks - Array of complete books from the database
   * @returns Array of resolved book objects
   */
  static resolveBooks(
    books: BookWithMetadata[],
    availableBooks: BookWithMetadata[]
  ): BookWithMetadata[] {
    return books
      .map(book => this.resolveBook(book, availableBooks))
      .filter((book): book is BookWithMetadata => book !== null);
  }
}

/**
 * Hook for easy book resolution in React components
 */
export const useBookResolution = (availableBooks: BookWithMetadata[]) => {
  return {
    resolveBook: (book: BookWithMetadata | null | undefined) =>
      BookResolutionService.resolveBook(book, availableBooks),

    resolveBookById: (bookId: string | null | undefined) =>
      BookResolutionService.resolveBookById(bookId, availableBooks),

    isCompleteBook: BookResolutionService.isCompleteBook,

    createMinimalBook: BookResolutionService.createMinimalBook,

    resolveBooks: (books: BookWithMetadata[]) =>
      BookResolutionService.resolveBooks(books, availableBooks),
  };
};
