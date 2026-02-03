import { renderHook, act } from '@testing-library/react-native';
import { useCreateProjectStore } from '../createProjectStore';

describe('createProjectStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCreateProjectStore.setState({
      source_language_id: null,
      source_language_name: null,
      target_language_id: null,
      target_language_name: null,
      region_id: null,
      region_name: null,
    });
  });

  it('should initialize with null values', () => {
    const { result } = renderHook(() => useCreateProjectStore());

    expect(result.current.source_language_id).toBeNull();
    expect(result.current.source_language_name).toBeNull();
    expect(result.current.target_language_id).toBeNull();
    expect(result.current.target_language_name).toBeNull();
    expect(result.current.region_id).toBeNull();
    expect(result.current.region_name).toBeNull();
  });

  describe('setSourceLanguage', () => {
    it('should set source language ID and name', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      act(() => {
        result.current.setSourceLanguage('lang-1', 'English');
      });

      expect(result.current.source_language_id).toBe('lang-1');
      expect(result.current.source_language_name).toBe('English');
    });

    it('should allow setting null values', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      // First set a value
      act(() => {
        result.current.setSourceLanguage('lang-1', 'English');
      });

      expect(result.current.source_language_id).toBe('lang-1');

      // Then clear it
      act(() => {
        result.current.setSourceLanguage(null, null);
      });

      expect(result.current.source_language_id).toBeNull();
      expect(result.current.source_language_name).toBeNull();
    });
  });

  describe('setTargetLanguage', () => {
    it('should set target language ID and name', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      act(() => {
        result.current.setTargetLanguage('lang-2', 'Spanish');
      });

      expect(result.current.target_language_id).toBe('lang-2');
      expect(result.current.target_language_name).toBe('Spanish');
    });

    it('should allow setting null values', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      act(() => {
        result.current.setTargetLanguage('lang-2', 'Spanish');
      });

      expect(result.current.target_language_id).toBe('lang-2');

      act(() => {
        result.current.setTargetLanguage(null, null);
      });

      expect(result.current.target_language_id).toBeNull();
      expect(result.current.target_language_name).toBeNull();
    });
  });

  describe('setRegion', () => {
    it('should set region ID and name', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      act(() => {
        result.current.setRegion('region-1', 'North America');
      });

      expect(result.current.region_id).toBe('region-1');
      expect(result.current.region_name).toBe('North America');
    });

    it('should allow setting null values', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      act(() => {
        result.current.setRegion('region-1', 'North America');
      });

      expect(result.current.region_id).toBe('region-1');

      act(() => {
        result.current.setRegion(null, null);
      });

      expect(result.current.region_id).toBeNull();
      expect(result.current.region_name).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all fields to null', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      // Set all values
      act(() => {
        result.current.setSourceLanguage('lang-1', 'English');
        result.current.setTargetLanguage('lang-2', 'Spanish');
        result.current.setRegion('region-1', 'North America');
      });

      // Verify they're set
      expect(result.current.source_language_id).toBe('lang-1');
      expect(result.current.target_language_id).toBe('lang-2');
      expect(result.current.region_id).toBe('region-1');

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify all are null
      expect(result.current.source_language_id).toBeNull();
      expect(result.current.source_language_name).toBeNull();
      expect(result.current.target_language_id).toBeNull();
      expect(result.current.target_language_name).toBeNull();
      expect(result.current.region_id).toBeNull();
      expect(result.current.region_name).toBeNull();
    });

    it('should work even when values are already null', () => {
      const { result } = renderHook(() => useCreateProjectStore());

      act(() => {
        result.current.reset();
      });

      expect(result.current.source_language_id).toBeNull();
      expect(result.current.target_language_id).toBeNull();
      expect(result.current.region_id).toBeNull();
    });
  });

  it('should allow setting multiple fields independently', () => {
    const { result } = renderHook(() => useCreateProjectStore());

    act(() => {
      result.current.setSourceLanguage('lang-1', 'English');
    });

    expect(result.current.source_language_id).toBe('lang-1');
    expect(result.current.target_language_id).toBeNull();
    expect(result.current.region_id).toBeNull();

    act(() => {
      result.current.setTargetLanguage('lang-2', 'Spanish');
    });

    expect(result.current.source_language_id).toBe('lang-1');
    expect(result.current.target_language_id).toBe('lang-2');
    expect(result.current.region_id).toBeNull();

    act(() => {
      result.current.setRegion('region-1', 'North America');
    });

    expect(result.current.source_language_id).toBe('lang-1');
    expect(result.current.target_language_id).toBe('lang-2');
    expect(result.current.region_id).toBe('region-1');
  });

  it('should maintain separate ID and name values', () => {
    const { result } = renderHook(() => useCreateProjectStore());

    act(() => {
      result.current.setSourceLanguage('lang-1', 'English');
      result.current.setTargetLanguage('lang-2', 'Spanish');
    });

    expect(result.current.source_language_id).toBe('lang-1');
    expect(result.current.source_language_name).toBe('English');
    expect(result.current.target_language_id).toBe('lang-2');
    expect(result.current.target_language_name).toBe('Spanish');
  });
});
