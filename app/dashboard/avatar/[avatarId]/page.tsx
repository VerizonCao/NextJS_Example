'use client';

import { getPresignedUrl, loadAvatar } from '@/app/lib/actions';
import { useState, useEffect } from 'react';
import { use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

type PageParams = {
  avatarId: string;
};

export default function ViewAvatarPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { avatarId } = use(params);
  const [avatar, setAvatar] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load avatar data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await loadAvatar(avatarId);
        if (response.success && response.avatar) {
          setAvatar(response.avatar);
          if (response.avatar.image_uri) {
            try {
              const { presignedUrl } = await getPresignedUrl(response.avatar.image_uri);
              setImageUrl(presignedUrl);
            } catch (error) {
              console.error('Error getting presigned URL:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [avatarId]);

  if (isLoading) {
    return (
      <div className="bg-[#121214] flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5856d6]"></div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="bg-[#121214] flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Wrong Avatar ID</h1>
          <p className="text-white">The avatar with ID {avatarId} does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121214] flex flex-row justify-center w-full">
      <div className="bg-[#121214] w-full h-screen relative">
        {/* Main Content */}
        <main className="flex flex-col w-full h-full items-center justify-center px-[390px] py-[25px]">
          <div className="flex items-center justify-center w-full gap-2">
            {/* Character Image */}
            {imageUrl && (
              <div
                className="relative w-[525.42px] h-[937.44px] rounded-[5px] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${imageUrl})`,
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
                      {imageUrl && (
                        <img
                          className="w-[68.04px] h-[68.04px] object-cover rounded-full"
                          alt="Avatar"
                          src={imageUrl}
                        />
                      )}

                      <div className="flex flex-col gap-[7.56px] flex-1">
                        <h2 className="font-bold text-white text-[14.4px]">
                          {avatar.avatar_name}
                        </h2>
                        <p className="font-medium text-white text-[11.3px]">
                          Created by {avatar.created_by || 'Unknown'}
                        </p>
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
                    className="px-[18px] py-[7.2px] bg-[rgb(79,70,229)] hover:bg-[rgb(60,52,181)] rounded-[10.8px] text-[12.6px] transition-colors duration-200"
                  >
                    Stream with {avatar.avatar_name}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-[10.8px] py-[7.2px] rounded-[10.8px] text-[12.6px] text-white hover:bg-[rgb(29,29,30)] hover:text-white transition-colors duration-200"
                  >
                    Edit Avatar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 