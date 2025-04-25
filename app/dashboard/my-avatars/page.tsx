import { loadUserAvatars, getPresignedUrl } from '@/app/lib/actions';
import MyAvatars from '@/app/ui/rita/my-avatars';
import { auth } from '@/auth';

export const revalidate = 60; // Revalidate every minute

export default async function MyAvatarsPage() {
  const session = await auth();
  const result = await loadUserAvatars(session?.user?.email || '');

  // If we have avatars, fetch their presigned URLs
  if (result.success && result.avatars) {
    const avatarUrls = await Promise.all(
      result.avatars.map(async (avatar) => {
        if (avatar.image_uri) {
          try {
            const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
            return {
              ...avatar,
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

    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="w-full">
          <MyAvatars initialAvatars={{ ...result, avatars: avatarUrls }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-full">
        <MyAvatars initialAvatars={result} />
      </div>
    </div>
  );
}