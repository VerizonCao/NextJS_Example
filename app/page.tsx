import { loadPaginatedPublicAvatarsAction, getPresignedUrl } from '@/app/lib/actions';
import HomepageAvatars from '@/app/dashboard/homepage-avatars';
import { auth } from '@/auth';
import { Suspense } from 'react';

// This makes the page use ISR and revalidate every 60 seconds
export const revalidate = 60;

function LoadingState() {
  return null;
}

export default async function RitaStreamingPage() {
  const session = await auth();
  
  // Load first 20 public avatars using the new pagination function
  const publicAvatarsResult = await loadPaginatedPublicAvatarsAction(0, 20);
  const processedPublicAvatars = await Promise.all(
    (publicAvatarsResult.avatars ?? []).map(async (avatar: any) => {
      if (!avatar.image_uri) return avatar;
      try {
        const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
        return { 
          ...avatar,
          create_time: new Date(avatar.create_time),
          presignedUrl 
        };
      } catch (e) {
        console.error(`Failed to get presigned URL for ${avatar.avatar_id}`, e);
        return avatar;
      }
    })
  );

  // Create a result object that matches the expected format
  const publicResult = {
    success: true,
    avatars: processedPublicAvatars,
    message: 'Public avatars loaded successfully'
  };

  return (
    <Suspense fallback={<LoadingState />}>
      <HomepageAvatars 
        initialAvatars={publicResult}
      />
    </Suspense>
  );
}
