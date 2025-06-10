import { loadPaginatedPublicAvatarsActionOptimized } from '@/app/lib/actions';
import HomeCharacters from '@/app/home/components/home-characters';
import LayoutWithNavBar from '@/app/home/tab/layout-with-navbar';
import { auth } from '@/auth';
import { Suspense } from 'react';

// This makes the page use ISR and revalidate every 60 seconds
export const revalidate = 60;

function LoadingState() {
  return (
    <div className="bg-[#121214] min-h-screen w-full flex items-center justify-center">
      <div className="text-white">Preparing character...</div>
    </div>
  );
}

export default async function RitaStreamingPage() {
  const session = await auth();
  
  // Load first 30 public avatars using the optimized action (includes batch presigned URLs)
  const publicAvatarsResult = await loadPaginatedPublicAvatarsActionOptimized(0, 30, '', 'score', 'all', 'all');
  
  // Process avatars to ensure proper date formatting
  const processedAvatars = publicAvatarsResult.avatars?.map((avatar: any) => ({
    ...avatar,
    create_time: new Date(avatar.create_time)
  })) || [];

  // Create a result object that matches the expected format
  const publicResult = {
    success: publicAvatarsResult.success,
    avatars: processedAvatars,
    message: publicAvatarsResult.message
  };

  return (
    <LayoutWithNavBar className="bg-[#121214]">
      <Suspense fallback={<LoadingState />}>
        <HomeCharacters 
          initialAvatars={publicResult}
        />
      </Suspense>
    </LayoutWithNavBar>
  );
}
