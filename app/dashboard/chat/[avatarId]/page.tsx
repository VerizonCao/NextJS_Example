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

  // Loading state
  if (isLoading) {
    return <Loading isVideoMode={isVideoMode} />;
  }

  // Error state
  if (error || !avatar) {
    return <Error error={error || 'Failed to load avatar'} />;
  }

  // Video mode - show video interface immediately when in video mode
  if (isVideoMode) {
    const statusComponent = (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          firstFrameReceived ? 'bg-green-500' : 
          'bg-yellow-500 animate-pulse'
        }`}></div>
        <p className={`font-medium text-sm ${
          firstFrameReceived ? 'text-green-400' : 
          'text-yellow-400'
        }`}>
          {firstFrameReceived ? 'Live Video Active' : 
           isInitiating ? 'Connecting...' :
           room ? 'Loading Video...' :
           'Preparing...'}
        </p>
      </div>
    );

    return (
      <ChatLayout backgroundImage={presignedUrl}>
        {/* Video Stream - handles its own loading states */}
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
        
        {/* Chat Panel - Semi-transparent */}
        <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
          <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-[5px] border border-white/10 overflow-hidden">
            <div className="flex flex-col h-full p-4 lg:p-[15.12px]">
              
              {/* Profile Header with Status */}
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
                    {statusComponent}
                  </div>
                </div>

                <div className="w-full h-px bg-white/20" />
              </div>

              {/* Text Chat Section - Only show when video is actually received */}
              {room && preJoinChoices && connectionDetails && firstFrameReceived && (
                <div className="flex flex-col flex-1 min-h-0 mt-4">
                  <LiveKitRoom
                    room={room}
                    token={connectionDetails.participantToken}
                    serverUrl={connectionDetails.serverUrl}
                    video={false}
                    audio={false}
                  >
                    <TextChat avatar_name={avatar.avatar_name} />
                  </LiveKitRoom>
                </div>
              )}

              {/* Exit Button - Only show when video is actually received */}
              {room && preJoinChoices && connectionDetails && firstFrameReceived && (
                <div className="flex flex-col items-center gap-4 mt-4 flex-shrink-0">
                  <LiveKitRoom
                    room={room}
                    token={connectionDetails.participantToken}
                    serverUrl={connectionDetails.serverUrl}
                    video={false}
                    audio={false}
                  >
                    <ChatControls avatarId={avatarId} showExitButton={true} />
                  </LiveKitRoom>
                </div>
              )}
            </div>
          </div>
        </div>
      </ChatLayout>
    );
  }

  // Regular chat mode (non-video)
  return (
    <ChatLayout backgroundImage={presignedUrl}>
      {/* Character Image */}
      {presignedUrl && (
        <div
          className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
          style={{
            backgroundImage: `url(${presignedUrl})`,
          }}
        />
      )}
      
      {/* Character Info - Semi-transparent */}
      <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
        <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-[5px] border border-white/10 overflow-hidden">
          <div className="flex flex-col h-full p-4 lg:p-[15.12px] overflow-y-auto">
            
            {/* Top Section - Scrollable */}
            <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-1 min-h-0">
              
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

              {/* About Section */}
              <div className="flex flex-col gap-4 lg:gap-[16.2px]">
                <h3 className="font-bold text-white text-lg drop-shadow-lg">About</h3>
              </div>
            </div>

            {/* Bottom Section with Chat Options */}
            <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0">
              
              {/* Chat Options */}
              <div className="flex flex-col text-center gap-4 w-full">
                <p className="text-white text-lg lg:text-xl font-medium drop-shadow-lg">Choose Chat Mode</p>
                <p className="font-normal text-white/80 text-sm drop-shadow-md">
                  Chat with {avatar.avatar_name} via text or video
                </p>
                
                <div className="flex flex-col gap-3 w-full">
                  <Link href={`/dashboard/chat/${avatarId}?mode=video`} className="w-full">
                    <Button className="bg-green-600/80 hover:bg-green-700/80 backdrop-blur-sm border border-green-500/30 text-white px-6 py-3 rounded-lg transition-colors w-full drop-shadow-md">
                      Start Video Chat
                    </Button>
                  </Link>
                  
                  <Button 
                    disabled 
                    className="bg-gray-600/60 backdrop-blur-sm border border-gray-500/30 text-gray-300 px-6 py-3 rounded-lg w-full cursor-not-allowed"
                  >
                    Text Chat (Coming Soon)
                  </Button>
                </div>
              </div>

              {/* Back Button */}
              <Link href="/dashboard">
                <Button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto drop-shadow-md">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
