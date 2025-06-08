'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface CharacterSearchTileProps {
  avatar: {
    avatar_id: string;
    avatar_name: string;
    image_uri: string;
    presignedUrl?: string;
    agent_bio?: string;
    prompt?: string;
  };
  onClick?: () => void;
}

export default function CharacterSearchTile({ avatar, onClick }: CharacterSearchTileProps) {
  const router = useRouter();

  const handleClick = () => {
    console.log('handleClick', avatar);
    if (onClick) {
      console.log('onClick', onClick);
      onClick();
    }
    console.log('router.push', `/chat/${avatar.avatar_id}`);
    router.push(`/chat/${avatar.avatar_id}`);
  };

  return (
    <div 
      className="flex items-center gap-3 p-2 hover:bg-[#ffffff1a] rounded-lg cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        {avatar.presignedUrl && (
          <Image
            src={avatar.presignedUrl}
            alt={avatar.avatar_name}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-white text-sm font-medium truncate">
          {avatar.avatar_name}
        </h3>
        <p className="text-[#847379] text-xs line-clamp-2">
          {avatar.agent_bio || avatar.prompt}
        </p>
      </div>
    </div>
  );
}