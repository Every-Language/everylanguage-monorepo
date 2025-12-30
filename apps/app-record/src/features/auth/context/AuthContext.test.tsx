import React from 'react';
import { View, Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from './AuthContext';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

// Mock auth service
jest.mock('../services/authService', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    getCurrentSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

// Test component that uses useAuth
function TestComponent() {
  const auth = useAuth();
  return (
    <View>
      <Text testID='loading'>{auth.loading ? 'loading' : 'not-loading'}</Text>
      <Text testID='user'>{auth.user?.email || 'no-user'}</Text>
      <Text testID='has-session'>
        {auth.session ? 'has-session' : 'no-session'}
      </Text>
    </View>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide loading state initially', async () => {
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);
    (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);
    (authService.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should be loading
    expect(getByTestId('loading').children[0]).toBe('loading');
  });

  it('should provide user and session after initialization', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { access_token: 'token-123', user: mockUser };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
    (authService.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').children[0]).toBe('not-loading');
      expect(getByTestId('user').children[0]).toBe('test@example.com');
      expect(getByTestId('has-session').children[0]).toBe('has-session');
    });
  });

  it('should handle sign in', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { access_token: 'token-123', user: mockUser };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);
    (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);
    (authService.signIn as jest.Mock).mockResolvedValue(undefined);

    let authStateChangeCallback:
      | ((user: unknown, session: unknown) => void)
      | null = null;
    (authService.onAuthStateChange as jest.Mock).mockImplementation(
      callback => {
        authStateChangeCallback = callback as (
          user: unknown,
          session: unknown
        ) => void;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
              id: 'test-subscription',
              callback: callback,
            },
          },
        };
      }
    );

    function SignInTestComponent() {
      const auth = useAuth();
      React.useEffect(() => {
        if (!auth.loading && !auth.user) {
          auth.signIn('test@example.com', 'password123');
        }
      }, [auth]);
      return (
        <Text testID='status'>{auth.user ? 'signed-in' : 'not-signed-in'}</Text>
      );
    }

    render(
      <AuthProvider>
        <SignInTestComponent />
      </AuthProvider>
    );

    // Trigger auth state change after sign in
    if (authStateChangeCallback) {
      (authStateChangeCallback as (user: unknown, session: unknown) => void)(
        mockUser,
        mockSession
      );
    }

    await waitFor(() => {
      expect(authService.signIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('should handle sign out', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { access_token: 'token-123', user: mockUser };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
    (authService.signOut as jest.Mock).mockResolvedValue(undefined);
    (authService.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    function SignOutTestComponent() {
      const auth = useAuth();
      React.useEffect(() => {
        if (auth.user) {
          auth.signOut();
        }
      }, [auth]);
      return (
        <Text testID='status'>{auth.user ? 'signed-in' : 'signed-out'}</Text>
      );
    }

    render(
      <AuthProvider>
        <SignOutTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authService.signOut).toHaveBeenCalled();
    });
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
