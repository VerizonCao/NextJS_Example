'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useState } from 'react';

// List of all Rita avatars
const ritaAvatars = [
  { id: 1, src: '/rita-avatars/1.png', name: 'Rita 1' },
  { id: 2, src: '/rita-avatars/deepspace.png', name: 'Deep Space' },
  { id: 3, src: '/rita-avatars/rest_4_crop.png', name: 'Rest 4' },
  { id: 4, src: '/rita-avatars/rest_5_square.png', name: 'Rest 5' },
  { id: 5, src: '/rita-avatars/rest_8_square.png', name: 'Rest 8' },
  { id: 6, src: '/rita-avatars/t13.png', name: 'T13' },
  { id: 7, src: '/rita-avatars/tifa_3.png', name: 'Tifa 3' },
];

export default function RitaStreamingPage() {
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState(ritaAvatars[0]);
 
  const handleStream = async (avatarId: number) => {
    const roomName = generateRoomId();
    const avatar = ritaAvatars.find(a => a.id === avatarId);
    
    try {
      await startStreamingSession({
        instruction: "test",
        seconds: 600,
        room: roomName,
        avatarSource: avatar?.src || '',
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
      
      {/* Selected avatar display */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{selectedAvatar.name}</h2>
        <div className="relative w-[90px] h-[160px] border-2 border-blue-500 rounded-lg overflow-hidden">
          <Image
            src={selectedAvatar.src}
            alt={selectedAvatar.name}
            fill
            className="object-cover"
            priority
          />
        </div>
        <button 
          onClick={() => handleStream(selectedAvatar.id)}
          className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Stream with {selectedAvatar.name}
        </button>
      </div>
      
      {/* All avatars grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ritaAvatars.map((avatar) => (
          <div 
            key={avatar.id} 
            className={`flex flex-col items-center cursor-pointer ${selectedAvatar.id === avatar.id ? 'ring-2 ring-blue-500 rounded-lg p-1' : ''}`}
            onClick={() => setSelectedAvatar(avatar)}
          >
            <div className="relative w-[180px] h-[320px] rounded-lg overflow-hidden">
              <Image
                src={avatar.src}
                alt={avatar.name}
                fill
                className="object-cover"
              />
            </div>
            <span className="mt-1 text-sm">{avatar.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}