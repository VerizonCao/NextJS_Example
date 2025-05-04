'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CustomPreJoinProps {
  returnPath?: string;
  presignedUrl?: string;
  prompt?: string;
  scene?: string;
  bio?: string;
  avatar_name?: string;
}

export function CustomPreJoin({ 
  returnPath = '/', 
  presignedUrl,
  prompt,
  scene,
  bio,
  avatar_name
}: CustomPreJoinProps) {
  const router = useRouter();

  const handleLeave = () => {
    router.push(returnPath);
  };

  return (
    <div className="bg-[#121214] flex flex-row justify-center w-full h-full">
      <div className="bg-[#121214] w-full h-full relative">
        {/* Main Content */}
        <main className="flex flex-col w-full h-full items-center justify-center px-[390px] py-[25px]">
          <div className="flex items-center justify-center w-full">
            {/* Character Image */}
            {presignedUrl && (
              <div
                className="relative w-[525.42px] h-[937.44px] rounded-[5px] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${presignedUrl})`,
                }}
              />
            )}
            
            {/* Character Info Card */}
            <Card className="flex flex-col w-[613.7px] h-[937.44px] bg-[#1a1a1e] rounded-[5px] border-none">
              <CardContent className="flex flex-col justify-between h-full p-[15.12px]">
                {/* Top Section */}
                <div className="flex flex-col gap-[16.2px]">
                  {/* Profile Header */}
                  <div className="flex flex-col gap-[16.2px]">
                    <div className="flex items-center gap-[15.12px]">
                      {presignedUrl && (
                        <img
                          className="w-[68.04px] h-[68.04px] object-cover rounded-full"
                          alt="Avatar"
                          src={presignedUrl}
                        />
                      )}

                      <div className="flex flex-col gap-[7.56px] flex-1">
                        <h2 className="font-bold text-white text-[14.4px]">
                          {avatar_name || 'Unknown Avatar'}
                        </h2>
                        <p className="font-medium text-white text-[11.3px]">
                          {bio || 'No bio available'}
                        </p>
                      </div>
                    </div>

                    <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
                  </div>

                  {/* About Section */}
                  <div className="flex flex-col gap-[16.2px]">
                    <h3 className="font-bold text-white text-base">About</h3>

                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        Prompt
                      </h4>
                      <p className="font-medium text-white text-xs mt-2">
                        {prompt || 'No prompt available'}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white text-[12.6px]">
                        Scene
                      </h4>
                      <p className="font-medium text-white text-[10.8px] mt-2">
                        {scene || 'No scene prompt available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Section with Loading and Leave Button */}
                <div className="flex flex-col items-center gap-4">
                  {/* Loading Spinner */}
                  <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-white text-lg font-medium">Waiting for agent to join...</p>
                  </div>

                  {/* Leave Button */}
                  <button
                    onClick={handleLeave}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Leave
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}