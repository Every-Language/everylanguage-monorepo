import { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider } from './shared/theme';
import { ProtectedRoute, LoginPage, UnauthorizedPage } from './features/auth';

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

// Temporary dashboard placeholder
function DashboardPlaceholder() {
  return (
    <div className='flex items-center justify-center min-h-screen bg-neutral-50'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold text-neutral-900'>Admin Dashboard</h1>
        <p className='mt-4 text-neutral-600'>Building features...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className='min-h-screen bg-neutral-50'>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path='/login' element={<LoginPage />} />
              <Route path='/unauthorized' element={<UnauthorizedPage />} />

              {/* Protected routes */}
              <Route
                path='/dashboard'
                element={
                  <ProtectedRoute>
                    <DashboardPlaceholder />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path='/' element={<Navigate to='/dashboard' replace />} />
              <Route path='*' element={<Navigate to='/dashboard' replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
