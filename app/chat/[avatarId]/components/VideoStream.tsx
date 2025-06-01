import { LiveKitRoom, LocalUserChoices } from '@livekit/components-react';
import { VideoConferenceCustom } from '@/app/components/VideoConferenceCustom';
import { Avatar } from '../types/chat.types';
import { Room } from 'livekit-client';
import { ConnectionDetails } from '@/lib/types';

interface VideoStreamProps {
  avatar: Avatar;
  presignedUrl: string;
  room: Room | null;
  preJoinChoices: LocalUserChoices | undefined;
  connectionDetails: ConnectionDetails | undefined;
  firstFrameReceived: boolean;
  isInitiating: boolean;
  avatarId: string;
}

export function VideoStream({
  avatar,
  presignedUrl,
  room,
  preJoinChoices,
  connectionDetails,
  firstFrameReceived,
  isInitiating,
  avatarId
}: VideoStreamProps) {
  return (
    <>
      {/* Global styles for LiveKit components */}
      <style jsx global>{`
        .lk-video-conference {
          height: 100% !important;
          width: 100% !important;
        }
        .lk-video-conference-inner {
          height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
        }
        .lk-grid-layout-wrapper {
          height: 100% !important;
          width: 100% !important;
        }
        .lk-grid-layout {
          height: 100% !important;
          width: 100% !important;
        }
        .lk-participant-tile {
          height: 100% !important;
          width: 100% !important;
        }
        .lk-participant-tile video {
          height: 100% !important;
          width: 100% !important;
          object-fit: cover !important;
        }
        .lk-control-bar {
          position: absolute !important;
          bottom: 10px !important;
          right: 10px !important;
          z-index: 10 !important;
        }
      `}</style>

      <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
        {/* Show original image until video is detected */}
        {!firstFrameReceived && presignedUrl && (
          <div className="relative w-full h-full">
            <div
              className="absolute inset-0 w-full h-full rounded-[5px] bg-cover bg-center shadow-lg z-10 transition-all duration-500 ease-in-out"
              style={{
                backgroundImage: `url(${presignedUrl})`,
                filter: (isInitiating || (!isInitiating && room && !firstFrameReceived)) ? 'blur(4px) brightness(0.7)' : 'none'
              }}
            />
            
            {/* Loading overlay when stream is initiating */}
            {(isInitiating || (!isInitiating && room && !firstFrameReceived)) && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 rounded-[5px]">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="text-white text-sm font-medium">
                    {isInitiating ? 'Connecting...' : 'Loading video...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* LiveKit Video - hidden until video is detected */}
        {room && preJoinChoices && connectionDetails && (
          <div 
            data-lk-theme="default" 
            style={{ 
              height: '100%', 
              width: '100%', 
              backgroundColor: '#000', 
              borderRadius: '5px', 
              overflow: 'hidden',
              position: firstFrameReceived ? 'relative' : 'absolute',
              top: firstFrameReceived ? 'auto' : 0,
              left: firstFrameReceived ? 'auto' : 0,
              opacity: firstFrameReceived ? 1 : 0,
              zIndex: firstFrameReceived ? 10 : 1,
              transition: 'opacity 0.5s ease-in-out, z-index 0s ease-in-out 0.25s'
            }}
          >
            <LiveKitRoom
              room={room}
              token={connectionDetails.participantToken}
              serverUrl={connectionDetails.serverUrl}
              video={preJoinChoices.videoEnabled}
              audio={preJoinChoices.audioEnabled}
              onDisconnected={() => {
                // Return to regular chat page when disconnected
                window.location.href = `/chat/${avatarId}`;
              }}
              style={{ height: '100%', width: '100%' }}
            >
              <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                <VideoConferenceCustom 
                  hideControlBar={false}
                  alwaysHideChat={true}
                  prompt={avatar.prompt || ''}
                  scene={avatar.scene_prompt || undefined}
                  bio={avatar.agent_bio || undefined}
                  avatar_name={avatar.avatar_name}
                  presignedUrl={presignedUrl}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </LiveKitRoom>
          </div>
        )}
      </div>
    </>
  );
} 