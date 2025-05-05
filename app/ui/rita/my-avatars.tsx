'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { incrementAvatarRequestCounter } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import AvatarPopup from './avatar-popup';
import LoginPopup from './login-popup';
import { Card } from '@/app/components/card';

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
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  const handleStream = async (avatar: UserAvatar) => {
    if (!session) {
      setShowLoginPopup(true);
      setSelectedAvatar(null);
      return;
    }

    if (!avatar.image_uri) {
      console.error('No image URI available for this avatar');
      return;
    }
    
    const roomName = generateRoomId();
    const returnPath = '/dashboard';
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
        <h2 className="text-xl font-semibold mb-4">My characters</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {initialAvatars.message}
        </div>
      </div>
    );
  }

  if (initialAvatars.avatars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">My characters</h2>
        <div className="p-4 bg-gray-100 text-gray-700 rounded-lg">
          You don't have any avatars yet. Create one to get started!
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-start gap-x-[1.5%] gap-y-[2vh] w-full max-w-[90vw]">
      {initialAvatars.avatars.map((avatar) => (
        <Card
          key={avatar.avatar_id}
          className="relative w-[15%] min-w-[150px] aspect-[0.56] rounded-[6.59px] overflow-hidden p-0 border-0 transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer mb-[2vh]"
          onClick={() => setSelectedAvatar(selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my' ? null : {id: avatar.avatar_id, type: 'my'})}
        >
          {avatar.presignedUrl ? (
            <>
              <Image
                src={avatar.presignedUrl}
                alt={avatar.avatar_name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                priority={selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my'}
                className="object-cover"
              />
              <div className="absolute w-full bottom-0 left-0">
                <div className="relative w-full h-[30%] bg-[#00000080] blur-[9px]"></div>
                <div className="absolute bottom-0 left-0 flex flex-col w-full items-start gap-[0.5%] p-[2%]">
                  <div className="relative self-stretch font-['Montserrat',Helvetica] font-semibold text-white text-[0.7vw] tracking-[0] leading-[normal]">
                    {avatar.avatar_name}
                  </div>
                  <div className="relative self-stretch font-['Montserrat',Helvetica] font-normal text-white text-[0.5vw] tracking-[0] leading-[normal]">
                    {avatar.prompt}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ImageLoading />
          )}
        </Card>
      ))}
      {/* Create card - temporarily commented out
      <Card
        className="relative w-[15%] min-w-[150px] aspect-[0.56] rounded-[6.59px] overflow-hidden p-0 border-0 transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer mb-[2vh] bg-[#1A56DB] flex items-center justify-center"
        onClick={() => router.push('/dashboard/create')}
      >
        <div className="text-4xl text-white">+</div>
      </Card>
      */}
      <AvatarPopup
        avatar={currentSelectedAvatar || null}
        onStream={handleStream}
        onClose={() => setSelectedAvatar(null)}
      />
      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
      />
    </div>
  );
}