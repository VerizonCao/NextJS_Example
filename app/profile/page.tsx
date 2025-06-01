'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserPreferredNameAction, getUserPreferredNameAction } from '@/app/lib/actions';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [preferredName, setPreferredName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const userName = session?.user?.name || session?.user?.email || '';
  const userEmail = session?.user?.email || '';

  useEffect(() => {
    const fetchPreferredName = async () => {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      const { success, preferredName, message } = await getUserPreferredNameAction(userEmail);
      if (success && preferredName) {
        setDisplayName(preferredName);
        setPreferredName(preferredName);
      } else {
        // If no preferred name exists, use the auth session name
        setDisplayName(userName);
        setPreferredName(userName);
      }
      setIsLoading(false);
    };

    fetchPreferredName();
  }, [userEmail, userName]);

  const handleNameClick = () => {
    setIsEditingName(true);
    setError(null);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (!userEmail) {
      setError('No user email available');
      return;
    }

    const { success, message } = await updateUserPreferredNameAction(userEmail, preferredName.trim());
    
    if (success) {
      setDisplayName(preferredName.trim());
      setIsEditingName(false);
      setError(null);
    } else {
      setError(message);
    }
  };

  const handleCancel = () => {
    setIsEditingName(false);
    setPreferredName(displayName);
    setError(null);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#121214] flex items-center justify-center">
        <div className="text-white text-xl">Please log in to view your profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-3xl font-bold mb-8">Profile</h1>
        
        <div className="bg-[#1a1a1e] rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">
              Display Name
            </label>
            
            {isEditingName ? (
              <form onSubmit={handleNameSubmit} className="flex items-center gap-4">
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-[#222327] rounded-xl border border-solid border-[#d2d5da40] text-white placeholder:text-[#535a65]"
                  placeholder="Enter preferred name"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5856d6] hover:bg-[#3c34b5] text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-[#2a2a2e] hover:bg-[#3a3a3e] text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <div className="h-10 w-40 bg-gray-600 rounded animate-pulse"></div>
                ) : (
                  <div className="flex-1 px-4 py-2 bg-[#222327] rounded-xl text-white text-sm">
                    {displayName}
                  </div>
                )}
                <button
                  onClick={handleNameClick}
                  className="px-4 py-2 bg-[#5856d6] hover:bg-[#3c34b5] text-white rounded-xl text-sm font-medium transition-colors"
                  disabled={isLoading}
                >
                  Edit
                </button>
              </div>
            )}
            
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <div className="px-4 py-2 bg-[#222327] rounded-xl text-gray-400 text-sm">
              {userEmail}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 