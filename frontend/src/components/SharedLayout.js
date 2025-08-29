import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

// ===== ICONS =====
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;

const RecipeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M18 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M18 16v.01"></path><path d="M18 20v.01"></path></svg>;

const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

const PantryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M19 11V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" /><path d="M6 11h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" /><path d="M10 11V9" /><path d="M14 11V9" /></svg>;

const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;

const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>;

const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>;

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>;

export default function SharedLayout({ profile, onLogout, userToken }) {
  console.log('SharedLayout render - profile:', !!profile, 'userToken:', !!userToken);
  
  const { theme, toggleTheme, isDark } = useTheme();
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [selectedHomeId, setSelectedHomeId] = useState(profile?.primaryHomeId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    refreshProfile: () => {},
    currentHome
  };

  const navigation = [
    { 
      name: 'Home', 
      path: '/', 
      icon: HomeIcon,
      mobileLabel: 'Home'
    },
    { 
      name: 'Pantry', 
      path: '/pantry', 
      icon: PantryIcon,
      mobileLabel: 'Pantry'
    },
    { 
      name: 'Recipes', 
      path: '/recipe-generator', 
      icon: RecipeIcon,
      mobileLabel: 'Recipes'
    },
    { 
      name: 'Admin', 
      path: '/home-admin', 
      icon: AdminIcon,
      mobileLabel: 'Admin'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className={`desktop-only fixed left-0 top-0 h-full z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`} style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-light)' }}>
        <div className="flex flex-col h-full">
          
          {/* Sidebar Header */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3">
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
              {navigation.map(({ name, path, icon: Icon }) => (
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
                  <Icon />
                  <span>{name}</span>
                </NavLink>
              ))}
            </div>
          </nav>
          
          {/* Theme Toggle */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors hover:bg-opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
              <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
          
          {/* Logout */}
          <div className="p-4">
            <button 
              onClick={onLogout}
              className="w-full px-4 py-3 rounded-lg transition-all font-medium border hover:bg-opacity-10"
              style={{ 
                color: 'var(--color-error)', 
                borderColor: 'var(--color-error)',
                ':hover': { backgroundColor: 'var(--color-error)' }
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MOBILE/DESKTOP HEADER ===== */}
      <header className="sticky top-0 z-20 border-b" style={{ 
        backgroundColor: 'var(--bg-overlay)', 
        borderColor: 'var(--border-light)',
        backdropFilter: 'blur(10px)',
        height: 'var(--header-height)',
        paddingLeft: 'var(--sidebar-width)' // Desktop only
      }}>
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          
          {/* Mobile Header Left */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <MenuIcon />
            </button>
            
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20V80Z" fill="#34D399"/>
                <path d="M50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80V20Z" fill="#A7F3D0"/>
              </svg>
              <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Roscoe</span>
            </div>
            
            {/* Desktop Search */}
            <div className="hidden lg:flex items-center max-w-md">
              <div className="relative w-full">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="input-base pl-12 py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Header Right */}
          <div className="flex items-center gap-3">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="lg:hidden p-2 rounded-lg hover:bg-opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            
            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-opacity-80 relative" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <BellIcon />
              {/* Notification dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }}></div>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="mobile-nav-space" style={{ paddingLeft: '0' }}>
        <div className="lg:pl-[var(--sidebar-width)]">
          <Outlet context={outletContext} />
        </div>
      </main>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className="mobile-only fixed bottom-0 left-0 right-0 border-t z-10" style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderColor: 'var(--border-light)',
        height: 'var(--bottom-nav-height)'
      }}>
        <div className="flex justify-around items-center h-full px-2">
          {navigation.map(({ mobileLabel, path, icon: Icon }) => (
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
              <Icon />
              <span className="text-xs font-medium truncate">{mobileLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}