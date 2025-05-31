'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';

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
      <ChatLayout>
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
        
        {/* Chat Panel */}
        <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
          <div className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
            <div className="flex flex-col h-full p-4 lg:p-[15.12px]">
              
              {/* Profile Header with Status */}
              <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-shrink-0">
                <div className="flex items-center gap-4 lg:gap-[15.12px]">
                  {presignedUrl && (
                    <img
                      className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] object-cover rounded-full flex-shrink-0"
                      alt="Avatar"
                      src={presignedUrl}
                    />
                  )}

                  <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1 min-w-0">
                    <h2 className="font-bold text-white text-lg lg:text-[16.4px]">
                      {avatar.avatar_name || 'Unknown Avatar'}
                    </h2>
                    {statusComponent}
                  </div>
                </div>

                <div className="w-full h-px bg-[rgb(29,29,30)]" />
              </div>

              {/* Text Chat Section - Only show when room is ready */}
              {room && preJoinChoices && connectionDetails && (
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

              {/* Exit Button - Only show when room is ready */}
              {room && preJoinChoices && connectionDetails && (
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
    <ChatLayout>
      {/* Character Image */}
      {presignedUrl && (
        <div
          className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
          style={{
            backgroundImage: `url(${presignedUrl})`,
          }}
        />
      )}
      
      {/* Character Info */}
      <ChatInfo
        avatar={avatar}
        presignedUrl={presignedUrl}
        avatarId={avatarId}
      />
    </ChatLayout>
  );
}
