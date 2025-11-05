import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { ThemeProvider } from './shared/theme';
import { ProtectedRoute, LoginPage, UnauthorizedPage } from './features/auth';
import { AppLayout } from './shared/components/Layout';
import { AppHeader } from './shared/components/AppHeader';

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
const DonationsPage = lazy(() =>
  import('./features/donations/pages/DonationsPage').then(m => ({
    default: m.DonationsPage,
  }))
);
const AllocationsPage = lazy(() =>
  import('./features/donations/pages/AllocationsPage').then(m => ({
    default: m.AllocationsPage,
  }))
);

function LoadingFallback() {
  return (
    <div className='flex items-center justify-center h-full min-h-[400px]'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
        <p className='mt-4 text-sm text-neutral-600 dark:text-neutral-400'>
          Loading...
        </p>
      </div>
    </div>
  );
}

// Layout wrapper for protected routes
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className='flex flex-col h-screen'>
        <AppHeader />
        <AppLayout>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </AppLayout>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path='/login' element={<LoginPage />} />
          <Route path='/unauthorized' element={<UnauthorizedPage />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedLayout />}>
            <Route path='/dashboard' element={<DashboardPage />} />
            <Route path='/languages' element={<LanguagesPage />} />
            <Route path='/regions' element={<RegionsPage />} />
            <Route path='/donations' element={<DonationsPage />} />
            <Route path='/allocations' element={<AllocationsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path='/' element={<Navigate to='/dashboard' replace />} />
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
