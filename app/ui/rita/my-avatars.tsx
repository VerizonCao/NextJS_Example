'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { loadUserAvatars, getPresignedUrl } from '@/app/lib/actions';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { Stick_No_Bills } from 'next/font/google';

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
  prompt: string;
  agent_bio?: string;
  scene_prompt?: string;
  voice_id?: string;
};

type MyAvatarsProps = {
  session: any; // Using any for now since we don't have the exact Session type
  globalSelectedAvatar: {id: string | number, type: 'rita' | 'my'} | null;
  setGlobalSelectedAvatar: React.Dispatch<React.SetStateAction<{id: string | number, type: 'rita' | 'my'} | null>>;
};

export default function MyAvatars({ session, globalSelectedAvatar, setGlobalSelectedAvatar }: MyAvatarsProps) {
  const router = useRouter();
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [loadedAvatars, setLoadedAvatars] = useState<Record<string, boolean>>({});
  const userEmail = session?.user?.email || '';

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setLoading(true);
        
        console.log('userEmail1', userEmail);
        const result = await loadUserAvatars(userEmail);
        
        if (result.success && result.avatars) {
          setAvatars(result.avatars);
          
          // Load presigned URLs sequentially
          for (const avatar of result.avatars) {
            if (avatar.image_uri) {
              try {
                const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
                setAvatarUrls(prev => ({
                  ...prev,
                  [avatar.avatar_id]: presignedUrl
                }));
              } catch (err) {
                console.error(`Failed to get presigned URL for avatar ${avatar.avatar_id}:`, err);
              }
            }
          }
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

  const handleImageLoad = (avatarId: string) => {
    setLoadedAvatars(prev => ({
      ...prev,
      [avatarId]: true
    }));
  };

  const handleStream = async (avatar: UserAvatar) => {
    if (!avatar.image_uri) {
      console.error('No image URI available for this avatar');
      return;
    }
    
    const roomName = generateRoomId();
    
    // Print all avatar information
    console.log('Starting streaming session with avatar:', {
      avatar_id: avatar.avatar_id,
      avatar_name: avatar.avatar_name,
      image_uri: avatar.image_uri,
      prompt: avatar.prompt,
      scene_prompt: avatar.scene_prompt,
      agent_bio: avatar.agent_bio,
      voice_id: avatar.voice_id,
      create_time: avatar.create_time
    });
    
    try {
      await startStreamingSession({
        instruction: "test",
        seconds: 300,
        room: roomName,
        avatarSource: avatar.image_uri,
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar.avatar_name,
        llmAssistantBio: avatar.agent_bio || 'this is an agent bio',
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: avatar.scene_prompt,
        ttsVoiceIdCartesia: avatar.voice_id,
      });
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
              className={`relative w-[220px] h-[320px] rounded-lg overflow-hidden cursor-pointer group ${globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' ? null : {id: avatar.avatar_id, type: 'my'})}
            >
              {avatarUrls[avatar.avatar_id] ? (
                <>
                  <Image
                    src={avatarUrls[avatar.avatar_id]}
                    alt={avatar.avatar_name}
                    fill
                    sizes="220px"
                    loading={globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' ? "eager" : "lazy"}
                    className="object-cover"
                    onLoad={() => handleImageLoad(avatar.avatar_id)}
                  />
                  {avatar.agent_bio && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                      <p className="text-white text-sm text-center">{avatar.agent_bio}</p>
                    </div>
                  )}
                </>
              ) : (
                <ImageLoading />
              )}
            </div>
            <span className="mt-1 text-sm">{avatar.avatar_name}</span>
            {globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'my' && (
              <button 
                onClick={() => handleStream(avatar)}
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