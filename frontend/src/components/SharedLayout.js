import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const RecipeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M18 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M18 16v.01"></path><path d="M18 20v.01"></path></svg>;
const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

// Add this new icon component for Pantry
const PantryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M19 11V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" />
    <path d="M6 11h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
    <path d="M10 11V9" />
    <path d="M14 11V9" />
  </svg>
);

export default function SharedLayout({ profile, onLogout, userToken }) {
  console.log('SharedLayout render - profile:', !!profile, 'userToken:', !!userToken);
  
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [selectedHomeId, setSelectedHomeId] = useState(profile?.primaryHomeId);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const navLinkClasses = "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors";
  const activeClasses = "bg-orange-100 text-orange-700 font-semibold";
  const inactiveClasses = "text-gray-600 hover:bg-orange-50 hover:text-orange-600";
  
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
      icon: HomeIcon 
    },
    { 
      name: 'Pantry', 
      path: '/pantry', 
      icon: PantryIcon 
    },
    { 
      name: 'Recipe Generator', 
      path: '/recipe-generator', 
      icon: RecipeIcon 
    },
    { 
      name: 'Home Admin', 
      path: '/home-admin', 
      icon: AdminIcon 
    }
  ];

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-800">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="font-bold text-xl text-orange-600">HomeHelper</div>
              
              {/* Home Selector Dropdown */}
              {profile?.homes && profile.homes.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">{currentHome?.name || 'Select Home'}</span>
                    <ChevronDownIcon />
                  </button>
                  
                  {showHomeDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        {profile.homes.map(home => (
                          <button
                            key={home.id}
                            onClick={() => handleHomeChange(home.id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between group"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{home.name}</div>
                              <div className="text-xs text-gray-500">Role: {home.role}</div>
                            </div>
                            {selectedHomeId === home.id && <CheckIcon />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <nav className="hidden md:flex items-center gap-2">
                {navigation.map(({ name, path, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}
                    end
                  >
                    <Icon /> {name}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-800">{profile.name}</p>
                <p className="text-gray-600 text-sm">{profile?.email}</p>
              </div>
              <button onClick={onLogout} className="bg-white px-4 py-2 rounded-lg shadow font-semibold text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet context={outletContext} />
      </main>

      {/* Bottom navigation for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-t-md flex justify-around py-2">
          {navigation.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `flex flex-col items-center gap-1 text-xs ${isActive ? 'text-orange-600' : 'text-gray-500'}`}
              end
            >
              <Icon /> {name}
            </NavLink>
          ))}
      </nav>
    </div>
  );
}