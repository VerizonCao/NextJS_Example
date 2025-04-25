import { loadPublicAvatars, getPresignedUrl } from '@/app/lib/actions';
import HomepageAvatars from './homepage-avatars';

// This makes the page use ISR and revalidate every 60 seconds
export const revalidate = 60;

// Static category list
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

export default async function RitaStreamingPage() {
  const result = await loadPublicAvatars();

  const avatars = await Promise.all(
    (result.avatars ?? []).map(async (avatar) => {
      if (!avatar.image_uri) return avatar;
      try {
        const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
        return { ...avatar, presignedUrl };
      } catch (e) {
        console.error(`Failed to get presigned URL for ${avatar.avatar_id}`, e);
        return avatar;
      }
    })
  );

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-full">
        <HomepageAvatars initialAvatars={{ ...result, avatars }} categories={categories} />
      </div>
    </div>
  );
}
