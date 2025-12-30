import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { authService } from '../services/authService';
import type { AuthContextType, AuthState, User, Session } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Track pending sign in operations
  const pendingSignInRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const [user, session] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentSession(),
      ]);

      setState({
        user,
        session,
        loading: false,
      });
    } catch (error) {
      console.error('Error refreshing user:', error);
      setState({
        user: null,
        session: null,
        loading: false,
      });
    }
  }, []);

  // Authentication methods
  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
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
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await authService.signOut();
      setState({
        user: null,
        session: null,
        loading: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async (): Promise<void> => {
      try {
        await refreshUser();
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setState({
            user: null,
            session: null,
            loading: false,
          });
        }
      }
    };

    // Listen for authentication state changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(
      async (user: User | null, session: Session | null) => {
        if (!isMounted) return;

        setState({
          user,
          session,
          loading: false,
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
      }
    );

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
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
