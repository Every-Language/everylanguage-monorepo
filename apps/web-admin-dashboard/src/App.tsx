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
const LanguageAvailabilityPage = lazy(() =>
  import('./features/availability/pages/LanguageAvailabilityPage').then(m => ({
    default: m.LanguageAvailabilityPage,
  }))
);
const ProjectsPage = lazy(() =>
  import('./features/availability/pages/ProjectsPage').then(m => ({
    default: m.ProjectsPage,
  }))
);
const AudioVersionsPage = lazy(() =>
  import('./features/availability/pages/AudioVersionsPage').then(m => ({
    default: m.AudioVersionsPage,
  }))
);
const TextVersionsPage = lazy(() =>
  import('./features/availability/pages/TextVersionsPage').then(m => ({
    default: m.TextVersionsPage,
  }))
);
const OperationsPage = lazy(() =>
  import('./features/operations/pages/OperationsPage').then(m => ({
    default: m.OperationsPage,
  }))
);
const BibleTranslationOverridesPage = lazy(() =>
  import('./features/statistics/pages/BibleTranslationOverridesPage').then(
    m => ({
      default: m.BibleTranslationOverridesPage,
    })
  )
);
const ExternalProjectsOverridesPage = lazy(() =>
  import('./features/statistics/pages/ExternalProjectsOverridesPage').then(
    m => ({
      default: m.ExternalProjectsOverridesPage,
    })
  )
);
const UsersPage = lazy(() =>
  import('./features/users/pages/UsersPage').then(m => ({
    default: m.UsersPage,
  }))
);
const PartnerOrgsPage = lazy(() =>
  import('./features/users/pages/PartnerOrgsPage').then(m => ({
    default: m.PartnerOrgsPage,
  }))
);
const TeamsPage = lazy(() =>
  import('./features/users/pages/TeamsPage').then(m => ({
    default: m.TeamsPage,
  }))
);
const BasesPage = lazy(() =>
  import('./features/users/pages/BasesPage').then(m => ({
    default: m.BasesPage,
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
            <Route
              path='/budgets/languages'
              element={<LanguageAvailabilityPage />}
            />
            <Route path='/projects' element={<ProjectsPage />} />
            <Route
              path='/projects/audio-versions'
              element={<AudioVersionsPage />}
            />
            <Route
              path='/projects/text-versions'
              element={<TextVersionsPage />}
            />
            <Route path='/budgets/operations' element={<OperationsPage />} />
            <Route
              path='/statistics/bible-translations'
              element={<BibleTranslationOverridesPage />}
            />
            <Route
              path='/statistics/external-projects'
              element={<ExternalProjectsOverridesPage />}
            />
            <Route path='/users' element={<UsersPage />} />
            <Route path='/users/partner-orgs' element={<PartnerOrgsPage />} />
            <Route path='/users/teams' element={<TeamsPage />} />
            <Route path='/users/bases' element={<BasesPage />} />
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
