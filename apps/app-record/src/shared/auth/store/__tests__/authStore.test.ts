import { act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/shared/infrastructure/supabase/client');
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');
jest.mock('@/shared/utils/logger');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

const setIsConnected = (value: boolean): void => {
  Object.defineProperty(mockPowerSyncSystem, 'isConnected', {
    configurable: true,
    get: () => value,
  });
};

const setIsInitialized = (value: boolean): void => {
  Object.defineProperty(mockPowerSyncSystem, 'isInitialized', {
    configurable: true,
    get: () => value,
  });
};

describe('authStore', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    is_anonymous: false,
  } as User;

  const mockSession: Session = {
    access_token: 'token-123',
    refresh_token: 'refresh-123',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  } as Session;

  let mockUnsubscribe: jest.Mock;
  let mockSubscription: { unsubscribe: jest.Mock };
  let onAuthStateChangeMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset store state
    act(() => {
      useAuthStore.setState({
        user: null,
        session: null,
        isLoading: false,
        isInitialized: false,
      });
    });

    // Setup default mocks
    mockUnsubscribe = jest.fn();
    mockSubscription = { unsubscribe: mockUnsubscribe };
    onAuthStateChangeMock = jest.fn(() => ({
      data: { subscription: mockSubscription },
    }));

    mockSupabase.auth = {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: onAuthStateChangeMock,
    } as any;

    mockPowerSyncSystem.disconnect = jest.fn().mockResolvedValue(undefined);
    mockPowerSyncSystem.connect = jest.fn().mockResolvedValue(undefined);
    mockPowerSyncSystem.execute = jest.fn().mockResolvedValue(undefined);
    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue([]);
    setIsConnected(false);
    setIsInitialized(true);
  });

  describe('initial state', () => {
    it('should have null user and session initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBe(mockUser);
    });

    it('should set user to null', () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
        useAuthStore.getState().setUser(null);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should set session', () => {
      act(() => {
        useAuthStore.getState().setSession(mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBe(mockSession);
    });

    it('should set session to null', () => {
      act(() => {
        useAuthStore.getState().setSession(mockSession);
        useAuthStore.getState().setSession(null);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      act(() => {
        useAuthStore.getState().setLoading(true);
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setInitialized', () => {
    it('should set initialized state', () => {
      act(() => {
        useAuthStore.getState().setInitialized(true);
      });

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize auth store successfully', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockUser);
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    });

    it('should handle null session', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    it('should set loading state during initialization', async () => {
      let resolveSession: (value: any) => void;
      const sessionPromise = new Promise(resolve => {
        resolveSession = resolve;
      });

      mockSupabase.auth.getSession = jest.fn().mockReturnValue(sessionPromise);

      const initPromise = act(async () => {
        await useAuthStore.getState().initialize();
      });

      // Check loading state is true
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveSession!({
        data: { session: null },
        error: null,
      });
      await initPromise;

      await waitFor(() => {
        expect(useAuthStore.getState().isLoading).toBe(false);
      });
    });

    it('should handle session error', async () => {
      const sessionError = new Error('Session error');
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: sessionError,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true); // Should still be initialized
      expect(state.isLoading).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth initialization failed:',
        sessionError
      );
    });

    it('should clean up existing listener before initializing', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // First initialization
      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Second initialization should clean up first listener
      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(2);
    });

    it('should set up auth state change listener', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
      const authCalls = onAuthStateChangeMock.mock.calls[0];
      if (!authCalls) {
        throw new Error('Expected auth state change listener to be registered');
      }
      const listenerCallback = authCalls[0] as (
        event: AuthChangeEvent,
        session: Session | null
      ) => void;

      // Simulate auth state change
      const newSession: Session = {
        ...mockSession,
        access_token: 'new-token',
      } as Session;

      act(() => {
        listenerCallback('SIGNED_IN', newSession);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBe(newSession);
      expect(state.user).toBe(newSession.user);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth state changed: SIGNED_IN',
        newSession.user?.email
      );
    });

    it('should update projects and connect PowerSync on SIGNED_IN event', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
      const authCalls = onAuthStateChangeMock.mock.calls[0];
      if (!authCalls) {
        throw new Error('Expected auth state change listener to be registered');
      }
      const listenerCallback = authCalls[0] as (
        event: AuthChangeEvent,
        session: Session | null
      ) => void;

      // Simulate SIGNED_IN event
      await act(async () => {
        listenerCallback('SIGNED_IN', mockSession);
      });

      // Wait for async operations
      await waitFor(() => {
        expect(mockPowerSyncSystem.execute).toHaveBeenCalled();
      });

      expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE projects'),
        [mockUser.id]
      );
      expect(mockPowerSyncSystem.getAll).toHaveBeenCalled();
      expect(mockPowerSyncSystem.connect).toHaveBeenCalledTimes(1);
    });

    it('should not update projects on non-SIGNED_IN events', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const authCalls = onAuthStateChangeMock.mock.calls[0];
      if (!authCalls) {
        throw new Error('Expected auth state change listener to be registered');
      }
      const listenerCallback = authCalls[0] as (
        event: AuthChangeEvent,
        session: Session | null
      ) => void;

      // Simulate TOKEN_REFRESHED event (should not trigger PowerSync operations)
      act(() => {
        listenerCallback('TOKEN_REFRESHED', mockSession);
      });

      // PowerSync operations should not be called for non-SIGNED_IN events
      expect(mockPowerSyncSystem.execute).not.toHaveBeenCalled();
      expect(mockPowerSyncSystem.connect).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockUser);
      expect(state.isLoading).toBe(false);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User signed in successfully',
        email
      );
    });

    it('should set loading state during sign in', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve;
      });

      mockSupabase.auth.signInWithPassword = jest
        .fn()
        .mockReturnValue(signInPromise);

      const signInCall = act(async () => {
        await useAuthStore.getState().signIn('test@example.com', 'password');
      });

      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveSignIn!({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      await signInCall;

      await waitFor(() => {
        expect(useAuthStore.getState().isLoading).toBe(false);
      });
    });

    it('should throw error on sign in failure', async () => {
      const signInError = new Error('Invalid credentials');
      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: signInError,
      });

      await act(async () => {
        await expect(
          useAuthStore.getState().signIn('test@example.com', 'wrong')
        ).rejects.toThrow('Invalid credentials');
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Sign in failed:',
        signInError
      );
    });

    it('should handle non-Error objects in sign in failure', async () => {
      const signInError = { message: 'Invalid credentials' };
      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: signInError,
      });

      await act(async () => {
        await expect(
          useAuthStore.getState().signIn('test@example.com', 'wrong')
        ).rejects.toThrow('Sign in failed');
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Sign in failed:',
        expect.any(Error)
      );
    });

    it('should update projects with user_id after sign in', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE projects'),
        [mockUser.id]
      );
    });

    it('should validate projects before connecting PowerSync', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      expect(mockPowerSyncSystem.getAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, created_by FROM projects'),
        undefined
      );
    });

    it('should connect PowerSync after sign in', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      setIsConnected(false);

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      expect(mockPowerSyncSystem.connect).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PowerSync connected after sign-in'
      );
    });

    it('should not connect PowerSync if already connected', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      setIsConnected(true);

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      expect(mockPowerSyncSystem.connect).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PowerSync already connected, skipping connection'
      );
    });

    it('should handle PowerSync connection failure gracefully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const connectionError = new Error('Connection failed');

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      mockPowerSyncSystem.connect = jest
        .fn()
        .mockRejectedValue(connectionError);
      setIsConnected(false);

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      // Sign-in should still succeed despite PowerSync failure
      const state = useAuthStore.getState();
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockUser);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect PowerSync after sign-in:',
        connectionError
      );
    });

    it('should skip PowerSync operations if not initialized', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      setIsInitialized(false);

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      // Sign-in should still succeed
      const state = useAuthStore.getState();
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockUser);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PowerSync not initialized, skipping project update with user_id'
      );
    });

    it('should handle projects with invalid created_by', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const otherUserId = 'other-user-123';

      mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });
      // Mock projects with invalid created_by
      mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue([
        { id: 'project-1', created_by: mockUser.id },
        { id: 'project-2', created_by: otherUserId }, // Invalid
      ]);

      await act(async () => {
        await useAuthStore.getState().signIn(email, password);
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Projects with invalid created_by found (will be skipped on sync):',
        [{ id: 'project-2', created_by: otherUserId }]
      );
    });
  });

  describe('signOut', () => {
    beforeEach(() => {
      // Set up initial session
      act(() => {
        useAuthStore.setState({
          session: mockSession,
          user: mockUser,
        });
      });
    });

    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: null,
      });
      setIsConnected(true);

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(mockPowerSyncSystem.disconnect).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User signed out successfully'
      );
    });

    it('should set loading state during sign out', async () => {
      let resolveSignOut: (value: any) => void;
      const signOutPromise = new Promise(resolve => {
        resolveSignOut = resolve;
      });

      mockSupabase.auth.signOut = jest.fn().mockReturnValue(signOutPromise);

      const signOutCall = act(async () => {
        await useAuthStore.getState().signOut();
      });

      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveSignOut!({ error: null });
      await signOutCall;

      await waitFor(() => {
        expect(useAuthStore.getState().isLoading).toBe(false);
      });
    });

    it('should throw error on sign out failure', async () => {
      const signOutError = new Error('Sign out failed');
      mockSupabase.auth.signOut = jest.fn().mockRejectedValue(signOutError);
      setIsConnected(false);

      await act(async () => {
        await expect(useAuthStore.getState().signOut()).rejects.toThrow(
          'Sign out failed'
        );
      });

      const state = useAuthStore.getState();
      // Should not clear session and user on error
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockUser);
      expect(state.isLoading).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Sign out failed:',
        signOutError
      );
    });

    it('should disconnect PowerSync before signing out', async () => {
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: null,
      });
      setIsConnected(true);

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      expect(mockPowerSyncSystem.disconnect).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PowerSync disconnected on sign out'
      );
    });

    it('should not disconnect PowerSync if not connected', async () => {
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: null,
      });
      setIsConnected(false);

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      expect(mockPowerSyncSystem.disconnect).not.toHaveBeenCalled();
    });

    it('should handle PowerSync disconnect error gracefully', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: null,
      });
      setIsConnected(true);
      mockPowerSyncSystem.disconnect = jest
        .fn()
        .mockRejectedValue(disconnectError);

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      const state = useAuthStore.getState();
      // Should still clear session and user
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to disconnect PowerSync on sign out:',
        disconnectError
      );
    });

    it('should clean up auth listener on sign out', async () => {
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: null,
      });
      setIsConnected(false);

      // Initialize first to set up listener
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Sign out should clean up listener
      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
