'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession, incrementAvatarServeCounter, incrementAvatarRequestCounter } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import AvatarPopup from '@/app/ui/rita/avatar-popup';
import { Badge } from '@/app/components/badge';
import { Card } from '@/app/components/card';

// Loading component for images
function ImageLoading() {
  return (
    <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
  );
}

interface Category {
  name: string;
  color: string;
}

interface HomepageAvatarsProps {
  initialAvatars: {
    success: boolean;
    avatars: {
      avatar_id: string;
      avatar_name: string;
      image_uri: string;
      prompt: string;
      presignedUrl?: string;
    }[] | null;
    message: string;
  };
  categories: Category[];
}

export default function HomepageAvatars({ initialAvatars, categories }: HomepageAvatarsProps) {
  const router = useRouter();
  const [globalSelectedAvatar, setGlobalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const { data: session } = useSession();
 
  const handleStream = async (avatarId: string) => {
    const roomName = generateRoomId();
    const avatar = initialAvatars.avatars?.find(a => a.avatar_id === avatarId);
    
    if (!avatar) return;
    
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
        llmAssistantBio: avatar.prompt,
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: null,
        ttsVoiceIdCartesia: null,
      });
      await incrementAvatarRequestCounter(avatarId);
      router.push(`/rooms/${roomName}?returnPath=/dashboard&presignedUrl=${encodeURIComponent(avatar.presignedUrl || '')}`);
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

  if (initialAvatars.avatars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Explore Rita Avatars</h2>
        <div className="p-4 bg-gray-100 text-gray-700 rounded-lg">
          No public avatars available at the moment.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[1180px] py-8 gap-8 mx-auto">
      {/* Categories Section */}
      <div className="relative w-full overflow-hidden">
        <div className="flex items-center gap-2 px-10 py-2 overflow-x-auto">
          {categories.map((category, index) => (
            <Badge
              key={index}
              className="px-6 py-2 cursor-pointer inline-block"
              style={{ backgroundColor: category.color }}
            >
              <span className="font-bold font-['Montserrat',Helvetica] text-white text-base whitespace-nowrap">
                {category.name}
              </span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Main Content Section */}
      <div className="w-full px-10">
        <h2 className="font-['Montserrat',Helvetica] font-bold text-black text-2xl text-left mb-4">
          Explore Rita Avatars
        </h2>
      </div>

      {/* Avatars Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-10 w-full">
        {initialAvatars.avatars.map((avatar) => (
          <Card
            key={avatar.avatar_id}
            className={`relative w-full h-[320px] rounded-[5px] overflow-hidden p-0 cursor-pointer transition-transform duration-200 ease-in-out hover:scale-105 ${
              globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita' ? null : {id: avatar.avatar_id, type: 'rita'})}
          >
            <Suspense fallback={<ImageLoading />}>
              {avatar.presignedUrl ? (
                <>
                  <Image
                    src={avatar.presignedUrl}
                    alt={avatar.avatar_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    priority={globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita'}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                    <div className="backdrop-blur-sm bg-black bg-opacity-30 p-4 rounded-lg">
                      <h3 className="text-white text-sm font-semibold">{avatar.avatar_name}</h3>
                      <p className="text-white text-xs">{avatar.prompt}</p>
                    </div>
                  </div>
                </>
              ) : (
                <ImageLoading />
              )}
            </Suspense>
          </Card>
        ))}
      </div>

      <AvatarPopup
        avatar={selectedAvatar ? {
          avatar_id: selectedAvatar.avatar_id,
          avatar_name: selectedAvatar.avatar_name,
          image_uri: selectedAvatar.image_uri,
          create_time: new Date(),
          prompt: selectedAvatar.prompt,
          agent_bio: selectedAvatar.prompt,
        } : null}
        onStream={() => selectedAvatar && handleStream(selectedAvatar.avatar_id)}
        onClose={() => setGlobalSelectedAvatar(null)}
      />
    </div>
  );
}
