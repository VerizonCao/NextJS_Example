'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useState, Suspense, useEffect } from 'react';
import MyAvatars from '@/app/ui/rita/my-avatars';
import { useSession } from 'next-auth/react';

// Loading component for images
function ImageLoading() {
  return (
    <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
  );
}

// List of all Rita avatars
const ritaAvatars = [
  { id: 1, src: 'rita-avatars-test/1.png', name: 'Rita 1', prompt: 'friendly talking assistant' },
  { id: 2, src: 'rita-avatars-test/deepspace.png', name: 'Deep Space', prompt: 'friendly talking assistant' },
  { id: 3, src: 'rita-avatars-test/rest_4_crop.png', name: 'Rest 4', prompt: 'friendly talking assistant' },
  { id: 4, src: 'rita-avatars-test/rest_5_square.png', name: 'Rest 5', prompt: 'friendly talking assistant' },
  { id: 5, src: 'rita-avatars-test/rest_8_square.png', name: 'Rest 8', prompt: 'friendly talking assistant' },
  { id: 6, src: 'rita-avatars-test/t13.png', name: 'T13', prompt: 'friendly talking assistant' },
  { id: 7, src: 'rita-avatars-test/tifa_3.png', name: 'Tifa 3', prompt: 'friendly talking assistant' },
  { id: 8, src: 'rita-avatars-test/girl_white.png', name: 'cute girl 1', prompt: 'friendly talking assistant' },
  { id: 9, src: 'rita-avatars-test/girl_red.png', name: 'cute girl 2', prompt: 'friendly talking assistant' },
  { id: 10, src: 'rita-avatars-test/mingren.png', name: 'mingren', prompt: 'friendly talking assistant' },
];

export default function RitaStreamingPage() {
  const router = useRouter();
  const [globalSelectedAvatar, setGlobalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || '';
 
  const handleStream = async (avatarId: number) => {
    const roomName = generateRoomId();
    const avatar = ritaAvatars.find(a => a.id === avatarId);
    
    try {
      await startStreamingSession({
        instruction: "test",
        seconds: 300,
        room: roomName,
        avatarSource: avatar?.src || '',
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar?.name,
        llmAssistantBio: avatar?.prompt,
        llmAssistantAdditionalCharacteristics: avatar?.prompt,
        llmConversationContext: null,
        ttsVoiceIdCartesia: null,
      });
      router.push(`/rooms/${roomName}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold mb-4">Rita Avatars</h1>
      
      {/* All avatars grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ritaAvatars.map((avatar) => (
          <div 
            key={avatar.id} 
            className="flex flex-col items-center"
          >
            <div 
              className={`relative w-[220px] h-[320px] rounded-lg overflow-hidden cursor-pointer group ${globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita' ? null : {id: avatar.id, type: 'rita'})}
            >
              <Suspense fallback={<ImageLoading />}>
                <Image
                  src={`/${avatar.src}`}
                  alt={avatar.name}
                  fill
                  sizes="220px"
                  priority={avatar.id === 1 || (globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita')}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                  <p className="text-white text-sm text-center">{avatar.prompt}</p>
                </div>
              </Suspense>
            </div>
            <span className="mt-1 text-sm">{avatar.name}</span>
            {globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita' && (
              <button 
                onClick={() => handleStream(avatar.id)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Stream with {avatar.name}
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* My Avatars section - only render when we have a valid email */}
      {userEmail && (
        <div className="w-full mt-8">
          <MyAvatars 
            session={session}
            globalSelectedAvatar={globalSelectedAvatar}
            setGlobalSelectedAvatar={setGlobalSelectedAvatar}
          />
        </div>
      )}
    </div>
  );
}