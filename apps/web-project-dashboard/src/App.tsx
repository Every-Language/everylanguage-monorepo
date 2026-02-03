import React, { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './features/auth';
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  UnauthorizedPage,
} from './features/auth/pages';
import { ProjectLayout } from './shared/components/Layout';
import { ThemeProvider } from './shared/theme';
import { ToastManager } from './shared/design-system/hooks/useToast';
import { LoadingSpinner } from './shared/design-system';
import { GlobalAudioPlayer } from './shared/components/GlobalAudioPlayer';
import { GlobalUploadProgress } from './shared/components/GlobalUploadProgress';
import { TextUploadProgress } from './features/upload/components/TextUploadProgress';
import { UploadResumeHandler } from './features/upload/components/UploadResumeHandler';

// Lazy load pages for better performance
const ProjectsPage = React.lazy(() =>
  import('./app/pages/ProjectsPage').then(module => ({
    default: module.ProjectsPage,
  }))
);

const DashboardPage = React.lazy(() =>
  import('./app/pages/DashboardPage').then(module => ({
    default: module.DashboardPage,
  }))
);

const ProjectUpdatesPage = React.lazy(() =>
  import('./features/project-updates').then(module => ({
    default: module.ProjectUpdatesPage,
  }))
);

const ProgressPage = React.lazy(() =>
  import('./app/pages/ProgressPage').then(module => ({
    default: module.ProgressPage,
  }))
);

const BibleProgressPage = React.lazy(() =>
  import('./app/pages/BibleProgressPage').then(module => ({
    default: module.BibleProgressPage,
  }))
);

const AudioVersionsPage = React.lazy(() =>
  import('./app/pages/AudioVersionsPage').then(module => ({
    default: module.AudioVersionsPage,
  }))
);

const AudioFilesPage = React.lazy(() =>
  import('./app/pages/AudioFilesPage').then(module => ({
    default: module.AudioFilesPage,
  }))
);

const TextVersionsPage = React.lazy(() =>
  import('./app/pages/TextVersionsPage').then(module => ({
    default: module.TextVersionsPage,
  }))
);

const BibleTextPage = React.lazy(() =>
  import('./app/pages/BibleTextPage').then(module => ({
    default: module.BibleTextPage,
  }))
);

const CommunityCheckSelectorPage = React.lazy(() =>
  import('./app/pages/CommunityCheckSelectorPage').then(module => ({
    default: module.CommunityCheckSelectorPage,
  }))
);

const CommunityCheckPage = React.lazy(() =>
  import('./features/community-check').then(module => ({
    default: module.CommunityCheckPage,
  }))
);

const UsersPage = React.lazy(() =>
  import('./features/user-management/pages').then(module => ({
    default: module.UsersPage,
  }))
);

const MyProfilePage = React.lazy(() =>
  import('./app/pages/MyProfilePage').then(module => ({
    default: module.MyProfilePage,
  }))
);

const LandingPage = React.lazy(() =>
  import('./app/pages/LandingPage').then(module => ({
    default: module.LandingPage,
  }))
);

const LanguagesPage = React.lazy(() =>
  import('./app/pages/LanguagesPage').then(module => ({
    default: module.LanguagesPage,
  }))
);

// Loading fallback component
const PageLoadingFallback = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <LoadingSpinner size='lg' />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <ToastManager>
        <AuthProvider>
          <Router>
            <GlobalAudioPlayer />
            <GlobalUploadProgress />
            <TextUploadProgress />
            <UploadResumeHandler />
            <Routes>
              {/* Public routes */}
              <Route path='/login' element={<LoginPage />} />
              <Route path='/register' element={<RegisterPage />} />
              <Route path='/forgot-password' element={<ForgotPasswordPage />} />
              <Route path='/unauthorized' element={<UnauthorizedPage />} />

              {/* Landing Page (public) */}
              <Route
                path='/'
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <LandingPage />
                  </Suspense>
                }
              />

              {/* Languages Page (public) */}
              <Route
                path='/languages'
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <LanguagesPage />
                  </Suspense>
                }
              />

              {/* Projects Page (protected, full-screen project selection) */}
              <Route
                path='/projects'
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <ProjectsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Profile Page (protected, outside project context) */}
              <Route
                path='/profile'
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <MyProfilePage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Project routes (protected, with project context from URL) */}
              <Route
                path='/project/:projectId'
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <ProjectLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                {/* Dashboard */}
                <Route
                  path='dashboard'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />

                {/* Project Updates */}
                <Route
                  path='updates'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <ProjectUpdatesPage />
                    </Suspense>
                  }
                />

                {/* Progress - Version Selector */}
                <Route
                  path='progress'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <ProgressPage />
                    </Suspense>
                  }
                />

                {/* Progress - Audio Version specific */}
                <Route
                  path='progress/audio-version/:versionId'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <BibleProgressPage />
                    </Suspense>
                  }
                />

                {/* Progress - Text Version specific */}
                <Route
                  path='progress/text-version/:versionId'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <BibleProgressPage />
                    </Suspense>
                  }
                />

                {/* Audio Versions - List/Create */}
                <Route
                  path='audio-versions'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <AudioVersionsPage />
                    </Suspense>
                  }
                />

                {/* Audio Version - Files Page */}
                <Route
                  path='audio-versions/:versionId'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <AudioFilesPage />
                    </Suspense>
                  }
                />

                {/* Text Versions - List/Create */}
                <Route
                  path='text-versions'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <TextVersionsPage />
                    </Suspense>
                  }
                />

                {/* Text Version - Content Page */}
                <Route
                  path='text-versions/:versionId'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <BibleTextPage />
                    </Suspense>
                  }
                />

                {/* Community Check - Version Selector */}
                <Route
                  path='community-check'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <CommunityCheckSelectorPage />
                    </Suspense>
                  }
                />

                {/* Community Check - Audio Version specific */}
                <Route
                  path='community-check/audio-version/:versionId'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <CommunityCheckPage />
                    </Suspense>
                  }
                />

                {/* Members */}
                <Route
                  path='members'
                  element={
                    <Suspense fallback={<PageLoadingFallback />}>
                      <UsersPage />
                    </Suspense>
                  }
                />

                {/* Default project route - redirect to dashboard */}
                <Route index element={<Navigate to='dashboard' replace />} />
              </Route>

              {/* Legacy routes - redirect to new structure */}
              <Route
                path='/dashboard'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/bible-progress'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/audio-files'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/bible-text'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/community-check'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/users'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/project-updates'
                element={<Navigate to='/projects' replace />}
              />
              <Route
                path='/images'
                element={<Navigate to='/projects' replace />}
              />

              {/* Catch all - redirect to projects */}
              <Route path='*' element={<Navigate to='/projects' replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastManager>
    </ThemeProvider>
  );
}

export default App;
