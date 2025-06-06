import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChatControlWrapper } from './ChatControls';

interface LoadingProps {
  isVideoMode?: boolean;
}

interface ErrorProps {
  error: string;
  avatarName?: string;
}

export function Loading({ isVideoMode = false }: LoadingProps) {
  if (isVideoMode) {
    return (
      <div className="bg-[#222433] min-h-screen w-full flex flex-row justify-center">
        <div className="w-full relative">
          <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0 pl-64">
            <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-0 py-[15px]">
              
              {/* Loading video placeholder */}
              <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                <div className="w-full h-full rounded-l-[5px] bg-gray-800 animate-pulse shadow-lg flex items-center justify-center">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Loading placeholder for chat */}
              <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
                <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
                  <div className="flex flex-col justify-center items-center h-full p-4 animate-pulse">
                    <div className="flex flex-col items-center gap-6">
                      <div className="h-8 w-8 bg-white/20 rounded-full animate-spin" />
                      <div className="h-6 bg-white/20 rounded w-48" />
                      <div className="h-4 bg-white/20 rounded w-64" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Regular loading - Updated to match simplified design
  return (
    <div className="bg-[#222433] min-h-screen w-full flex flex-row justify-center">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0 pl-64">
          <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-0 py-[15px]">
            
            {/* Loading placeholder for image */}
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-l-[5px] bg-gray-800 animate-pulse shadow-lg flex-shrink-0" />
            
            {/* Loading placeholder for card */}
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
              <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
                <div className="flex flex-col h-full p-4 lg:p-[15.12px]">
                  
                  {/* Profile Header Skeleton */}
                  <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-shrink-0 animate-pulse">
                    <div className="flex items-center gap-4 lg:gap-[15.12px]">
                      <div className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] bg-white/20 rounded-full flex-shrink-0" />
                      <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1 min-w-0">
                        <div className="h-5 bg-white/20 rounded w-3/4" />
                        <div className="h-4 bg-white/20 rounded w-full" />
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/20" />
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 min-h-0"></div>

                  {/* Bottom Section Skeleton - Using shared ChatControlWrapper */}
                  <ChatControlWrapper className="border-t border-white/20">
                    <div className="flex items-center justify-center w-full h-full px-4 animate-pulse">
                      <div className="h-8 bg-white/20 rounded-full w-full" />
                    </div>
                  </ChatControlWrapper>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function Error({ error, avatarName }: ErrorProps) {
  return (
    <div className="bg-[#222433] min-h-screen w-full flex flex-row justify-center">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0 pl-64">
          <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-8 py-[15px]">
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 shadow-lg flex-shrink-0 flex items-center justify-center">
              <div className="text-gray-500 text-6xl">?</div>
            </div>
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-[5px] border border-white/10 overflow-hidden">
                <div className="flex flex-col justify-center items-center h-full p-4 text-center">
                  <div className="flex flex-col items-center gap-6">
                    <h1 className="text-4xl font-bold text-white drop-shadow-lg">Error</h1>
                    <p className="text-white/80 text-lg drop-shadow-md">{error}</p>
                    <Link href="/">
                      <Button className="bg-[#5856d6] hover:bg-[#3c34b5] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors drop-shadow-md">
                        Return to Home
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function VideoPreparingState({ avatarName }: { avatarName: string }) {
  return (
    <div className="bg-[#222433] min-h-screen w-full flex flex-row justify-center">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0 pl-64">
          <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-8 py-[15px]">
            
            {/* Character Image Placeholder */}
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 shadow-lg flex-shrink-0" />
            
            {/* Loading Card */}
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-[5px] border border-white/10 overflow-hidden">
                <div className="flex flex-col justify-center items-center h-full p-4 text-center">
                  
                  <div className="flex flex-col items-center gap-6">
                    {/* Loading Spinner */}
                    <div className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 