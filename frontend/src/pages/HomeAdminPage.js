import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import logger from '../utils/logger';

export default function HomeAdminPage() {
  const context = useOutletContext();
  
  // Extract context values safely with defaults
  const userToken = context?.userToken;
  const activeHomeId = context?.activeHomeId;
  const profile = context?.profile;
  
  // Note: onLogout is passed as a prop to SharedLayout, need to access from parent
  // For now, we'll use a basic logout that clears Firebase auth
  
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  }), [userToken]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Firebase auth state change will be handled by the parent component
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  useEffect(() => {
    // Determine if the current user is an admin for the active home
    if (profile && profile.homes && activeHomeId) {
      const currentHome = profile.homes.find(home => home.id === activeHomeId);
      setIsAdmin(currentHome?.role === 'admin');
    }

    if (!userToken || !activeHomeId) {
        setIsLoading(false);
        return;
    };

    const fetchMembers = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/homes/${activeHomeId}/members`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch members.');
        }
        const data = await response.json();
        setMembers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [userToken, activeHomeId, profile, getAuthHeaders]);

  const handleRemoveMember = useCallback(async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
        return;
    }
    
    setError('');
    try {
        const response = await fetch(`/api/homes/${activeHomeId}/members/${memberId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to remove member.');
        }
        // Remove the member from the local state to update the UI instantly
        setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
    } catch (err) {
        setError(err.message);
    }
  }, [activeHomeId, getAuthHeaders]);

  // Add this new function to handle member invites
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setIsInviting(true);
    setInviteError('');

    try {
      const response = await fetch(`/api/homes/${activeHomeId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: newMemberEmail.trim() })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          setInviteError('User not found. They must create an account first.');
        } else {
          setInviteError(data.error || 'Failed to invite member');
        }
        return;
      }

      // Success case
      setMembers(prev => [...prev, data]);
      setNewMemberEmail(''); // Clear the input
    } catch (err) {
      setInviteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  // Handle missing context gracefully - after all hooks
  if (!context) {
    return <div className="section-padding"><div className="container-mobile"><p style={{ color: 'var(--text-secondary)' }}>Loading...</p></div></div>;
  }

  if (isLoading) {
    return (
      <div className="section-padding">
        <div className="container-mobile">
          <div className="text-center py-8">
            <div className="animate-pulse mb-4">
              <div className="animate-shimmer h-8 rounded w-1/3 mx-auto mb-4"></div>
              <div className="animate-shimmer h-4 rounded w-1/2 mx-auto"></div>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading members...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-padding">
        <div className="container-mobile">
          <div className="p-4 rounded-lg" style={{ 
            backgroundColor: 'var(--color-error-light)', 
            borderLeft: '4px solid var(--color-error)',
            color: 'var(--color-error)' 
          }}>
            <p><strong>Error:</strong> {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="section-padding">
        <div className="container-mobile">
          <div className="p-4 rounded-lg" style={{ 
            backgroundColor: 'var(--color-warning-light)', 
            borderLeft: '4px solid var(--color-warning)',
            color: 'var(--color-warning)' 
          }}>
            <p className="font-bold">Admin Access Required</p>
            <p>You do not have permission to manage this home.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-4xl">
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>🏠 Home Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage members and settings for your home.</p>
        </div>

        {/* Add Member Form */}
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Member</h3>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  id="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 input-base focus-ring"
                  placeholder="Enter email address"
                  required
                />
                <button
                  type="submit"
                  disabled={isInviting}
                  className="btn-base btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isInviting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
            {inviteError && (
              <div className="mt-4 p-3 rounded-lg" style={{ 
                backgroundColor: 'var(--color-error-light)', 
                borderLeft: '4px solid var(--color-error)',
                color: 'var(--color-error)' 
              }}>
                <p className="text-sm">{inviteError}</p>
              </div>
            )}
          </form>
        </div>

        {/* Members List */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold p-6" style={{ 
            color: 'var(--text-primary)',
            borderBottom: '1px solid var(--border-light)'
          }}>Home Members</h3>
          <ul style={{ borderColor: 'var(--border-light)' }} className="divide-y">
            {members.map(member => (
              <li key={member.id} className="p-6 flex justify-between items-center">
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {member.name}
                    <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full" style={{
                      backgroundColor: member.role === 'admin' ? 'var(--color-primary-light)' : 'var(--bg-secondary)',
                      color: member.role === 'admin' ? 'var(--color-primary)' : 'var(--text-muted)'
                    }}>
                      {member.role}
                    </span>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
                </div>
                {member.role !== 'admin' && member.id !== profile?.uid && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="btn-base text-sm font-semibold px-3 py-1"
                    style={{
                      backgroundColor: 'var(--color-error)',
                      color: 'white',
                      borderColor: 'var(--color-error)'
                    }}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Account Management */}
        <div className="card">
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Account Settings</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your account and logout options</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Logout from Roscoe</h4>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sign out of your account</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-base font-semibold px-6 py-2 border hover:bg-opacity-10 transition-colors"
                style={{ 
                  color: 'var(--color-error)', 
                  borderColor: 'var(--color-error)'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
