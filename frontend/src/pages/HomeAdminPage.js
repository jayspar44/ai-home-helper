import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { auth } from '../firebase';

export default function HomeAdminPage() {
  const context = useOutletContext();
  
  // Extract context values safely with defaults
  const userToken = context?.userToken;
  const activeHomeId = context?.activeHomeId;
  const profile = context?.profile;
  
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
    return <div className="container mx-auto px-4 py-8"><p>Loading...</p></div>;
  }

  if (isLoading) {
    return <p>Loading members...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!isAdmin) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg">
        <p className="font-bold">Admin Access Required</p>
        <p>You do not have permission to manage this home.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Home Management</h2>

        {/* Add Member Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Add New Member</h3>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="email"
                  id="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Enter email address"
                  required
                />
                <button
                  type="submit"
                  disabled={isInviting}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {isInviting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
            {inviteError && (
              <p className="mt-2 text-sm text-red-600">{inviteError}</p>
            )}
          </form>
        </div>

        {/* Members List */}
        <div className="bg-white shadow rounded-lg">
          <h3 className="text-lg font-semibold p-6 border-b">Home Members</h3>
          <ul className="divide-y divide-gray-200">
            {members.map(member => (
              <li key={member.id} className="p-6 flex justify-between items-center">
                <div>
                  <p className="font-semibold">
                    {member.name}
                    <span className={`ml-2 text-xs font-mono px-2 py-0.5 rounded-full ${
                      member.role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {member.role}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                {member.role !== 'admin' && member.id !== profile?.uid && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
