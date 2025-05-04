'use client';

import { useState, useEffect } from 'react';
import { UserAvatar } from './my-avatars';
import { Button } from '../button';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type AvatarPopupProps = {
  avatar: UserAvatar | null;
  onStream: (avatar: UserAvatar) => void;
  onClose: () => void;
};

export default function AvatarPopup({ avatar, onStream, onClose }: AvatarPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (avatar) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [avatar]);

  const handleEdit = () => {
    if (avatar) {
      router.push(`/dashboard/edit-avatar/${avatar.avatar_id}`);
    }
  };

  if (!isVisible || !avatar) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 text-xl z-10"
        >
          ✕
        </button>

        <div className="flex items-center justify-center gap-0">
          {/* Character Image */}
          {avatar.presignedUrl && (
            <div
              className="relative w-[525.42px] h-[937.44px] rounded-[5px] bg-cover bg-center"
              style={{
                backgroundImage: `url(${avatar.presignedUrl})`,
              }}
            />
          )}
          
          {/* Character Info Card */}
          <Card className="flex flex-col w-[613.7px] h-[937.44px] bg-[#1a1a1e] rounded-[5px] border-none">
            <CardContent className="flex flex-col justify-between h-full p-[15.12px]">
              {/* Top Section */}
              <div className="flex flex-col gap-[16.2px]">
                {/* Profile Header */}
                <div className="flex flex-col gap-[16.2px]">
                  <div className="flex items-center gap-[15.12px]">
                    {avatar.presignedUrl && (
                      <img
                        className="w-[68.04px] h-[68.04px] object-cover rounded-full"
                        alt="Avatar"
                        src={avatar.presignedUrl}
                      />
                    )}

                    <div className="flex flex-col gap-[7.56px] flex-1">
                      <h2 className="font-bold text-white text-[14.4px]">
                        {avatar.avatar_name}
                      </h2>
                      <p className="font-medium text-white text-[11.3px]">
                        {avatar.agent_bio || 'No bio available'}
                      </p>
                    </div>
                  </div>

                  <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
                </div>

                {/* About Section */}
                <div className="flex flex-col gap-[16.2px]">
                  <h3 className="font-bold text-white text-base">About</h3>

                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      Prompt
                    </h4>
                    <p className="font-medium text-white text-xs mt-2">
                      {avatar.prompt || 'No prompt available'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white text-[12.6px]">
                      Scene
                    </h4>
                    <p className="font-medium text-white text-[10.8px] mt-2">
                      {avatar.scene_prompt || 'No scene prompt available'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white text-[12.6px]">
                      Voice
                    </h4>
                    <p className="font-medium text-white text-[10.8px] mt-2">
                      {avatar.voice_id || 'No voice ID set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-[13.5px]">
                <Button 
                  onClick={() => onStream(avatar)}
                  className="px-[18px] py-[7.2px] bg-[rgb(79,70,229)] hover:bg-[rgb(60,52,181)] rounded-[10.8px] text-[12.6px] transition-colors duration-200"
                >
                  Stream with {avatar.avatar_name}
                </Button>
                <Button
                  onClick={handleEdit}
                  className="px-[10.8px] py-[7.2px] rounded-[10.8px] text-[12.6px] text-white bg-[rgb(29,29,30)] hover:bg-[rgb(40,40,42)] transition-colors duration-200"
                >
                  Edit Avatar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 