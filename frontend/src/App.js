import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './auth/AuthPage';
import SharedLayout from './components/SharedLayout';
import HomePage from './pages/HomePage';
import RecipeGenerator from './pages/RecipeGenerator';
import HomeAdminPage from './pages/HomeAdminPage';
import PantryPage from './pages/PantryPage';
import PlannerPage from './pages/PlannerPage';
import logger from './utils/logger';

export default function App() {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Debug: Log environment and config on app start
  useEffect(() => {
    logger.debug('App Debug Info:', {
      environment: process.env.NODE_ENV,
      hasFirebaseConfig: !!process.env.REACT_APP_FIREBASE_CONFIG,
      hasAuth: !!auth
    });

    // Check for configuration errors
    if (!process.env.REACT_APP_FIREBASE_CONFIG) {
      const error = 'REACT_APP_FIREBASE_CONFIG environment variable is missing';
      logger.error('Config Error:', error);
      setConfigError(error);
      setIsLoading(false);
      return;
    }

    try {
      const config = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
      logger.debug('Firebase project:', config.projectId);
    } catch (e) {
      const error = 'REACT_APP_FIREBASE_CONFIG is not valid JSON';
      logger.error('Config Error:', error, e);
      setConfigError(error);
      setIsLoading(false);
      return;
    }
  }, []);

  const fetchProfile = useCallback(async (token) => {
      let timeoutId = null;
      try {
          logger.debug('Fetching user profile');

          // Create AbortController for timeout
          const controller = new AbortController();

          // Set up timeout that aborts after 15 seconds
          timeoutId = setTimeout(() => {
              logger.warn('Profile fetch timeout - aborting request');
              controller.abort();
          }, 15000); // 15 second timeout

          logger.debug('Starting profile fetch request');
          const response = await fetch('/api/user/me', {
              method: 'GET',
              signal: controller.signal,
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
              }
          });

          // Clear timeout on successful response
          if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
          }
          logger.debug('Profile response status:', response.status);

          if (response.ok) {
              const data = await response.json();
              logger.info('Profile data received');
              setProfile(data);
          } else {
              const errorData = await response.json().catch(() => ({ error: 'No error data' }));
              logger.error('Failed to fetch user profile:', errorData);
              // Only sign out on auth errors, not server errors
              if (response.status === 401) {
                  logger.info('Signing out due to 401 error');
                  signOut(auth);
              }
          }
      } catch (error) {
          logger.error('Error fetching user profile:', error);

          // Handle different types of errors
          if (error.name === 'AbortError') {
              logger.error('Profile fetch was aborted (timeout)');
              setProfileError('Server timeout - please try again');
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
              logger.error('Network error - unable to reach server');
              setProfileError('Unable to reach server - check your connection');
          } else {
              logger.error('Unexpected error during profile fetch');
              setProfileError('Unexpected error - please try again');
          }
      } finally {
          // Always clean up timeout
          if (timeoutId) {
              clearTimeout(timeoutId);
          }
      }
  }, []);

  useEffect(() => {
    logger.debug('Setting up Firebase auth listener');

    // Add a timeout fallback in case auth never resolves
    const authTimeout = setTimeout(() => {
      logger.warn('Auth state timeout - forcing loading to false');
      setIsLoading(false);
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      logger.debug('Auth state changed:', !!currentUser);
      clearTimeout(authTimeout); // Clear timeout since auth resolved

      if (currentUser) {
        logger.info('User authenticated');
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken();
          logger.debug('Got user token');
          setUserToken(token);
          await fetchProfile(token);
        } catch (error) {
          logger.error('Error getting token or profile:', error);
        }
      } else {
        logger.debug('No user authenticated');
        setUser(null);
        setUserToken(null);
        setProfile(null);
      }
      setIsLoading(false);
    }, (error) => {
      logger.error('Firebase auth error:', error);
      clearTimeout(authTimeout);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, [fetchProfile]);

  const handleLogout = () => {
    signOut(auth).catch((error) => logger.error("Logout Error:", error));
  };


  // Show configuration error if any
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">!</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Configuration Error</h1>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              The application is missing required configuration. Please set up environment variables.
            </p>

            <div className="bg-gray-100 p-3 rounded text-sm">
              <strong>Error:</strong> {configError}
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <p className="text-blue-800 text-sm font-semibold">Required Environment Variable:</p>
              <code className="text-xs bg-blue-100 px-1 py-0.5 rounded">REACT_APP_FIREBASE_CONFIG</code>
              <p className="text-blue-700 text-xs mt-1">
                This should contain your Firebase project configuration as a JSON string.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          {/* Roscoe Logo */}
          <div className="mb-8 flex justify-center">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20V80Z" fill="#34D399"/>
              <path d="M50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80V20Z" fill="#A7F3D0"/>
            </svg>
          </div>

          {/* Loading text and spinner */}
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Roscoe</h1>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '0.4s' }}></div>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Setting up your home helper...</p>
          </div>
        </div>
      </div>
    );
  }

  logger.debug('App render -', { hasUser: !!user, hasProfile: !!profile, hasToken: !!userToken, profileError });

  // Show profile error if we have a user but profile failed to load
  if (user && profileError && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">⚠</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Profile Loading Error</h1>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              Unable to load your profile from the server.
            </p>

            <div className="bg-gray-100 p-3 rounded text-sm">
              <strong>Error:</strong> {profileError}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setProfileError(null);
                  if (userToken) fetchProfile(userToken);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<SharedLayout profile={profile} onLogout={handleLogout} userToken={userToken} />}>
                <Route index element={<HomePage />} />
                <Route path="recipe-generator" element={<RecipeGenerator />} />
                <Route path="home-admin" element={<HomeAdminPage />} />
                <Route path="/pantry" element={<PantryPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
