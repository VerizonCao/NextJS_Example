'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startStreamingSession, incrementAvatarRequestCounter, storeUserRoomAction, deleteUserPreviousRoomAction, hasUserThumbedAvatarAction, removeAvatarThumbAction, addAvatarThumbAction } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import AvatarPopup from '@/app/ui/rita/avatar-popup';
import LoginPopup from '@/app/ui/rita/login-popup';
import { Card } from '@/app/components/card';
import MyAvatars from '@/app/ui/rita/my-avatars';
import { X, AlertCircle, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UserAvatar = {
  avatar_id: string;
  avatar_name: string;
  image_uri: string;
  create_time: Date;
  prompt: string;
  presignedUrl?: string;
  scene_prompt?: string;
  voice_id?: string;
  agent_bio?: string;
  thumb_count?: number;
};

interface HomepageAvatarsProps {
  initialAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  };
  userAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  } | null;
}

function WarningPopup({ 
  isOpen, 
  onClose, 
  currentCount, 
  maxCount 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentCount: number;
  maxCount: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2 text-white"
          onClick={onClose}
        >
          <X size={24} />
        </Button>
        <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
          <AlertCircle className="text-yellow-500 mr-2" size={28} />
          Daily Limit Reached
        </h2>
        <p className="text-white text-lg mb-2">
          You have reached your daily limit of {maxCount} streaming sessions.
        </p>
        <p className="text-gray-400 text-sm">
          Your limit will reset tomorrow. Thank you for using our service!
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomepageAvatars({ initialAvatars, userAvatars }: HomepageAvatarsProps) {
  const router = useRouter();
  const [globalSelectedAvatar, setGlobalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [streamCount, setStreamCount] = useState({ current: 0, max: 6 });
  const { data: session } = useSession();
  const [avatarThumbCounts, setAvatarThumbCounts] = useState<Record<string, number>>({});
  const [loadingThumbs, setLoadingThumbs] = useState<Record<string, boolean>>({});
  const [userThumbedAvatars, setUserThumbedAvatars] = useState<Record<string, boolean>>({});
 
  // Initialize thumb counts from initialAvatars
  useEffect(() => {
    if (initialAvatars.avatars) {
      const thumbs: Record<string, number> = {};
      initialAvatars.avatars.forEach(avatar => {
        thumbs[avatar.avatar_id] = avatar.thumb_count || 0;
      });
      setAvatarThumbCounts(thumbs);
    }
  }, [initialAvatars.avatars]);

  // Check which avatars the user has already thumbed
  useEffect(() => {
    const checkUserThumbs = async () => {
      if (session?.user?.email && initialAvatars.avatars) {
        const userEmail = session.user.email;
        const results = await Promise.all(
          initialAvatars.avatars.map(async (avatar) => {
            const { hasThumb, success } = await hasUserThumbedAvatarAction(userEmail, avatar.avatar_id);
            return { avatarId: avatar.avatar_id, hasThumb: success && hasThumb };
          })
        );
        
        const thumbedMap: Record<string, boolean> = {};
        results.forEach(result => {
          thumbedMap[result.avatarId] = result.hasThumb;
        });
        
        setUserThumbedAvatars(thumbedMap);
      }
    };
    
    checkUserThumbs();
  }, [session, initialAvatars.avatars]);

  const handleThumbClick = async (avatarId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when thumb is clicked
    
    console.log('Thumb clicked for avatar:', avatarId);
    
    if (!session) {
      console.log('No session, showing login popup');
      setShowLoginPopup(true);
      return;
    }

    if (loadingThumbs[avatarId]) {
      console.log('Already processing a thumb action for this avatar');
      return; // Prevent multiple clicks
    }

    setLoadingThumbs(prev => ({ ...prev, [avatarId]: true }));
    console.log('Set loading state for avatar:', avatarId);
    
    // Set a timeout to reset loading state after 10 seconds in case of failure
    const timeoutId = setTimeout(() => {
      console.log('Timeout reached, resetting loading state');
      setLoadingThumbs(prev => ({ ...prev, [avatarId]: false }));
    }, 10000);
    
    try {
      const userEmail = session.user?.email;
      if (!userEmail) {
        console.error('User email not found in session');
        clearTimeout(timeoutId);
        setLoadingThumbs(prev => ({ ...prev, [avatarId]: false }));
        return;
      }
      
      console.log('User email:', userEmail);

      // Check if user has already thumbed this avatar
      const hasThumb = userThumbedAvatars[avatarId] || false;
      console.log('Current thumb status for avatar:', avatarId, 'is:', hasThumb);
      
      let success = false;
      
      // Toggle thumb status
      try {
        console.log('About to call server action');
        if (hasThumb) {
          // Remove thumb
          console.log('Attempting to remove thumb');
          const result = await Promise.race([
            removeAvatarThumbAction(userEmail, avatarId),
            new Promise<{success: false, message: string}>((resolve) => 
              setTimeout(() => resolve({success: false, message: 'Timeout'}), 5000)
            )
          ]);
          console.log('Remove thumb result:', result);
          success = result.success;
          if (!success) {
            console.error('Remove thumb failed with message:', result.message);
          }
        } else {
          // Add thumb
          console.log('Attempting to add thumb');
          const result = await Promise.race([
            addAvatarThumbAction(userEmail, avatarId),
            new Promise<{success: false, message: string}>((resolve) => 
              setTimeout(() => resolve({success: false, message: 'Timeout'}), 5000)
            )
          ]);
          console.log('Add thumb result:', result);
          success = result.success;
          if (!success) {
            console.error('Add thumb failed with message:', result.message);
          }
        }
        console.log('Server action completed');
      } catch (actionError) {
        console.error('Error in server action:', actionError);
        success = false;
      }
      
      if (success) {
        console.log('Thumb action successful, updating UI');
        // Update local thumb status
        setUserThumbedAvatars(prev => {
          const newState = {
            ...prev,
            [avatarId]: !hasThumb
          };
          console.log('New userThumbedAvatars state:', newState);
          return newState;
        });
        
        // Update local thumb count
        setAvatarThumbCounts(prev => {
          const newCount = hasThumb 
            ? Math.max(0, (prev[avatarId] || 0) - 1) // Decrease count if removing thumb
            : (prev[avatarId] || 0) + 1; // Increase count if adding thumb
          
          const newState = {
            ...prev,
            [avatarId]: newCount
          };
          console.log('New avatarThumbCounts state:', newState);
          return newState;
        });
      } else {
        console.error('Thumb action failed');
      }
    } catch (error) {
      console.error('Error in handleThumbClick:', error);
    } finally {
      clearTimeout(timeoutId);
      console.log('Resetting loading state for avatar:', avatarId);
      setLoadingThumbs(prev => ({ ...prev, [avatarId]: false }));
    }
  };

  const handleStream = async (avatarId: string) => {
    if (!session) {
      setShowLoginPopup(true);
      return;
    }

    const roomName = generateRoomId();
    const avatar = initialAvatars.avatars?.find(a => a.avatar_id === avatarId);
    
    if (!avatar) return;
    
    // Delete any previous room for this user
    if (session?.user?.email) {
      deleteUserPreviousRoomAction(session.user.email, roomName);
    }

    try {
      const response = await startStreamingSession({
        instruction: "test",
        seconds: 600,
        room: roomName,
        avatarSource: avatar.image_uri,
        avatar_id: avatar.avatar_id,
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar.avatar_name,
        llmAssistantBio: avatar.prompt,
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: avatar.scene_prompt,
        ttsVoiceIdCartesia: avatar.voice_id,
        userEmail: session?.user?.email || '',
      });

      // Store the room ID for this user
      if (session?.user?.email) {
        storeUserRoomAction(session.user.email, roomName);
      }

      if (!response.success && response.error === 'LIMIT_REACHED') {
        setStreamCount({ current: response.currentCount, max: response.maxCount });
        setShowWarningPopup(true);
        return;
      }

      await incrementAvatarRequestCounter(avatarId);
      const returnPath = '/dashboard';
      const presignedUrl = avatar.presignedUrl || '';

      const query = new URLSearchParams({
        returnPath,
        presignedUrl,
        prompt: avatar.prompt || '',
        scene: avatar.scene_prompt || '',
        bio: avatar.agent_bio || '',
        avatar_name: avatar.avatar_name || '',
        avatar_id: avatar.avatar_id || '',
      }).toString();

      router.push(`/rooms/${roomName}?${query}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
    }
  };

  const selectedAvatar = initialAvatars.avatars?.find(avatar => 
    globalSelectedAvatar?.id === avatar.avatar_id && 
    globalSelectedAvatar?.type === 'rita'
  );

  if (!initialAvatars.success || !initialAvatars.avatars) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Explore Rita Avatars</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {initialAvatars.message}
        </div>
      </div>
    );
  }

  const sections = [
    (userAvatars && userAvatars.avatars && userAvatars.avatars.length > 0) && {
      id: 1,
      title: "My characters",
      component: (
        <div className="w-full">
          <MyAvatars initialAvatars={userAvatars} />
        </div>
      ),
    },
    {
      id: 2,
      title: "Explore Trending Characters",
      component: (
        <div className="flex flex-wrap justify-start gap-x-[1.5%] gap-y-[2vh] w-full max-w-[90vw]">
          {initialAvatars.avatars.map((avatar) => (
            <Card
              key={avatar.avatar_id}
              className="relative w-[18.75%] min-w-[150px] aspect-[0.56] rounded-[6.59px] overflow-hidden p-0 border-0 transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer mb-[2vh]"
              onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita' ? null : {id: avatar.avatar_id, type: 'rita'})}
            >
              {avatar.presignedUrl && (
                <>
                  <Image
                    src={avatar.presignedUrl}
                    alt={avatar.avatar_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    priority={globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita'}
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-0.5 p-3 bg-gradient-to-t from-black/80 via-black/45 to-black/1">
                    <div className="self-stretch font-['Montserrat',Helvetica] font-semibold text-white text-base leading-tight truncate">
                      {avatar.avatar_name}
                    </div>
                    <div className="self-stretch font-['Montserrat',Helvetica] font-normal text-neutral-300 text-xs leading-snug overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {avatar.agent_bio}
                    </div>
                    <div 
                      className="absolute bottom-3 right-3 flex items-center p-1.5 rounded-full bg-black/30 hover:bg-blue-900/70 transition-all duration-200 z-10 cursor-pointer"
                      onClick={(e) => handleThumbClick(avatar.avatar_id, e)}
                    >
                      <ThumbsUp size={18} className={`text-gray-300 hover:text-blue-400 transition-colors duration-200 ${loadingThumbs[avatar.avatar_id] ? 'animate-spin' : ''}`} />
                      <span className="ml-1 text-xs text-gray-300 hover:text-white transition-colors duration-200">
                        {avatarThumbCounts[avatar.avatar_id] || '0'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      ),
    },
  ].filter((section): section is { id: number; title: string; component: React.ReactElement } => Boolean(section));

  return (
    <Suspense fallback={<LoadingState />}>
      <div className="flex flex-col w-full items-center gap-[2vh] py-[2vh]">
        {sections.map((section) => (
          <React.Fragment key={section.id}>
            <div className="flex w-full max-w-[1148px] items-center justify-start gap-[1%] relative flex-[0_0_auto]">
              <div className="relative flex-1 h-[3.3vh] [font-family:'Montserrat',Helvetica] font-bold text-white text-3xl tracking-[0] leading-[normal]">
                {section.title}
              </div>
            </div>
            <div className="w-full max-w-[1148px] flex justify-start mt-[1vh]">
              {section.component}
            </div>
          </React.Fragment>
        ))}

        <AvatarPopup
          avatar={selectedAvatar ? {
            avatar_id: selectedAvatar.avatar_id,
            avatar_name: selectedAvatar.avatar_name,
            image_uri: selectedAvatar.image_uri,
            create_time: selectedAvatar.create_time,
            prompt: selectedAvatar.prompt,
            agent_bio: selectedAvatar.agent_bio,
            presignedUrl: selectedAvatar.presignedUrl,
            scene_prompt: selectedAvatar.scene_prompt,
            voice_id: selectedAvatar.voice_id,
          } : null}
          onStream={() => selectedAvatar && handleStream(selectedAvatar.avatar_id)}
          onClose={() => setGlobalSelectedAvatar(null)}
        />

        <LoginPopup 
          isOpen={showLoginPopup} 
          onClose={() => setShowLoginPopup(false)} 
        />

        <WarningPopup
          isOpen={showWarningPopup}
          onClose={() => setShowWarningPopup(false)}
          currentCount={streamCount.current}
          maxCount={streamCount.max}
        />
      </div>
    </Suspense>
  );
}
