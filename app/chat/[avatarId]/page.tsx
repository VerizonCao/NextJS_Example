'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Import our organized components and hooks
import { useAvatarData } from './hooks/useAvatarData';
import { useVideoStream } from './hooks/useVideoStream';
import { ChatLayout } from './components/ChatLayout';
import { ChatInfo } from './components/ChatInfo';
import { VideoStream } from './components/VideoStream';
import { TextChat } from './components/TextChat';
import { ChatControls } from './components/ChatControls';
import { Loading, Error } from './components/LoadingStates';
import { PageParams } from './types/chat.types';

export default function ChatPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  // Load avatar data
  const { avatar, presignedUrl, isLoading, error } = useAvatarData(params);
  
  // Determine if we're in video mode
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get('mode') === 'video';
  
  // Setup video streaming
  const {
    room,
    isInitiating,
    preJoinChoices,
    connectionDetails,
    firstFrameReceived
  } = useVideoStream(avatar, isVideoMode);

  // Get avatar ID for navigation
  const [avatarId, setAvatarId] = React.useState<string>('');
  React.useEffect(() => {
    params.then(resolvedParams => setAvatarId(resolvedParams.avatarId));
  }, [params]);

  // Auto-collapse sidebar when entering chat
  React.useEffect(() => {
    const collapseNavbar = () => {
      // Find the navbar collapse button and click it
      const navbar = document.querySelector('nav');
      if (navbar) {
        // Check if navbar is not already collapsed
        const isCurrentlyCollapsed = navbar.offsetWidth <= 80;
        if (!isCurrentlyCollapsed) {
          // Find the collapse button (the MenuIcon button when expanded)
          const collapseButton = navbar.querySelector('button[class*="w-8 h-8"]');
          if (collapseButton) {
            (collapseButton as HTMLButtonElement).click();
          }
        }
      }
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(collapseNavbar, 100);
    
    return () => clearTimeout(timer);
  }, []); // Only run once when component mounts

  // Loading state
  if (isLoading) {
    return <Loading isVideoMode={isVideoMode} />;
  }

  // Error state
  if (error || !avatar) {
    return <Error error={error || 'Failed to load avatar'} />;
  }

  // Video mode - New layout design
  if (isVideoMode) {
    return (
      <ChatLayout backgroundImage={presignedUrl}>
        {/* Video Section - Left */}
        <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
          <VideoStream
            avatar={avatar}
            presignedUrl={presignedUrl}
            room={room}
            preJoinChoices={preJoinChoices}
            connectionDetails={connectionDetails}
            firstFrameReceived={firstFrameReceived}
            isInitiating={isInitiating}
            avatarId={avatarId}
          />
        </div>
        
        {/* Chat Section - Right */}
        <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
          <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/20">
              {presignedUrl && (
                <img
                  className="w-10 h-10 object-cover rounded-full border border-white/20"
                  alt="Avatar"
                  src={presignedUrl}
                />
              )}
              <div className="flex flex-col flex-1">
                <h2 className="font-semibold text-white text-base drop-shadow-lg">
                  {avatar.avatar_name || 'Unknown Avatar'}
                </h2>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    firstFrameReceived ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                  }`}></div>
                  <p className="text-xs text-white/80 drop-shadow-md">
                    {firstFrameReceived ? 'Live Video Active' : 'Connecting...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Message */}
            <div className="px-4 py-2 bg-black/20 border-b border-white/20">
              <p className="text-xs text-white/60 text-center drop-shadow-md">
                Your chat is secure and encrypted
              </p>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 min-h-0">
              {room && preJoinChoices && connectionDetails && firstFrameReceived && (
                <LiveKitRoom
                  room={room}
                  token={connectionDetails.participantToken}
                  serverUrl={connectionDetails.serverUrl}
                  video={false}
                  audio={false}
                >
                  <TextChat avatar_name={avatar.avatar_name} avatarId={avatarId} />
                </LiveKitRoom>
              )}
            </div>
          </div>
        </div>
      </ChatLayout>
    );
  }

  // Regular chat mode (non-video) - Simplified design
  return (
    <ChatLayout backgroundImage={presignedUrl}>
      {/* Character Image */}
      {presignedUrl && (
        <div
          className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-l-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
          style={{
            backgroundImage: `url(${presignedUrl})`,
          }}
        />
      )}
      
      {/* Character Info - Same container logic as video chat */}
      <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
        <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
          <div className="flex flex-col h-full p-4 lg:p-[15.12px]">
            
            {/* Profile Header */}
            <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-shrink-0">
              <div className="flex items-center gap-4 lg:gap-[15.12px]">
                {presignedUrl && (
                  <img
                    className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] object-cover rounded-full flex-shrink-0 border-2 border-white/20"
                    alt="Avatar"
                    src={presignedUrl}
                  />
                )}

                <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1 min-w-0">
                  <h2 className="font-bold text-white text-lg lg:text-[16.4px] drop-shadow-lg">
                    {avatar.avatar_name || 'Unknown Avatar'}
                  </h2>
                  <p className="font-medium text-white text-base lg:text-[13.3px] drop-shadow-md">
                    {avatar.agent_bio || 'No bio available'}
                  </p>
                </div>
              </div>

              <div className="w-full h-px bg-white/20" />
            </div>

            {/* Spacer */}
            <div className="flex-1 min-h-0"></div>

            {/* Bottom Section with Start Chat Button */}
            <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0">
              <div className="border-t border-white/20 p-4 w-full">
                <Link href={`/chat/${avatarId}?mode=video`} className="w-full block">
                  <button className="flex items-center justify-center w-full bg-[#00000033] hover:bg-[#ffffff1a] rounded-full py-3 px-6 transition-colors backdrop-blur-sm">
                    <span className="text-white text-sm font-medium drop-shadow-md">Start Chat</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
