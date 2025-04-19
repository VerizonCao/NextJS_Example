'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import MyAvatars from '@/app/ui/rita/my-avatars';

export default function MyAvatarsPage() {
  const { data: session, status } = useSession();
  const [localSelectedAvatar, setLocalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);

  // Show loading state while session is loading or if there's no userEmail
  if (status === 'loading' || !session?.user?.email) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="w-full">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-full">
        <MyAvatars 
          session={session}
          globalSelectedAvatar={localSelectedAvatar}
          setGlobalSelectedAvatar={setLocalSelectedAvatar}
        />
      </div>
    </div>
  );
}