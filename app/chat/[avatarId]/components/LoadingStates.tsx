import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
      <div className="flex flex-row justify-center w-full">
        <div className="w-full relative">
          <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
            <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-80px)] gap-8 py-6">
              
              {/* Loading video placeholder */}
              <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 animate-pulse shadow-lg flex-shrink-0 flex items-center justify-center">
              </div>
              
              {/* Loading placeholder for card */}
              <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                <div className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                  <div className="flex flex-col justify-center items-center h-full p-4 animate-pulse">
                    <div className="flex flex-col items-center gap-6">
                      <div className="h-8 w-8 bg-gray-700 rounded-full animate-spin" />
                      <div className="h-6 bg-gray-700 rounded w-48" />
                      <div className="h-4 bg-gray-700 rounded w-64" />
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

  // Regular loading
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-80px)] gap-8 py-6">
            
            {/* Loading placeholder for image */}
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 animate-pulse shadow-lg flex-shrink-0" />
            
            {/* Loading placeholder for card */}
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <div className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                <div className="flex flex-col h-full p-4 lg:p-[15.12px]">
                  
                  {/* Top Section */}
                  <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-1 min-h-0">
                    
                    {/* Profile Header Skeleton */}
                    <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-shrink-0 animate-pulse">
                      <div className="flex items-center gap-4 lg:gap-[15.12px]">
                        <div className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] bg-gray-700 rounded-full flex-shrink-0" />
                        <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1 min-w-0">
                          <div className="h-5 bg-gray-700 rounded w-3/4" />
                          <div className="h-4 bg-gray-700 rounded w-full" />
                        </div>
                      </div>
                      <div className="w-full h-px bg-gray-700" />
                    </div>

                    {/* About Section Skeleton */}
                    <div className="flex flex-col gap-4 lg:gap-[16.2px] animate-pulse">
                      <div className="h-6 bg-gray-700 rounded w-1/4" />
                      
                      <div className="space-y-4">
                        <div>
                          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                          <div className="h-3 bg-gray-700 rounded mb-1" />
                          <div className="h-3 bg-gray-700 rounded w-5/6" />
                        </div>
                        
                        <div>
                          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                          <div className="h-3 bg-gray-700 rounded mb-1" />
                          <div className="h-3 bg-gray-700 rounded w-4/5" />
                        </div>
                        
                        <div>
                          <div className="h-4 bg-gray-700 rounded w-1/5 mb-2" />
                          <div className="h-3 bg-gray-700 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section Skeleton */}
                  <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0 animate-pulse">
                    <div className="flex flex-col text-center gap-2">
                      <div className="h-6 bg-gray-700 rounded w-48 mx-auto" />
                      <div className="h-4 bg-gray-700 rounded w-64 mx-auto" />
                    </div>
                    <div className="h-10 bg-gray-700 rounded w-32" />
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

export function Error({ error, avatarName }: ErrorProps) {
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-80px)] gap-8 py-6">
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 shadow-lg flex-shrink-0 flex items-center justify-center">
              <div className="text-gray-500 text-6xl">?</div>
            </div>
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                <CardContent className="flex flex-col justify-center items-center h-full p-4 text-center">
                  <div className="flex flex-col items-center gap-6">
                    <h1 className="text-4xl font-bold text-white">Error</h1>
                    <p className="text-gray-400 text-lg">{error}</p>
                    <Link href="/">
                      <Button className="bg-[#5856d6] hover:bg-[#3c34b5] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
                        Return to Home
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function VideoPreparingState({ avatarName }: { avatarName: string }) {
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-80px)] gap-8 py-6">
            
            {/* Character Image Placeholder */}
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 shadow-lg flex-shrink-0" />
            
            {/* Loading Card */}
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                <CardContent className="flex flex-col justify-center items-center h-full p-4 text-center">
                  
                  <div className="flex flex-col items-center gap-6">
                    {/* Loading Spinner */}
                    <div className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 