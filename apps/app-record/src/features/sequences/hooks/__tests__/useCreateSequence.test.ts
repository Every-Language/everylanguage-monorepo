import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCreateSequence } from '../useCreateSequence';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { findFirstVerseId, findLastVerseId } from '../../utils/verseHelpers';
import { useAuth } from '@/shared/hooks';
import type { CreateSequenceFormData } from '../../types/sequence';

// Mock dependencies
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');
jest.mock('../../utils/verseHelpers');
jest.mock('@/shared/hooks');
jest.mock('@/shared/utils/logger');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;
const mockFindFirstVerseId = findFirstVerseId as jest.MockedFunction<
  typeof findFirstVerseId
>;
const mockFindLastVerseId = findLastVerseId as jest.MockedFunction<
  typeof findLastVerseId
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useCreateSequence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.execute.mockResolvedValue(undefined);
    mockFindFirstVerseId.mockResolvedValue('verse-1');
    mockFindLastVerseId.mockResolvedValue('verse-50');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      isAuthenticated: true,
    } as any);
  });

  const mockSequenceData: CreateSequenceFormData = {
    name: 'Test Sequence',
    description: 'Test Description',
    book_id: 'book-1',
    chapter_id: 'chapter-1',
  };

  const projectId = 'project-123';

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useCreateSequence());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.createSequence).toBe('function');
  });

  it('should create a sequence successfully', async () => {
    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await result.current.createSequence(mockSequenceData, projectId);
    });

    expect(mockFindFirstVerseId).toHaveBeenCalledWith('chapter-1');
    expect(mockFindLastVerseId).toHaveBeenCalledWith('chapter-1');

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sequences'),
      expect.arrayContaining([
        expect.any(String), // sequenceId (UUID)
        'Test Sequence', // name (trimmed)
        'Test Description', // description (trimmed)
        'book-1', // book_id
        'chapter-1', // chapter_id
        1, // is_bible_audio
        'verse-1', // start_verse_id
        'verse-50', // end_verse_id
        projectId, // project_id
        expect.any(String), // created_at
        expect.any(String), // updated_at
        'user-123', // created_by
        'pending', // upload_status
        'pending', // publish_status
        'pending', // check_status
        null, // deleted_at
      ])
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should use null for created_by when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await result.current.createSequence(mockSequenceData, projectId);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const createdBy = callArgs[1][11] as string | null; // created_by is at index 11

    expect(createdBy).toBeNull();
  });

  it('should trim whitespace from name and description', async () => {
    const { result } = renderHook(() => useCreateSequence());

    const dataWithWhitespace: CreateSequenceFormData = {
      ...mockSequenceData,
      name: '  Trimmed Name  ',
      description: '  Trimmed Description  ',
    };

    await act(async () => {
      await result.current.createSequence(dataWithWhitespace, projectId);
    });

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.any(String),
        'Trimmed Name', // Should be trimmed
        'Trimmed Description', // Should be trimmed
        expect.anything(),
      ])
    );
  });

  it('should handle null description', async () => {
    const { result } = renderHook(() => useCreateSequence());

    const dataWithoutDescription: CreateSequenceFormData = {
      ...mockSequenceData,
      description: '',
    };

    await act(async () => {
      await result.current.createSequence(dataWithoutDescription, projectId);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const description = callArgs[1][2] as string | null;

    expect(description).toBeNull();
  });

  it('should throw error when chapter_id is missing', async () => {
    const { result } = renderHook(() => useCreateSequence());

    const invalidData: CreateSequenceFormData = {
      ...mockSequenceData,
      chapter_id: '',
    };

    await act(async () => {
      await expect(
        result.current.createSequence(invalidData, projectId)
      ).rejects.toThrow('Chapter is required');
    });

    expect(mockPowerSyncSystem.execute).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('should throw error when PowerSync is not initialized', async () => {
    mockPowerSyncSystem.isInitialized = false;

    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await expect(
        result.current.createSequence(mockSequenceData, projectId)
      ).rejects.toThrow('PowerSync database not initialized');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });

  it('should throw error when first verse is not found', async () => {
    mockFindFirstVerseId.mockResolvedValue(null);

    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await expect(
        result.current.createSequence(mockSequenceData, projectId)
      ).rejects.toThrow('Could not find verses for the selected chapter');
    });

    expect(result.current.error).toBeTruthy();
    expect(mockPowerSyncSystem.execute).not.toHaveBeenCalled();
  });

  it('should throw error when last verse is not found', async () => {
    mockFindLastVerseId.mockResolvedValue(null);

    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await expect(
        result.current.createSequence(mockSequenceData, projectId)
      ).rejects.toThrow('Could not find verses for the selected chapter');
    });

    expect(result.current.error).toBeTruthy();
    expect(mockPowerSyncSystem.execute).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const dbError = new Error('Database insert failed');
    mockPowerSyncSystem.execute.mockRejectedValue(dbError);

    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await expect(
        result.current.createSequence(mockSequenceData, projectId)
      ).rejects.toThrow('Database insert failed');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Database insert failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('should set loading state during sequence creation', async () => {
    let resolveExecute: () => void;
    const executePromise = new Promise<void>(resolve => {
      resolveExecute = resolve;
    });

    mockPowerSyncSystem.execute.mockReturnValue(executePromise);

    const { result } = renderHook(() => useCreateSequence());

    let createPromise: Promise<void>;
    await act(async () => {
      createPromise = result.current.createSequence(
        mockSequenceData,
        projectId
      );
    });

    // Check loading state is true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the promise
    await act(async () => {
      resolveExecute!();
      await createPromise!;
    });

    // Check loading state is false after completion
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should generate a valid UUID for sequence ID', async () => {
    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await result.current.createSequence(mockSequenceData, projectId);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const sequenceId = callArgs[1][0] as string;

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(sequenceId).toMatch(uuidRegex);
  });

  it('should set correct default status values', async () => {
    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await result.current.createSequence(mockSequenceData, projectId);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const uploadStatus = callArgs[1][12] as string; // upload_status is at index 12
    const publishStatus = callArgs[1][13] as string; // publish_status is at index 13
    const checkStatus = callArgs[1][14] as string; // check_status is at index 14

    expect(uploadStatus).toBe('pending');
    expect(publishStatus).toBe('pending');
    expect(checkStatus).toBe('pending');
  });

  it('should set is_bible_audio to 1', async () => {
    const { result } = renderHook(() => useCreateSequence());

    await act(async () => {
      await result.current.createSequence(mockSequenceData, projectId);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const isBibleAudio = callArgs[1][5] as number;

    expect(isBibleAudio).toBe(1);
  });
});
