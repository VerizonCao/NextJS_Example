'use client';

import { useState, useEffect } from 'react';
import { UserAvatar } from './my-avatars';
import { Button } from '../button';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSession } from 'next-auth/react';
import LoginPopup from './login-popup';

type AvatarPopupProps = {
  avatar: UserAvatar | null;
  onStream: (avatar: UserAvatar) => void;
  onClose: () => void;
};

export default function AvatarPopup({ avatar, onStream, onClose }: AvatarPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.refresh();
    }
  }, [status, router]);

  useEffect(() => {
    if (avatar) {
      setIsImageLoaded(false);
      // Preload the image
      const img = new Image();
      img.src = avatar.presignedUrl || '';
      img.onload = () => {
        setIsImageLoaded(true);
        setIsVisible(true);
      };
    } else {
      setIsVisible(false);
    }
  }, [avatar]);

  const handleEdit = () => {
    if (avatar) {
      router.push(`/dashboard/edit-avatar/${avatar.avatar_id}`);
    }
  };

  const handleStream = () => {
    if (!session) {
      setShowLoginPopup(true);
      return;
    }
    if (avatar) {
      onStream(avatar);
    }
  };

  if (!isVisible || !avatar || !isImageLoaded) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-xl z-10"
          >
            ✕
          </button>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-0">
            {/* Character Image */}
            {avatar.presignedUrl && (
              <div
                className="relative w-full lg:w-[400px] h-[400px] lg:h-[714px] rounded-l-[5px] lg:rounded-r-none rounded-[5px] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${avatar.presignedUrl})`,
                }}
              />
            )}
            
            {/* Character Info Card */}
            <Card className="flex flex-col w-full lg:w-[467px] h-auto lg:h-[714px] bg-[#1a1a1e] rounded-r-[5px] lg:rounded-l-none rounded-[5px] border-none">
              <CardContent className="flex flex-col justify-between h-full p-4 lg:p-[15.12px]">
                {/* Top Section */}
                <div className="flex flex-col gap-4 lg:gap-[16.2px]">
                  {/* Profile Header */}
                  <div className="flex flex-col gap-4 lg:gap-[16.2px]">
                    <div className="flex items-center gap-4 lg:gap-[15.12px]">
                      {avatar.presignedUrl && (
                        <img
                          className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] object-cover rounded-full"
                          alt="Avatar"
                          src={avatar.presignedUrl}
                        />
                      )}

                      <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1">
                        <h2 className="font-bold text-white text-base lg:text-[14.4px]">
                          {avatar.avatar_name}
                        </h2>
                        <p className="font-medium text-white text-sm lg:text-[11.3px]">
                          {avatar.agent_bio || 'No bio available'}
                        </p>
                      </div>
                    </div>

                    <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
                  </div>

                  {/* About Section */}
                  <div className="flex flex-col gap-4 lg:gap-[16.2px]">
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
                      <h4 className="font-semibold text-white text-sm lg:text-[12.6px]">
                        Scene
                      </h4>
                      <p className="font-medium text-white text-xs lg:text-[10.8px] mt-2">
                        {avatar.scene_prompt || 'No scene prompt available'}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white text-sm lg:text-[12.6px]">
                        Voice
                      </h4>
                      <p className="font-medium text-white text-xs lg:text-[10.8px] mt-2">
                        {avatar.voice_id || 'No voice ID set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-[13.5px] mt-4">
                  <Button 
                    onClick={handleStream}
                    className="w-full sm:w-auto px-4 lg:px-[18px] py-2 lg:py-[7.2px] bg-[rgb(79,70,229)] hover:bg-[rgb(60,52,181)] rounded-[10.8px] text-sm lg:text-[12.6px] transition-colors duration-200"
                  >
                    Stream with {avatar.avatar_name}
                  </Button>
                  <Button
                    onClick={handleEdit}
                    className="w-full sm:w-auto px-4 lg:px-[10.8px] py-2 lg:py-[7.2px] rounded-[10.8px] text-sm lg:text-[12.6px] text-white bg-[rgb(29,29,30)] hover:bg-[rgb(40,40,42)] transition-colors duration-200"
                  >
                    Edit Avatar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
      />
    </>
  );
} 