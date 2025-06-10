'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserPreferredNameAction, getUserPreferredNameAction } from '@/app/lib/actions';
import CharacterGrid from './components/character-grid';
import { Edit2 } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [preferredName, setPreferredName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const userName = session?.user?.name || session?.user?.email || '';
  const userEmail = session?.user?.email || '';

  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }
      
      // Fetch preferred name
      setIsLoading(true);
      const { success, preferredName, message } = await getUserPreferredNameAction(userEmail);
      if (success && preferredName) {
        setDisplayName(preferredName);
        setPreferredName(preferredName);
      } else {
        setDisplayName(userName);
        setPreferredName(userName);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [userEmail, userName]);

  const handleEditClick = () => {
    setShowEditPopup(true);
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
      setShowEditPopup(false);
      setError(null);
    } else {
      setError(message);
    }
  };

  const handleCancel = () => {
    setShowEditPopup(false);
    setPreferredName(displayName);
    setError(null);
  };

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#121214] flex items-center justify-center">
        <div className="text-white text-xl">Please log in to view your profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214]">
      {/* Content wrapper that responds to navbar state */}
      <div className="ml-16 md:ml-64 transition-all duration-300">
        <div className="flex flex-col items-center px-8 py-12">
          {/* Profile Picture */}
          <div className="w-24 h-24 border border-solid border-[#d9d9d9] rounded-full bg-[#2a2a2e] flex items-center justify-center mb-6">
            <span className="text-white text-2xl font-medium">
              {getUserInitial(displayName)}
            </span>
          </div>

          {/* Display Name with Edit Icon */}
          <div className="flex items-center gap-3 mb-2">
            {isLoading ? (
              <div className="h-8 w-40 bg-gray-600 rounded-xl animate-pulse"></div>
            ) : (
              <h1 className="text-white text-xl font-semibold">
                {displayName}
              </h1>
            )}
            <button
              onClick={handleEditClick}
              className="text-[#8f9092] hover:text-white transition-colors rounded-xl p-1 hover:bg-[#ffffff1a]"
              disabled={isLoading}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Handle (User ID) */}
          <p className="text-[#8f9092] text-sm mb-12">
            @{userEmail}
          </p>

          {/* Character Grid - 50% width of container */}
          <div className="w-1/2">
            <CharacterGrid userEmail={userEmail} />
          </div>
        </div>
      </div>

      {/* Edit Popup */}
      {showEditPopup && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={handleCancel}
          />
          
          {/* Popup */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-[#1a1a1e] rounded-xl p-6 w-96 max-w-[90vw]">
              <h2 className="text-white text-xl font-semibold mb-6">Profile Settings</h2>
              
              <form onSubmit={handleNameSubmit}>
                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    className="w-full px-4 py-2 text-sm font-medium bg-[#222327] rounded-xl border border-solid border-[#d2d5da40] text-white placeholder:text-[#535a65]"
                    placeholder="Enter preferred name"
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">
                    Email
                  </label>
                  <div className="px-4 py-2 bg-[#222327] rounded-xl text-gray-400 text-sm">
                    {userEmail}
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm mb-4">{error}</p>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#5856d6] hover:bg-[#3c34b5] text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-[#2a2a2e] hover:bg-[#3a3a3e] text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 