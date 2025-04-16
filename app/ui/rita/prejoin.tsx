'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface CustomPreJoinProps {
  onLeave?: () => void;
}

export function CustomPreJoin({ onLeave }: CustomPreJoinProps) {
  const router = useRouter();

  const handleLeave = () => {
    if (onLeave) {
      onLeave();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Waiting for agent banner at the top */}
      <div className="w-full p-4 bg-blue-600 text-white text-center relative">
        <button
          onClick={handleLeave}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Leave
        </button>
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium">Waiting for agent to join...</p>
        </div>
        <p className="text-sm mt-1 opacity-80">You will be automatically connected when the agent is ready.</p>
      </div>
      
      <div className="p-8">
        <div className="bg-gray-50 p-6 rounded-lg flex flex-col justify-center">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Room Information</h3>
          <p className="text-gray-600 mb-4">
            You are about to join a video conference room. The agent will join shortly.
          </p>
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Tips:</h4>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Find a quiet, well-lit location</li>
              <li>Make sure your microphone is working</li>
              <li>Close other applications that might use your microphone</li>
              <li>Use headphones to prevent echo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}