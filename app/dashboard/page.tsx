'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
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

export default function RitaStreamingPage() {
  const router = useRouter();
  const [globalSelectedAvatar, setGlobalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const { data: session } = useSession();
 
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
      router.push(`/rooms/${roomName}?returnPath=/dashboard&presignedUrl=/${avatar?.src}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
      // You might want to show an error message to the user here
    }
  };

  const selectedAvatar = ritaAvatars.find(avatar => 
    globalSelectedAvatar?.id === avatar.id && 
    globalSelectedAvatar?.type === 'rita'
  );

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
        {ritaAvatars.map((avatar) => (
          <Card
            key={avatar.id}
            className={`relative w-full h-[320px] rounded-[5px] overflow-hidden p-0 cursor-pointer transition-transform duration-200 ease-in-out hover:scale-105 ${
              globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita' ? null : {id: avatar.id, type: 'rita'})}
          >
            <Suspense fallback={<ImageLoading />}>
              <Image
                src={`/${avatar.src}`}
                alt={avatar.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                priority={avatar.id === 1 || (globalSelectedAvatar?.id === avatar.id && globalSelectedAvatar?.type === 'rita')}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                <div className="backdrop-blur-sm bg-black bg-opacity-30 p-4 rounded-lg">
                  <h3 className="text-white text-sm font-semibold">{avatar.name}</h3>
                  <p className="text-white text-xs">{avatar.prompt}</p>
                </div>
              </div>
            </Suspense>
          </Card>
        ))}
      </div>

      <AvatarPopup
        avatar={selectedAvatar ? {
          avatar_id: selectedAvatar.id.toString(),
          avatar_name: selectedAvatar.name,
          image_uri: `/${selectedAvatar.src}`,
          create_time: new Date(),
          prompt: selectedAvatar.prompt,
          agent_bio: selectedAvatar.prompt,
        } : null}
        onStream={() => selectedAvatar && handleStream(selectedAvatar.id)}
        onClose={() => setGlobalSelectedAvatar(null)}
      />
    </div>
  );
}