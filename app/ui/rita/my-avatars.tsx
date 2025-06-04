'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { incrementAvatarRequestCounter } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import AvatarPopup from './avatar-popup';
import LoginPopup from './login-popup';
import { Card } from '@/app/components/card';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storeUserRoomAction, deleteUserPreviousRoomAction } from '@/app/lib/actions';

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
  thumb_count?: number;
  serve_time?: number;
};

export type { UserAvatar };

type MyAvatarsProps = {
  initialAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  };
};

function WarningPopup({ 
  isOpen, 
  onClose, 
  currentCount, 
  maxCount 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentCount: number;
  maxCount: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2 text-white"
          onClick={onClose}
        >
          <X size={24} />
        </Button>
        <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
          <AlertCircle className="text-yellow-500 mr-2" size={28} />
          Daily Limit Reached
        </h2>
        <p className="text-white text-lg mb-2">
          You have reached your daily limit of {maxCount} streaming sessions.
        </p>
        <p className="text-gray-400 text-sm">
          Your limit will reset tomorrow. Thank you for using our service!
        </p>
      </div>
    </div>
  );
}

export default function MyAvatars({ initialAvatars }: MyAvatarsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedAvatar, setSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [streamCount, setStreamCount] = useState({ current: 0, max: 6 });

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
    const returnPath = '/';
    const presignedUrl = avatar.presignedUrl || '';

    const query = new URLSearchParams({
      returnPath,
      presignedUrl,
      prompt: avatar.prompt || '',
      scene: avatar.scene_prompt || '',
      bio: avatar.agent_bio || '',
      avatar_name: avatar.avatar_name || '',
      avatar_id: avatar.avatar_id || '',
    }).toString();

    // Delete any previous room for this user
    if (session?.user?.email) {
      deleteUserPreviousRoomAction(session.user.email, roomName);
    }

    try {
      const response = await startStreamingSession({
        instruction: "test",
        seconds: 600,
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
        userEmail: session?.user?.email || '',
      });

      // Store the room ID for this user
      if (session?.user?.email) {
        storeUserRoomAction(session.user.email, roomName);
      }
    
      if (!response.success && response.error === 'LIMIT_REACHED') {
        setStreamCount({ current: response.currentCount, max: response.maxCount });
        setShowWarningPopup(true);
        return;
      }

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
          className="relative w-[18.75%] min-w-[150px] aspect-[0.56] rounded-[6.59px] overflow-hidden p-0 border-0 transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer mb-[2vh]"
          onClick={() => setSelectedAvatar(selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my' ? null : {id: avatar.avatar_id, type: 'my'})}
        >
          {avatar.presignedUrl ? (
            <>
              <img
                src={avatar.presignedUrl}
                alt={avatar.avatar_name}
                className="object-cover w-full h-full"
                loading={selectedAvatar?.id === avatar.avatar_id && selectedAvatar?.type === 'my' ? 'eager' : 'lazy'}
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
          ) : (
            <ImageLoading />
          )}
        </Card>
      ))}
      {/* Create card - temporarily commented out
      <Card
        className="relative w-[15%] min-w-[150px] aspect-[0.56] rounded-[6.59px] overflow-hidden p-0 border-0 transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer mb-[2vh] bg-[#1A56DB] flex items-center justify-center"
        onClick={() => router.push('/create')}
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
      <WarningPopup
        isOpen={showWarningPopup}
        onClose={() => setShowWarningPopup(false)}
        currentCount={streamCount.current}
        maxCount={streamCount.max}
      />
    </div>
  );
}