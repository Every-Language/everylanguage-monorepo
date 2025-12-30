import { authService } from './authService';
import { supabase } from '@/shared/services/supabase';

// Mock Supabase
jest.mock('@/shared/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('should return null when not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const mockError = { message: 'Auth error' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('should return session when authenticated', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getCurrentSession();

      expect(result).toEqual(mockSession);
      expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should return null when no session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getCurrentSession();

      expect(result).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await expect(
        authService.signIn('test@example.com', 'password123')
      ).resolves.not.toThrow();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error on invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials' };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(
        authService.signIn('test@example.com', 'wrong')
      ).rejects.toEqual(mockError);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should throw error on sign out failure', async () => {
      const mockError = { message: 'Sign out failed' };
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: mockError,
      });

      await expect(authService.signOut()).rejects.toEqual(mockError);
    });
  });

  describe('onAuthStateChange', () => {
    it('should set up auth state change listener', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      const mockSubscription = {
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      };

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue(
        mockSubscription
      );

      const result = authService.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });
  });
});
