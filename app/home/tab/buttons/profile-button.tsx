"use client";

import { useState, useEffect } from 'react';
import { getUserPreferredNameAction } from '@/app/lib/actions';
import Link from 'next/link';

export default function ProfileButton({ 
  userName, 
  className,
  userEmail 
}: { 
  userName: string; 
  className: string;
  userEmail: string;
}) {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreferredName = async () => {
      setIsLoading(true);
      const { success, preferredName, message } = await getUserPreferredNameAction(userEmail);
      if (success && preferredName) {
        setDisplayName(preferredName);
      } else {
        // If no preferred name exists, use the auth session name
        setDisplayName(userName);
      }
      setIsLoading(false);
    };

    fetchPreferredName();
  }, [userEmail, userName]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${className} animate-pulse`}>
        <div className="h-4 w-32 bg-gray-600 rounded"></div>
      </div>
    );
  }

  return (
    <Link
      href="/profile"
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${className} transition-colors`}
    >
      Profile - {displayName}
    </Link>
  );
} 