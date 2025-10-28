import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import VersionDisplay from './VersionDisplay';
import logger from '../utils/logger';

// ===== ICONS =====
// Navigation icons are now emojis - only keeping utility icons for dropdowns and checkmarks
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

export default function SharedLayout({ profile, onLogout, userToken, refreshProfile }) {
  logger.debug('SharedLayout render - profile:', !!profile, 'userToken:', !!userToken);
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [selectedHomeId, setSelectedHomeId] = useState(profile?.primaryHomeId);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get current home
  const currentHome = profile?.homes?.find(h => h.id === selectedHomeId) || profile?.homes?.[0];
  
  // Handle clicking outside dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowHomeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleHomeChange = async (homeId) => {
    setSelectedHomeId(homeId);
    setShowHomeDropdown(false);
    // TODO: Update user's primaryHomeId in backend if needed
  };

  const outletContext = {
    userToken,
    activeHomeId: selectedHomeId,
    profile,
    refreshProfile: refreshProfile || (() => {}),
    currentHome
  };

  const navigation = [
    {
      name: 'Home',
      path: '/',
      emoji: '🏠',
      mobileLabel: 'Home'
    },
    {
      name: 'Pantry',
      path: '/pantry',
      emoji: '🥫',
      mobileLabel: 'Pantry'
    },
    {
      name: 'Planner',
      path: '/planner',
      emoji: '📅',
      mobileLabel: 'Planner'
    },
    {
      name: 'Shopping',
      path: '/shopping-list',
      emoji: '🛒',
      mobileLabel: 'Shopping'
    },
    {
      name: 'Recipes',
      path: '/recipe-generator',
      emoji: '🍽️',
      mobileLabel: 'Recipes'
    },
    {
      name: 'Manage',
      path: '/manage',
      emoji: '⚙️',
      mobileLabel: 'Manage'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="desktop-only fixed left-0 top-0 h-full z-30" style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-light)' }}>
        <div className="flex flex-col h-full">
          
          {/* Sidebar Header */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3 mb-2">
              {/* Roscoe Logo */}
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20V80Z" fill="#34D399"/>
                <path d="M50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80V20Z" fill="#A7F3D0"/>
              </svg>
              <div>
                <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Roscoe</h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Home Helper</p>
              </div>
            </div>
            <VersionDisplay />
          </div>
          
          {/* User Profile */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                {profile.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
              </div>
            </div>
          </div>
          
          {/* Home Selector */}
          {profile?.homes && profile.homes.length > 0 && (
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <span className="font-medium">{currentHome?.name || 'Select Home'}</span>
                  <ChevronDownIcon />
                </button>
                
                {showHomeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg border z-50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-medium)' }}>
                    <div className="py-2">
                      {profile.homes.map(home => (
                        <button
                          key={home.id}
                          onClick={() => handleHomeChange(home.id)}
                          className="w-full text-left px-4 py-3 hover:bg-opacity-80 flex items-center justify-between transition-colors"
                          style={{ 
                            backgroundColor: selectedHomeId === home.id ? 'var(--bg-tertiary)' : 'transparent',
                            ':hover': { backgroundColor: 'var(--bg-tertiary)' }
                          }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{home.name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Role: {home.role}</div>
                          </div>
                          {selectedHomeId === home.id && <CheckIcon />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigation.map(({ name, path, emoji }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'hover:bg-opacity-80'
                  }`}
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-primary)',
                    ':hover': { backgroundColor: isActive ? 'var(--color-primary)' : 'var(--bg-tertiary)' }
                  })}
                  end
                >
                  <span className="text-xl">{emoji}</span>
                  <span>{name}</span>
                </NavLink>
              ))}
            </div>
          </nav>

        </div>
      </aside>

      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-only sticky top-0 z-20 border-b" style={{
        backgroundColor: 'var(--bg-overlay)',
        borderColor: 'var(--border-light)',
        backdropFilter: 'blur(10px)',
        height: 'var(--header-height)'
      }}>
        <div className="flex items-center justify-between h-full px-4">

          {/* Mobile Header Left */}
          <div className="flex items-center gap-4">
            {/* Mobile Logo */}
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20V80Z" fill="#34D399"/>
                <path d="M50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80V20Z" fill="#A7F3D0"/>
              </svg>
              <div className="flex flex-col">
                <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Roscoe</span>
                <VersionDisplay />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="mobile-nav-space lg:pl-[var(--sidebar-width)]">
        <Outlet context={outletContext} />
      </main>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className="mobile-only fixed bottom-0 left-0 right-0 border-t z-10" style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-light)',
        height: 'var(--bottom-nav-height)'
      }}>
        <div className="flex justify-around items-center h-full px-2">
          {navigation.map(({ mobileLabel, path, emoji }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all min-w-0 flex-1 ${
                isActive ? 'text-white' : ''
              }`}
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-muted)'
              })}
              end
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-medium truncate">{mobileLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
}