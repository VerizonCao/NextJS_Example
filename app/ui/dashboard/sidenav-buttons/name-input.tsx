"use client";

import { useState, useEffect } from 'react';
import { updateUserPreferredNameAction, getUserPreferredNameAction } from '@/app/lib/actions';

export default function NameInput({ 
  userName, 
  className,
  userEmail 
}: { 
  userName: string; 
  className: string;
  userEmail: string;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [preferredName, setPreferredName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreferredName = async () => {
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

    const { success, message } = await updateUserPreferredNameAction(userEmail, preferredName.trim());
    
    if (success) {
      setDisplayName(preferredName.trim());
      setIsEditingName(false);
      setError(null);
    } else {
      setError(message);
    }
  };

  if (isEditingName) {
    return (
      <form onSubmit={handleNameSubmit} className="flex items-center">
        <input
          type="text"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-[#1d1d1e] text-white"
          placeholder="Enter preferred name"
          autoFocus
          onBlur={handleNameSubmit}
        />
        {error && (
          <span className="text-red-500 text-xs ml-2">{error}</span>
        )}
      </form>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${className} animate-pulse`}>
        <div className="h-4 w-20 bg-gray-600 rounded"></div>
      </div>
    );
  }

  return (
    <button
      onClick={handleNameClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${className}`}
    >
      {displayName}
    </button>
  );
} 