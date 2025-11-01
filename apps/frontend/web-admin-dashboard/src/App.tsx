import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider } from './shared/theme';
import { ProtectedRoute, LoginPage, UnauthorizedPage } from './features/auth';
import { AppLayout } from './shared/components/Layout';

// Lazy load pages
const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage').then(m => ({
    default: m.DashboardPage,
  }))
);
const LanguagesPage = lazy(() =>
  import('./features/languages/pages/LanguagesPage').then(m => ({
    default: m.LanguagesPage,
  }))
);
const RegionsPage = lazy(() =>
  import('./features/regions/pages/RegionsPage').then(m => ({
    default: m.RegionsPage,
  }))
);
const SponsorshipsPage = lazy(() =>
  import('./features/sponsorships/pages/SponsorshipsPage').then(m => ({
    default: m.SponsorshipsPage,
  }))
);
const AllocateSponsorshipsPage = lazy(() =>
  import('./features/sponsorships/pages/AllocateSponsorshipsPage').then(m => ({
    default: m.AllocateSponsorshipsPage,
  }))
);

function LoadingFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-neutral-50'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
        <p className='mt-4 text-sm text-neutral-600'>Loading...</p>
      </div>
    </div>
  );
}

// Helper component to reduce repetition
const ProtectedLayoutRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path='/login' element={<LoginPage />} />
            <Route path='/unauthorized' element={<UnauthorizedPage />} />

            {/* Protected routes with layout */}
            <Route
              path='/dashboard'
              element={
                <ProtectedLayoutRoute>
                  <DashboardPage />
                </ProtectedLayoutRoute>
              }
            />

            <Route
              path='/languages'
              element={
                <ProtectedLayoutRoute>
                  <LanguagesPage />
                </ProtectedLayoutRoute>
              }
            />

            <Route
              path='/regions'
              element={
                <ProtectedLayoutRoute>
                  <RegionsPage />
                </ProtectedLayoutRoute>
              }
            />

            <Route
              path='/sponsorships'
              element={
                <ProtectedLayoutRoute>
                  <SponsorshipsPage />
                </ProtectedLayoutRoute>
              }
            />

            <Route
              path='/sponsorships/allocate'
              element={
                <ProtectedLayoutRoute>
                  <AllocateSponsorshipsPage />
                </ProtectedLayoutRoute>
              }
            />

            {/* Default redirect */}
            <Route path='/' element={<Navigate to='/dashboard' replace />} />
            <Route path='*' element={<Navigate to='/dashboard' replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
