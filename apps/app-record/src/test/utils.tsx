import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { useAuthStore } from '@/shared/auth/store/authStore';
import { useThemeStore } from '@/shared/store/themeStore';
import { useCreateProjectStore } from '@/features/projects/store/createProjectStore';

/**
 * Test utilities for React Native Testing Library
 *
 * Provides custom render function with providers and helper functions
 * for resetting stores between tests.
 */

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides all necessary context providers
 */
function AllTheProviders({ children }: AllTheProvidersProps): ReactElement {
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with all providers
 *
 * Usage:
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />);
 * ```
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): ReturnType<typeof render> {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  });
}

/**
 * Reset all Zustand stores to their initial state
 * Call this in beforeEach to ensure clean state between tests
 */
function resetAllStores(): void {
  // Reset auth store
  useAuthStore.setState({
    user: null,
    session: null,
    isLoading: false,
    isInitialized: false,
  });

  // Reset theme store
  useThemeStore.setState({
    mode: 'light',
    isLoading: false,
    error: null,
    systemScheme: 'light',
  });

  // Reset create project store
  useCreateProjectStore.setState({
    source_language_id: null,
    source_language_name: null,
    target_language_id: null,
    target_language_name: null,
    region_id: null,
    region_name: null,
  });
}

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';

// Override render function
export { renderWithProviders as render, resetAllStores };
