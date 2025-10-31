import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../contexts/ToastContext';
import logger from '../utils/logger';

// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;

const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;

const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;

const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;

export default function ManagePage() {
  const context = useOutletContext();
  const { userToken, activeHomeId, profile, refreshProfile, currentHome } = context || {};
  const { theme, toggleTheme, isDark } = useTheme();
  const { showSuccess, showError } = useToast();

  // User Management state
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isUpdatingUserName, setIsUpdatingUserName] = useState(false);

  // Home Management state
  const [isEditingHomeName, setIsEditingHomeName] = useState(false);
  const [newHomeName, setNewHomeName] = useState('');
  const [isUpdatingHomeName, setIsUpdatingHomeName] = useState(false);
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Permissions
  const [isAdmin, setIsAdmin] = useState(false);

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  }), [userToken]);

  // Determine if user is admin
  useEffect(() => {
    if (profile && profile.homes && activeHomeId) {
      const home = profile.homes.find(h => h.id === activeHomeId);
      setIsAdmin(home?.role === 'admin');
    }
  }, [profile, activeHomeId]);

  // Fetch members
  useEffect(() => {
    if (!userToken || !activeHomeId) {
      setIsLoadingMembers(false);
      return;
    }

    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const response = await fetch(`/api/homes/${activeHomeId}/members`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch members.');
        const data = await response.json();
        setMembers(data);
      } catch (err) {
        logger.error('Error fetching members:', err);
        showError('Failed to load home members');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [userToken, activeHomeId, getAuthHeaders, showError]);

  // Initialize form values when profile changes
  useEffect(() => {
    if (profile?.name) {
      setNewUserName(profile.name);
    }
  }, [profile?.name]);

  useEffect(() => {
    if (currentHome?.name) {
      setNewHomeName(currentHome.name);
    }
  }, [currentHome?.name]);

  // ===== USER MANAGEMENT HANDLERS =====
  const handleUpdateUserName = async () => {
    if (!newUserName.trim() || newUserName.trim() === profile?.name) {
      setIsEditingUserName(false);
      return;
    }

    setIsUpdatingUserName(true);
    try {
      const response = await fetch('/api/user/me', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newUserName.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update name');
      }

      showSuccess('Name updated successfully');

      // Refresh profile if available
      if (refreshProfile) {
        await refreshProfile(userToken);
      }

      setIsEditingUserName(false);
    } catch (err) {
      logger.error('Error updating user name:', err);
      showError(err.message);
      setNewUserName(profile?.name || '');
    } finally {
      setIsUpdatingUserName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showSuccess('Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      showError('Failed to logout');
    }
  };

  // ===== HOME MANAGEMENT HANDLERS =====
  const handleUpdateHomeName = async () => {
    if (!newHomeName.trim() || newHomeName.trim() === currentHome?.name) {
      setIsEditingHomeName(false);
      return;
    }

    setIsUpdatingHomeName(true);
    try {
      const response = await fetch(`/api/homes/${activeHomeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newHomeName.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update home name');
      }

      showSuccess('Home name updated successfully');

      // Refresh profile if available
      if (refreshProfile) {
        await refreshProfile(userToken);
      }

      setIsEditingHomeName(false);
    } catch (err) {
      logger.error('Error updating home name:', err);
      showError(err.message);
      setNewHomeName(currentHome?.name || '');
    } finally {
      setIsUpdatingHomeName(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setIsInviting(true);
    try {
      const response = await fetch(`/api/homes/${activeHomeId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: newMemberEmail.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          showError('User not found. They must create an account first.');
        } else {
          showError(data.error || 'Failed to invite member');
        }
        return;
      }

      setMembers(prev => [...prev, data]);
      setNewMemberEmail('');
      showSuccess(`Added ${newMemberEmail.trim()} to home`);
    } catch (err) {
      logger.error('Error inviting member:', err);
      showError('An unexpected error occurred');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = useCallback(async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this home?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/homes/${activeHomeId}/members/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
      showSuccess(`Removed ${memberName} from home`);
    } catch (err) {
      logger.error('Error removing member:', err);
      showError(err.message);
    }
  }, [activeHomeId, getAuthHeaders, showSuccess, showError]);

  // Handle missing context
  if (!context) {
    return (
      <div className="section-padding">
        <div className="container-mobile">
          <p className="text-color-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-4xl">
        {/* Page Header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-color-primary">
            ⚙️ Manage
          </h1>
          <p className="text-color-muted">
            Manage your profile, home settings, and preferences
          </p>
        </div>

        {/* ===== SECTION 1: USER MANAGEMENT ===== */}
        <div className="card mb-6">
          <div className="p-6 border-b border-color-light">
            <div className="flex items-center gap-2 mb-1">
              <UserIcon />
              <h2 className="text-lg font-semibold text-color-primary">
                User Management
              </h2>
            </div>
            <p className="text-sm text-color-secondary">
              Update your personal information and account settings
            </p>
          </div>

          {/* User Name */}
          <div className="p-6 border-b border-color-light">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-color-primary">Display Name</h3>
              {!isEditingUserName && (
                <button
                  onClick={() => setIsEditingUserName(true)}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors icon-color-primary bg-tertiary"
                >
                  <EditIcon />
                  Edit
                </button>
              )}
            </div>

            {isEditingUserName ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="input-base focus-ring w-full"
                  placeholder="Enter your name"
                  disabled={isUpdatingUserName}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateUserName}
                    disabled={isUpdatingUserName}
                    className="btn-base btn-primary flex-1"
                  >
                    {isUpdatingUserName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingUserName(false);
                      setNewUserName(profile?.name || '');
                    }}
                    disabled={isUpdatingUserName}
                    className="btn-base btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg text-color-secondary">
                {profile?.name || 'Not set'}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="p-6 border-b border-color-light">
            <h3 className="font-medium mb-2 text-color-primary">Email</h3>
            <p className="text-lg text-color-secondary">
              {profile?.email}
            </p>
          </div>

          {/* Logout */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1 text-color-primary">
                  Logout from Roscoe
                </h3>
                <p className="text-sm text-color-muted">
                  Sign out of your account
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-base btn-error font-semibold px-6 py-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ===== SECTION 2: HOME MANAGEMENT (Admin Only) ===== */}
        {isAdmin && (
          <div className="card mb-6">
            <div className="p-6 border-b border-color-light">
              <div className="flex items-center gap-2 mb-1">
                <HomeIcon />
                <h2 className="text-lg font-semibold text-color-primary">
                  Home Management
                </h2>
              </div>
              <p className="text-sm text-color-secondary">
                Manage your home settings and members
              </p>
            </div>

            {/* Home Name */}
            <div className="p-6 border-b border-color-light">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-color-primary">Home Name</h3>
                {!isEditingHomeName && (
                  <button
                    onClick={() => setIsEditingHomeName(true)}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors icon-color-primary bg-tertiary"
                  >
                    <EditIcon />
                    Edit
                  </button>
                )}
              </div>

              {isEditingHomeName ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newHomeName}
                    onChange={(e) => setNewHomeName(e.target.value)}
                    className="input-base focus-ring w-full"
                    placeholder="Enter home name"
                    disabled={isUpdatingHomeName}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateHomeName}
                      disabled={isUpdatingHomeName}
                      className="btn-base btn-primary flex-1"
                    >
                      {isUpdatingHomeName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingHomeName(false);
                        setNewHomeName(currentHome?.name || '');
                      }}
                      disabled={isUpdatingHomeName}
                      className="btn-base btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-color-secondary">
                  {currentHome?.name || 'Not set'}
                </p>
              )}
            </div>

            {/* Add Member */}
            <div className="p-6 border-b border-color-light">
              <h3 className="font-medium mb-4 text-color-primary">
                Add New Member
              </h3>
              <form onSubmit={handleInviteMember} className="flex gap-3">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 input-base focus-ring"
                  placeholder="Enter email address"
                  required
                />
                <button
                  type="submit"
                  disabled={isInviting}
                  className="btn-base btn-primary px-6"
                >
                  {isInviting ? 'Adding...' : 'Add'}
                </button>
              </form>
            </div>

            {/* Members List */}
            <div className="p-6">
              <h3 className="font-medium mb-4 text-color-primary">
                Home Members
              </h3>

              {isLoadingMembers ? (
                <div className="text-center py-4">
                  <p className="text-color-muted">Loading members...</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {members.map(member => (
                    <li
                      key={member.id}
                      className="flex justify-between items-center p-4 rounded-lg bg-tertiary"
                    >
                      <div>
                        <p className="font-medium mb-1 text-color-primary">
                          {member.name}
                          <span
                            className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: member.role === 'admin' ? 'var(--color-primary-light)' : 'var(--bg-secondary)',
                              color: member.role === 'admin' ? 'var(--color-primary)' : 'var(--text-muted)'
                            }}
                          >
                            {member.role}
                          </span>
                        </p>
                        <p className="text-sm text-color-muted">
                          {member.email}
                        </p>
                      </div>
                      {member.role !== 'admin' && member.id !== profile?.uid && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="btn-base btn-error text-sm font-semibold px-4 py-2"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ===== SECTION 3: SETTINGS ===== */}
        <div className="card">
          <div className="p-6 border-b border-color-light">
            <div className="flex items-center gap-2 mb-1">
              <SettingsIcon />
              <h2 className="text-lg font-semibold text-color-primary">
                Settings
              </h2>
            </div>
            <p className="text-sm text-color-secondary">
              Customize your app experience
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1 text-color-primary">
                  Appearance
                </h3>
                <p className="text-sm text-color-muted">
                  Switch between light and dark mode
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="btn-base flex items-center gap-2 px-4 py-2 bg-tertiary text-color-primary"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
