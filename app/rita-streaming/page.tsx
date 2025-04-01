'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession } from '@/app/lib/actions';



export default function RitaStreamingPage() {
  const router = useRouter();
 
  const handleStream = async () => {
    const roomName = "my-room";
    
    try {
      await startStreamingSession("test", 60, roomName);
      router.push(`/rooms/${roomName}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[300px] h-[300px]">
        <Image
          src="/rita-avatars/1.png"
          alt="Rita Avatar"
          fill
          className="rounded-lg object-cover"
          priority
        />
      </div>
      <button 
        onClick={handleStream}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Stream
      </button>
    </div>
  );
}