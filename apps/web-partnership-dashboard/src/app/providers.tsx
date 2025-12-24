'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@/shared/theme';
import { ToastManager } from '@/shared/theme/hooks/useToast';
import { queryClient } from '@/shared/query/query-client';
import { AuthProvider } from '@/features/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastManager>
          <AuthProvider>{children}</AuthProvider>
        </ToastManager>
      </ThemeProvider>
      {/* Only show DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
