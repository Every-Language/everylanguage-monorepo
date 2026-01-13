import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCreateProject } from '../useCreateProject';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import type { CreateProjectFormData } from '../../types/project';

// Mock PowerSync system
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;

describe('useCreateProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.execute.mockResolvedValue(undefined);
  });

  const mockProjectData: CreateProjectFormData = {
    name: 'Test Project',
    description: 'Test Description',
    source_language_entity_id: 'lang-1',
    source_language_name: 'English',
    target_language_entity_id: 'lang-2',
    target_language_name: 'Spanish',
    region_id: 'region-1',
    region_name: 'North America',
  };

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useCreateProject());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.createProject).toBe('function');
  });

  it('should create a project successfully', async () => {
    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await result.current.createProject(mockProjectData);
    });

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO projects'),
      expect.arrayContaining([
        expect.any(String), // projectId (UUID)
        'Test Project', // name (trimmed)
        'Test Description', // description (trimmed)
        'lang-1', // source_language_entity_id
        'English', // source_language_name
        'lang-2', // target_language_entity_id
        'Spanish', // target_language_name
        'region-1', // region_id
        'North America', // region_name
        expect.any(String), // created_at
        expect.any(String), // updated_at
        'precreated', // project_status
        'pending', // publish_status
        null, // deleted_at
      ])
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should trim whitespace from name and description', async () => {
    const { result } = renderHook(() => useCreateProject());

    const dataWithWhitespace: CreateProjectFormData = {
      ...mockProjectData,
      name: '  Trimmed Name  ',
      description: '  Trimmed Description  ',
    };

    await act(async () => {
      await result.current.createProject(dataWithWhitespace);
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

  it('should handle null optional fields', async () => {
    const { result } = renderHook(() => useCreateProject());

    const minimalData: CreateProjectFormData = {
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
      await result.current.createProject(minimalData);
    });

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.any(String),
        'Minimal Project',
        null, // description should be null when empty
        null, // source_language_entity_id
        null, // source_language_name
        null, // target_language_entity_id
        null, // target_language_name
        null, // region_id
        null, // region_name
        expect.anything(),
      ])
    );
  });

  it('should set loading state during project creation', async () => {
    let resolveExecute: () => void;
    const executePromise = new Promise<void>(resolve => {
      resolveExecute = resolve;
    });

    mockPowerSyncSystem.execute.mockReturnValue(executePromise);

    const { result } = renderHook(() => useCreateProject());

    let createPromise: Promise<void>;
    await act(async () => {
      createPromise = result.current.createProject(mockProjectData);
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

  it('should handle PowerSync not initialized error', async () => {
    mockPowerSyncSystem.isInitialized = false;

    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await expect(
        result.current.createProject(mockProjectData)
      ).rejects.toThrow('PowerSync database not initialized');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle database errors', async () => {
    const dbError = new Error('Database insert failed');
    mockPowerSyncSystem.execute.mockRejectedValue(dbError);

    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await expect(
        result.current.createProject(mockProjectData)
      ).rejects.toThrow('Database insert failed');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Database insert failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should generate a valid UUID for project ID', async () => {
    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await result.current.createProject(mockProjectData);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const projectId = callArgs[1][0] as string;

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(projectId).toMatch(uuidRegex);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const { result } = renderHook(() => useCreateProject());

    const beforeTime = new Date().toISOString();

    await act(async () => {
      await result.current.createProject(mockProjectData);
    });

    const afterTime = new Date().toISOString();

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const createdAt = callArgs[1][9] as string; // created_at
    const updatedAt = callArgs[1][10] as string; // updated_at

    expect(createdAt).toBe(updatedAt); // Should be the same
    expect(createdAt >= beforeTime && createdAt <= afterTime).toBe(true);
  });

  it('should set correct default status values', async () => {
    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await result.current.createProject(mockProjectData);
    });

    const callArgs = mockPowerSyncSystem.execute.mock.calls[0];
    const projectStatus = callArgs[1][11] as string;
    const publishStatus = callArgs[1][12] as string;

    expect(projectStatus).toBe('precreated');
    expect(publishStatus).toBe('pending');
  });
});
