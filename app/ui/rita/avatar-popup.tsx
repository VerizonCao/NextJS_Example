'use client';

import { useState, useEffect, useRef } from 'react';
import { UserAvatar } from './my-avatars';
import { Button } from '../button';
import { useRouter } from 'next/navigation';

type AvatarPopupProps = {
  avatar: UserAvatar | null;
  onStream: (avatar: UserAvatar) => void;
  onClose: () => void;
};

export default function AvatarPopup({ avatar, onStream, onClose }: AvatarPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [width, setWidth] = useState(320); // Default width
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (avatar) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [avatar]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(width);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 320), 800); // Min width: 320px, Max width: 800px
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startX, startWidth]);

  const handleEdit = () => {
    if (avatar) {
      router.push(`/dashboard/edit-avatar/${avatar.avatar_id}`);
    }
  };

  if (!isVisible || !avatar) return null;

  return (
    <div 
      ref={popupRef}
      className="fixed right-0 top-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-100 active:bg-blue-200"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <svg 
            className="w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 9l4-4 4 4m0 6l-4 4-4-4" 
            />
          </svg>
        </div>
      </div>

      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{avatar.avatar_name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {avatar.agent_bio && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">About</h3>
            <p className="text-gray-700">{avatar.agent_bio}</p>
          </div>
        )}

        <div className="mt-auto space-y-3">
          <Button
            onClick={() => onStream(avatar)}
            className="w-full"
          >
            Stream with {avatar.avatar_name}
          </Button>
          <Button
            onClick={handleEdit}
            className="w-full bg-gray-500 hover:bg-gray-600"
          >
            Edit Avatar
          </Button>
        </div>
      </div>
    </div>
  );
} 