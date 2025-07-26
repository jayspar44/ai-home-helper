import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
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
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <p className="text-xl font-semibold text-gray-700">Loading...</p>
      </div>
    );
  }

  console.log('App render - user:', !!user, 'profile:', !!profile, 'userToken:', !!userToken);

  if (!user || !profile) {
    return <AuthPage />;
  }

  return (
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
  );
}
