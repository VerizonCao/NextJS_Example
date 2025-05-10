'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession, incrementAvatarRequestCounter } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import AvatarPopup from '@/app/ui/rita/avatar-popup';
import LoginPopup from '@/app/ui/rita/login-popup';
import { Card } from '@/app/components/card';
import MyAvatars from '@/app/ui/rita/my-avatars';

type UserAvatar = {
  avatar_id: string;
  avatar_name: string;
  image_uri: string;
  create_time: Date;
  prompt: string;
  presignedUrl?: string;
  scene_prompt?: string;
  voice_id?: string;
  agent_bio?: string;
};

interface HomepageAvatarsProps {
  initialAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  };
  userAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  } | null;
}

export default function HomepageAvatars({ initialAvatars, userAvatars }: HomepageAvatarsProps) {
  const router = useRouter();
  const [globalSelectedAvatar, setGlobalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const { data: session } = useSession();
 
  const handleStream = async (avatarId: string) => {
    if (!session) {
      setShowLoginPopup(true);
      return;
    }

    const roomName = generateRoomId();
    const avatar = initialAvatars.avatars?.find(a => a.avatar_id === avatarId);
    
    if (!avatar) return;
    
    try {
      await startStreamingSession({
        instruction: "test",
        seconds: 600,
        room: roomName,
        avatarSource: avatar.image_uri,
        avatar_id: avatar.avatar_id,
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar.avatar_name,
        llmAssistantBio: avatar.prompt,
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: avatar.scene_prompt,
        ttsVoiceIdCartesia: avatar.voice_id,
      });
      await incrementAvatarRequestCounter(avatarId);
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

      router.push(`/rooms/${roomName}?${query}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
    }
  };

  const selectedAvatar = initialAvatars.avatars?.find(avatar => 
    globalSelectedAvatar?.id === avatar.avatar_id && 
    globalSelectedAvatar?.type === 'rita'
  );

  if (!initialAvatars.success || !initialAvatars.avatars) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Explore Rita Avatars</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {initialAvatars.message}
        </div>
      </div>
    );
  }

  const sections = [
    (userAvatars && userAvatars.avatars && userAvatars.avatars.length > 0) && {
      id: 1,
      title: "My characters",
      component: (
        <div className="w-full">
          <MyAvatars initialAvatars={userAvatars} />
        </div>
      ),
    },
    {
      id: 2,
      title: "Explore Trending Characters",
      component: (
        <div className="flex flex-wrap justify-start gap-x-[1.5%] gap-y-[2vh] w-full max-w-[90vw]">
          {initialAvatars.avatars.map((avatar) => (
            <Card
              key={avatar.avatar_id}
              className="relative w-[18.75%] min-w-[150px] aspect-[0.56] rounded-[6.59px] overflow-hidden p-0 border-0 transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer mb-[2vh]"
              onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita' ? null : {id: avatar.avatar_id, type: 'rita'})}
            >
              {avatar.presignedUrl && (
                <>
                  <Image
                    src={avatar.presignedUrl}
                    alt={avatar.avatar_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    priority={globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita'}
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-0.5 p-3 bg-gradient-to-t from-black/80 via-black/45 to-black/1">
                    <div className="self-stretch font-['Montserrat',Helvetica] font-semibold text-white text-base leading-tight truncate">
                      {avatar.avatar_name}
                    </div>
                    <div className="self-stretch font-['Montserrat',Helvetica] font-normal text-neutral-300 text-xs leading-snug overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {avatar.agent_bio}
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      ),
    },
  ].filter((section): section is { id: number; title: string; component: React.ReactElement } => Boolean(section));

  return (
    <div className="flex flex-col w-full items-center gap-[2vh] py-[2vh]">
      {sections.map((section) => (
        <React.Fragment key={section.id}>
          <div className="flex w-full max-w-[1148px] items-center justify-start gap-[1%] relative flex-[0_0_auto]">
            <div className="relative flex-1 h-[3.3vh] [font-family:'Montserrat',Helvetica] font-bold text-white text-3xl tracking-[0] leading-[normal]">
              {section.title}
            </div>
          </div>
          <div className="w-full max-w-[1148px] flex justify-start mt-[1vh]">
            {section.component}
          </div>
        </React.Fragment>
      ))}

      <AvatarPopup
        avatar={selectedAvatar ? {
          avatar_id: selectedAvatar.avatar_id,
          avatar_name: selectedAvatar.avatar_name,
          image_uri: selectedAvatar.image_uri,
          create_time: selectedAvatar.create_time,
          prompt: selectedAvatar.prompt,
          agent_bio: selectedAvatar.agent_bio,
          presignedUrl: selectedAvatar.presignedUrl,
        } : null}
        onStream={() => selectedAvatar && handleStream(selectedAvatar.avatar_id)}
        onClose={() => setGlobalSelectedAvatar(null)}
      />

      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
      />
    </div>
  );
}
