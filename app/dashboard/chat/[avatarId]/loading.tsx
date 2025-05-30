export default function Loading() {
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
            
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