import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { lazy, Suspense } from 'react';

// Components (eagerly loaded — small + used everywhere)
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts (eagerly loaded — needed for initial render)
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

// ─── Lazy-loaded Pages ──────────────────────────────────────────────────────
// Protected/heavy pages are code-split to improve initial load time.

// Public pages
const Home     = lazy(() => import('./pages/home/Home'));
const Privacy  = lazy(() => import('./pages/home/Privacy'));
const Terms    = lazy(() => import('./pages/home/Terms'));

// Auth pages
const Login          = lazy(() => import('./pages/auth/Login'));
const Signup         = lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const OTPVerification = lazy(() => import('./pages/auth/OTPVerification'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const AuthCallback   = lazy(() => import('./pages/auth/AuthCallback'));
const AuthError      = lazy(() => import('./pages/auth/AuthError'));

// Protected pages
const UpdateProfile          = lazy(() => import('./pages/profile/UpdateProfile'));
const ProfileChangePassword  = lazy(() => import('./pages/profile/ProfileChangePassword'));
const Dashboard              = lazy(() => import('./pages/dashboard/Dashboard'));
const JobsTable              = lazy(() => import('./pages/dashboard/JobsTable'));

// Core Styles
import './styles/global.css';
import './styles/layout.css';

// ─── Loading Fallback ───────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(99, 102, 241, 0.2)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  return (
    // ErrorBoundary → ThemeProvider → AuthProvider → BrowserRouter
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {/* Global toast host — required for react-hot-toast toast.* calls to render */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontSize: '14px', maxWidth: '420px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { duration: 5000 },
            }}
          />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* App Layout (Navbar + Footer) */}
                <Route element={<AppLayout />}>
                  {/* Public routes */}
                  <Route path="/"              element={<Home />} />
                  <Route path="/home"          element={<Home />} />
                  <Route path="/privacy-policy" element={<Privacy />} />
                  <Route path="/terms"          element={<Terms />} />

                  {/* Protected routes — redirect to /login if not authenticated */}
                  <Route path="/dashboard"               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/jobs"                    element={<ProtectedRoute><JobsTable /></ProtectedRoute>} />
                  <Route path="/profile"                 element={<ProtectedRoute><UpdateProfile /></ProtectedRoute>} />
                  <Route path="/update-profile"          element={<ProtectedRoute><UpdateProfile /></ProtectedRoute>} />
                  <Route path="/profile/change-password" element={<ProtectedRoute><ProfileChangePassword /></ProtectedRoute>} />
                </Route>

                {/* Auth Layout (Login/Signup flow) */}
                <Route element={<AuthLayout />}>
                  <Route path="/login"           element={<Login />} />
                  <Route path="/signup"          element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/otp"             element={<OTPVerification />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/auth/callback"   element={<AuthCallback />} />
                  <Route path="/auth/error"      element={<AuthError />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
