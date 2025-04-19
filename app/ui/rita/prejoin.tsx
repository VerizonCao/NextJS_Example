'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface CustomPreJoinProps {
  returnPath?: string;
  presignedUrl?: string;
}

export function CustomPreJoin({ returnPath = '/', presignedUrl }: CustomPreJoinProps) {
  const router = useRouter();

  const handleLeave = () => {
    router.push(returnPath);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative w-full max-w-2xl flex flex-col items-center gap-6">
        {/* Avatar image */}
        {presignedUrl && (
          <div className="w-full aspect-square max-w-[500px]">
            <img 
              src={presignedUrl} 
              alt="Agent Avatar" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}

        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Leave
        </button>

        {/* Waiting message */}
        <div className="flex items-center justify-center gap-3">
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white text-lg font-medium">Waiting for agent to join...</p>
        </div>
      </div>
    </div>
  );
}