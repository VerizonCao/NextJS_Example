'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { loadUserAvatars, getPresignedUrl } from '@/app/lib/actions';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';

// Loading component for images
function ImageLoading() {
  return (
    <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
  );
}

type UserAvatar = {
  avatar_id: string;
  avatar_name: string;
  image_uri: string | null;
  create_time: Date;
};

type MyAvatarsProps = {
  userEmail: string;
  globalSelectedAvatar: {id: string | number, type: 'rita' | 'my'} | null;
  setGlobalSelectedAvatar: React.Dispatch<React.SetStateAction<{id: string | number, type: 'rita' | 'my'} | null>>;
};

export default function MyAvatars({ userEmail, globalSelectedAvatar, setGlobalSelectedAvatar }: MyAvatarsProps) {
  const router = useRouter();
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setLoading(true);
        
        console.log('userEmail1', userEmail);
        const result = await loadUserAvatars(userEmail);
        
        if (result.success && result.avatars) {
          setAvatars(result.avatars);
          
          // Generate presigned URLs for each avatar
          const urls: Record<string, string> = {};
          for (const avatar of result.avatars) {
            if (avatar.image_uri) {
              try {
                const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
                urls[avatar.avatar_id] = presignedUrl;
              } catch (err) {
                console.error(`Failed to get presigned URL for avatar ${avatar.avatar_id}:`, err);
              }
            }
          }
          setAvatarUrls(urls);
        } else {
          setError(result.message || 'Failed to load avatars');
        }
      } catch (err) {
        console.error('Error fetching avatars:', err);
        setError('An error occurred while loading your avatars');
      } finally {
        setLoading(false);
      }
    };

    fetchAvatars();
  }, [userEmail]);

  const handleStream = async (avatarId: string, imageUri: string | null) => {
    if (!imageUri) {
      console.error('No image URI available for this avatar');
      return;
    }
    
    const roomName = generateRoomId();
    
    try {
      // await startStreamingSession("test", 60, roomName, imageUri);
      router.push(`/rooms/${roomName}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
      // You might want to show an error message to the user here
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">My Avatars</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative w-[220px] h-[320px] rounded-lg overflow-hidden">
                <ImageLoading />
              </div>
              <span className="mt-1 text-sm">Loading...</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">My Avatars</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (avatars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">My Avatars</h2>
        <div className="p-4 bg-gray-100 text-gray-700 rounded-lg">
          You don't have any avatars yet. Create one to get started!
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-semibold mb-4">My Avatars</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {avatars.map((avatar) => (
          <div 
            key={avatar.avatar_id} 
            className="flex flex-col items-center"
          >
            <div 
              className={`relative w-[220px] h-[320px] rounded-lg overflow-hidden cursor-pointer ${globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' ? null : {id: avatar.avatar_id, type: 'my'})}
            >
              {avatarUrls[avatar.avatar_id] ? (
                <Image
                  src={avatarUrls[avatar.avatar_id]}
                  alt={avatar.avatar_name}
                  fill
                  sizes="220px"
                  loading={globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' ? "eager" : "lazy"}
                  className="object-cover"
                />
              ) : (
                <ImageLoading />
              )}
            </div>
            <span className="mt-1 text-sm">{avatar.avatar_name}</span>
            {globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' && (
              <button 
                onClick={() => handleStream(avatar.avatar_id, avatar.image_uri)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Stream with {avatar.avatar_name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}