import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useUpdateProject } from '../useUpdateProject';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import type { UpdateProjectFormData } from '../useUpdateProject';

// Mock PowerSync system
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;

describe('useUpdateProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.execute.mockResolvedValue(undefined);
  });

  const projectId = 'project-123';
  const mockUpdateData: UpdateProjectFormData = {
    name: 'Updated Project',
    description: 'Updated Description',
    source_language_entity_id: 'lang-1',
    source_language_name: 'English',
    target_language_entity_id: 'lang-2',
    target_language_name: 'Spanish',
    region_id: 'region-1',
    region_name: 'North America',
  };

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useUpdateProject());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.updateProject).toBe('function');
  });

  it('should update a project successfully', async () => {
    const { result } = renderHook(() => useUpdateProject());

    await act(async () => {
      await result.current.updateProject(projectId, mockUpdateData);
    });

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE projects'),
      expect.arrayContaining([
        'Updated Project', // name (trimmed)
        'Updated Description', // description (trimmed)
        'lang-1', // source_language_entity_id
        'English', // source_language_name
        'lang-2', // target_language_entity_id
        'Spanish', // target_language_name
        'region-1', // region_id
        'North America', // region_name
        expect.any(String), // updated_at timestamp
        projectId, // WHERE id = ?
      ])
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should trim whitespace from name and description', async () => {
    const { result } = renderHook(() => useUpdateProject());

    const dataWithWhitespace: UpdateProjectFormData = {
      ...mockUpdateData,
      name: '  Trimmed Name  ',
      description: '  Trimmed Description  ',
    };

    await act(async () => {
      await result.current.updateProject(projectId, dataWithWhitespace);
    });

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        'Trimmed Name', // Should be trimmed
        'Trimmed Description', // Should be trimmed
        expect.anything(),
      ])
    );
  });

  it('should handle null optional fields', async () => {
    const { result } = renderHook(() => useUpdateProject());

    const minimalData: UpdateProjectFormData = {
      name: 'Minimal Project',
      description: '',
      source_language_entity_id: null,
      source_language_name: null,
      target_language_entity_id: null,
      target_language_name: null,
      region_id: null,
      region_name: null,
    };

    await act(async () => {
      await result.current.updateProject(projectId, minimalData);
    });

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        'Minimal Project',
        null, // description should be null when empty
        null, // source_language_entity_id
        null, // source_language_name
        null, // target_language_entity_id
        null, // target_language_name
        null, // region_id
        null, // region_name
        expect.any(String), // updated_at
        projectId,
      ])
    );
  });

  it('should set updated_at timestamp', async () => {
    const { result } = renderHook(() => useUpdateProject());

    const beforeTime = new Date().toISOString();

    await act(async () => {
      await result.current.updateProject(projectId, mockUpdateData);
    });

    const afterTime = new Date().toISOString();

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const updatedAt = callArgs[1][8] as string; // updated_at

    expect(updatedAt >= beforeTime && updatedAt <= afterTime).toBe(true);
  });

  it('should set loading state during update', async () => {
    let resolveExecute: () => void;
    const executePromise = new Promise<void>(resolve => {
      resolveExecute = resolve;
    });

    mockPowerSyncSystem.execute.mockReturnValue(executePromise);

    const { result } = renderHook(() => useUpdateProject());

    let updatePromise: Promise<void>;
    await act(async () => {
      updatePromise = result.current.updateProject(projectId, mockUpdateData);
    });

    // Check loading state is true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the promise
    await act(async () => {
      resolveExecute!();
      await updatePromise!;
    });

    // Check loading state is false after completion
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle PowerSync not initialized error', async () => {
    mockPowerSyncSystem.isInitialized = false;

    const { result } = renderHook(() => useUpdateProject());

    await act(async () => {
      await expect(
        result.current.updateProject(projectId, mockUpdateData)
      ).rejects.toThrow('PowerSync database not initialized');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe(
        'PowerSync database not initialized'
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle database errors', async () => {
    const dbError = new Error('Database update failed');
    mockPowerSyncSystem.execute.mockRejectedValue(dbError);

    const { result } = renderHook(() => useUpdateProject());

    await act(async () => {
      await expect(
        result.current.updateProject(projectId, mockUpdateData)
      ).rejects.toThrow('Database update failed');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Database update failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear error state on successful update', async () => {
    const { result } = renderHook(() => useUpdateProject());

    // First, cause an error
    mockPowerSyncSystem.isInitialized = false;
    await act(async () => {
      await expect(
        result.current.updateProject(projectId, mockUpdateData)
      ).rejects.toThrow();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Then fix the issue and update successfully
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.execute.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.updateProject(projectId, mockUpdateData);
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('should update only the specified project', async () => {
    const { result } = renderHook(() => useUpdateProject());

    await act(async () => {
      await result.current.updateProject(projectId, mockUpdateData);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const whereClauseId = callArgs[1][9] as string; // Last parameter is the WHERE id

    expect(whereClauseId).toBe(projectId);
    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ?'),
      expect.any(Array)
    );
  });
});
