import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { ThemeProvider } from './hooks/useTheme';
import AuthPage from './auth/AuthPage';
import SharedLayout from './components/SharedLayout';
import HomePage from './pages/HomePage';
import RecipeGenerator from './pages/RecipeGenerator';
import HomeAdminPage from './pages/HomeAdminPage';
import PantryPage from './pages/PantryPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (token) => {
      try {
          const response = await fetch('/api/user/me', {
              method: 'GET',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
              }
          });

          console.log('Profile response status:', response.status); // Debug logging

          if (response.ok) {
              const data = await response.json();
              console.log('Profile data:', data); // Debug logging
              setProfile(data);
          } else {
              const errorData = await response.json();
              console.error("Failed to fetch user profile:", errorData);
              // Only sign out on auth errors, not server errors
              if (response.status === 401) {
                  signOut(auth);
              }
          }
      } catch (error) {
          console.error("Error fetching user profile:", error);
          // Only sign out on network/critical errors
          if (error.name !== 'AbortError') {
              signOut(auth);
          }
      }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const token = await currentUser.getIdToken();
        setUserToken(token);
        await fetchProfile(token);
      } else {
        setUser(null);
        setUserToken(null);
        setProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchProfile]);

  const handleLogout = () => {
    signOut(auth).catch((error) => console.error("Logout Error:", error));
  };


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

  console.log('App render - user:', !!user, 'profile:', !!profile, 'userToken:', !!userToken);

  if (!user || !profile) {
    return <AuthPage />;
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SharedLayout profile={profile} onLogout={handleLogout} userToken={userToken} />}>
            <Route index element={<HomePage />} />
            <Route path="recipe-generator" element={<RecipeGenerator />} />
            <Route path="home-admin" element={<HomeAdminPage />} />
            <Route path="/pantry" element={<PantryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
