import { loadPublicAvatars, getPresignedUrl } from '@/app/lib/actions';
import HomepageAvatars from './homepage-avatars';

// Define category data for mapping
const categories = [
  { name: "Girl", color: "#7e8dc8" },
  { name: "OC", color: "#837ec8" },
  { name: "BlueArchive", color: "#c8917e" },
  { name: "fanart", color: "#7ec8bb" },
  { name: "VTuber", color: "#c8b87e" },
  { name: "NEWGAME!", color: "#c87e92" },
  { name: "Helltaker", color: "#c8807e" },
  { name: "Ghost", color: "#ba7ec8" },
];

export const dynamic = 'force-dynamic';

export default async function RitaStreamingPage() {
  const result = await loadPublicAvatars();

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
          <HomepageAvatars initialAvatars={{ ...result, avatars: avatarUrls }} categories={categories} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-full">
        <HomepageAvatars initialAvatars={result} categories={categories} />
      </div>
    </div>
  );
}