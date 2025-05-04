import { loadPublicAvatars, getPresignedUrl, loadUserAvatars } from '@/app/lib/actions';
import HomepageAvatars from './homepage-avatars';
import { auth } from '@/auth';

// This makes the page use ISR and revalidate every 60 seconds
export const revalidate = 60;

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
    <HomepageAvatars 
      initialAvatars={{ ...publicResult, avatars: publicAvatars }}
      userAvatars={userAvatars}
    />
  );
}
