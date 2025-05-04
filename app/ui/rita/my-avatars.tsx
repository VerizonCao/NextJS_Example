'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { incrementAvatarRequestCounter } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import AvatarPopup from './avatar-popup';

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
  presignedUrl?: string;
};

export type { UserAvatar };

type MyAvatarsProps = {
  initialAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  };
};

export default function MyAvatars({ initialAvatars }: MyAvatarsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedAvatar, setSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);

  const handleStream = async (avatar: UserAvatar) => {
    if (!avatar.image_uri) {
      console.error('No image URI available for this avatar');
      return;
    }
    
    const roomName = generateRoomId();
    const returnPath = '/dashboard/my-avatars';
    const presignedUrl = avatar.presignedUrl || '';

    const query = new URLSearchParams({
      returnPath,
      presignedUrl,
      prompt: avatar.prompt || '',
      scene: avatar.scene_prompt || '',
      bio: avatar.agent_bio || '',
      avatar_name: avatar.avatar_name || '',
    }).toString();

    try {
      await startStreamingSession({
        instruction: "test",
        seconds: 300,
        room: roomName,
        avatarSource: avatar.image_uri,
        avatar_id: avatar.avatar_id,
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar.avatar_name,
        llmAssistantBio: avatar.agent_bio || 'this is an agent bio',
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: avatar.scene_prompt,
        ttsVoiceIdCartesia: avatar.voice_id,
      });
      await incrementAvatarRequestCounter(avatar.avatar_id);
      router.push(`/rooms/${roomName}?${query}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
    }
  };

  const currentSelectedAvatar = initialAvatars.avatars?.find(avatar => 
    selectedAvatar?.id === avatar.avatar_id && 
    selectedAvatar?.type === 'my'
  );

  if (!initialAvatars.success || !initialAvatars.avatars) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">My Avatars</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {initialAvatars.message}
        </div>
      </div>
    );
  }

  if (initialAvatars.avatars.length === 0) {
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
        {initialAvatars.avatars.map((avatar) => (
          <div 
            key={avatar.avatar_id} 
            className="flex flex-col items-center"
          >
            <div 
              className={`relative w-[220px] h-[320px] rounded-lg overflow-hidden cursor-pointer group ${selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelectedAvatar(selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my' ? null : {id: avatar.avatar_id, type: 'my'})}
            >
              {avatar.presignedUrl ? (
                <>
                  <Image
                    src={avatar.presignedUrl}
                    alt={avatar.avatar_name}
                    fill
                    sizes="220px"
                    loading={selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my' ? "eager" : "lazy"}
                    className="object-cover"
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
          </div>
        ))}
      </div>
      <AvatarPopup
        avatar={currentSelectedAvatar || null}
        onStream={handleStream}
        onClose={() => setSelectedAvatar(null)}
      />
    </div>
  );
}