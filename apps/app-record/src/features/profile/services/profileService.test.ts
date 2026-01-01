// Jest globals are available without import
import { profileService } from './profileService';
import { supabase } from '@/shared/services/supabase';

// Mock supabase
jest.mock('@/shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('ProfileService', () => {
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockSingle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone_number: '+1234567890',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_anonymous: false,
      };

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await profileService.getUserProfile('user-123');

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('should return null when user profile not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await profileService.getUserProfile('user-123');

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      const mockError = { code: 'PGRST500', message: 'Internal error' };
      mockSingle.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(profileService.getUserProfile('user-123')).rejects.toEqual(
        mockError
      );
    });

    it('should handle unexpected errors', async () => {
      mockSingle.mockRejectedValue(new Error('Network error'));

      await expect(profileService.getUserProfile('user-123')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getDisplayName', () => {
    it('should return full name when both first and last name exist', () => {
      const profile = {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone_number: null,
        created_at: null,
        updated_at: null,
        is_anonymous: false,
      };

      const result = profileService.getDisplayName(profile, undefined);

      expect(result).toBe('John Doe');
    });

    it('should return first name only when last name is missing', () => {
      const profile = {
        id: 'user-123',
        first_name: 'John',
        last_name: null,
        email: 'john@example.com',
        phone_number: null,
        created_at: null,
        updated_at: null,
        is_anonymous: false,
      };

      const result = profileService.getDisplayName(profile, undefined);

      expect(result).toBe('John');
    });

    it('should return last name only when first name is missing', () => {
      const profile = {
        id: 'user-123',
        first_name: null,
        last_name: 'Doe',
        email: 'john@example.com',
        phone_number: null,
        created_at: null,
        updated_at: null,
        is_anonymous: false,
      };

      const result = profileService.getDisplayName(profile, undefined);

      expect(result).toBe('Doe');
    });

    it('should return email when both names are missing', () => {
      const profile = {
        id: 'user-123',
        first_name: null,
        last_name: null,
        email: 'john@example.com',
        phone_number: null,
        created_at: null,
        updated_at: null,
        is_anonymous: false,
      };

      const result = profileService.getDisplayName(profile, undefined);

      expect(result).toBe('john@example.com');
    });

    it('should return auth email when profile is null and auth email exists', () => {
      const result = profileService.getDisplayName(null, 'auth@example.com');

      expect(result).toBe('auth@example.com');
    });

    it('should return "User" when profile is null and no auth email', () => {
      const result = profileService.getDisplayName(null, undefined);

      expect(result).toBe('User');
    });

    it('should trim whitespace from names', () => {
      const profile = {
        id: 'user-123',
        first_name: '  John  ',
        last_name: '  Doe  ',
        email: 'john@example.com',
        phone_number: null,
        created_at: null,
        updated_at: null,
        is_anonymous: false,
      };

      const result = profileService.getDisplayName(profile, undefined);

      expect(result).toBe('John Doe');
    });
  });
});
