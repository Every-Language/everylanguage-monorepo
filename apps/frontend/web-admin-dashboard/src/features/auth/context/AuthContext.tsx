import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { authService } from '../services/auth';
import type { AuthContextType, AuthState, UserRole } from '../types';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    userRoles: [],
  });

  // Track pending sign in operations
  const pendingSignInRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const [user, session] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentSession(),
      ]);

      // Fetch user roles if user is authenticated
      let userRoles: UserRole[] = [];
      if (user) {
        userRoles = await authService.getUserRoles(user.id);
        console.log('User roles fetched:', userRoles);
      }

      setState({
        user,
        session,
        loading: false,
        userRoles,
      });
    } catch (error) {
      console.error('Error refreshing user:', error);
      setState({
        user: null,
        session: null,
        loading: false,
        userRoles: [],
      });
    }
  }, []);

  // Authentication methods
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Create a promise to wait for auth state change
      const pendingPromise = new Promise<void>((resolve, reject) => {
        pendingSignInRef.current = { resolve, reject };

        // Set a timeout to prevent hanging
        setTimeout(() => {
          if (pendingSignInRef.current) {
            pendingSignInRef.current.reject(new Error('Sign in timeout'));
            pendingSignInRef.current = null;
          }
        }, 10000); // 10 second timeout
      });

      await authService.signIn(email, password);

      // Wait for auth state change to complete
      await pendingPromise;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const signInWithPhone = useCallback(
    async (phone: string, password: string): Promise<void> => {
      await authService.signInWithPhone(phone, password);
    },
    []
  );

  const requestPhoneOtp = useCallback(async (phone: string): Promise<void> => {
    await authService.requestPhoneOtp(phone);
  }, []);

  const verifyOtp = useCallback(
    async (
      phone: string,
      token: string,
      type?: 'sms' | 'phone_change'
    ): Promise<void> => {
      await authService.verifyOtp(phone, token, type);
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setState({
        user: null,
        session: null,
        loading: false,
        userRoles: [],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    await authService.resetPassword(email);
  }, []);

  const updatePassword = useCallback(
    async (password: string): Promise<void> => {
      await authService.updatePassword(password);
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            userRoles: [],
          });
        }
      }
    };

    // Listen for authentication state changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (user, session) => {
      console.log('Auth state changed:', user?.id);

      if (!isMounted) return;

      // Fetch user roles if user is authenticated
      let userRoles: UserRole[] = [];
      if (user) {
        userRoles = await authService.getUserRoles(user.id);
        console.log('User roles fetched on auth change:', userRoles);
      }

      setState({
        user,
        session,
        loading: false,
        userRoles,
      });

      // Resolve any pending sign in operations
      if (pendingSignInRef.current) {
        if (user) {
          pendingSignInRef.current.resolve();
        } else {
          pendingSignInRef.current.reject(new Error('Authentication failed'));
        }
        pendingSignInRef.current = null;
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const contextValue: AuthContextType = {
    user: state.user,
    session: state.session,
    loading: state.loading,
    userRoles: state.userRoles,
    signIn,
    signInWithPhone,
    requestPhoneOtp,
    verifyOtp,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
