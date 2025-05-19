import { loadPublicAvatars, getPresignedUrl, loadUserAvatars } from '@/app/lib/actions';
import HomepageAvatars from './homepage-avatars';
import { auth } from '@/auth';
import { Suspense } from 'react';

// This makes the page use ISR and revalidate every 60 seconds
export const revalidate = 60;

function LoadingState() {
  // return (
  //   <div className="flex flex-col items-center gap-6 p-6">
  //     <div className="animate-pulse w-full max-w-7xl">
  //       <div className="h-8 w-48 bg-gray-700 rounded mb-4"></div>
  //       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  //         {[...Array(8)].map((_, i) => (
  //           <div key={i} className="flex flex-col gap-2">
  //             <div className="aspect-square bg-gray-700 rounded-lg"></div>
  //             <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
  //           </div>
  //         ))}
  //       </div>
  //     </div>
  //   </div>
  // );
  return null;
}

export default async function RitaStreamingPage() {
  const session = await auth();
  
  // Load public avatars
  const publicResult = await loadPublicAvatars();
  const publicAvatars = await Promise.all(
    (publicResult.avatars ?? []).map(async (avatar) => {
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

  // Load user avatars if logged in
  let userAvatars = null;
  if (session?.user?.email) {
    const userResult = await loadUserAvatars(session.user.email);
    if (userResult.success && userResult.avatars) {
      userAvatars = await Promise.all(
        userResult.avatars.map(async (avatar) => {
          if (avatar.image_uri) {
            try {
              const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
              return {
                ...avatar,
                create_time: new Date(avatar.create_time),
                presignedUrl
              };
            } catch (error) {
              console.error(`Failed to get presigned URL for avatar ${avatar.avatar_id}:`, error);
              return avatar;
            }
          }
          return avatar;
        })
      );
      userAvatars = { ...userResult, avatars: userAvatars };
    } else {
      userAvatars = userResult;
    }
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <HomepageAvatars 
        initialAvatars={{ ...publicResult, avatars: publicAvatars }}
        userAvatars={userAvatars}
      />
    </Suspense>
  );
}
