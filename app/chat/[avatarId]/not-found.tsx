import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-80px)] gap-8 py-6">
            
            {/* Placeholder for missing image */}
            <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 shadow-lg flex-shrink-0 flex items-center justify-center">
              <div className="text-gray-500 text-6xl">?</div>
            </div>
            
            {/* Not Found Card */}
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                <CardContent className="flex flex-col justify-center items-center h-full p-4 lg:p-[15.12px] text-center">
                  
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col gap-4">
                      <h1 className="text-6xl lg:text-7xl font-bold text-white">404</h1>
                      <h2 className="text-2xl lg:text-3xl font-semibold text-white">Avatar Not Found</h2>
                      <p className="text-gray-400 text-base lg:text-lg max-w-md">
                        The avatar you're looking for doesn't exist or has been removed.
                      </p>
                    </div>
                    
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