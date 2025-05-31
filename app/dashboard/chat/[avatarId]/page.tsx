'use client';

import { loadAvatar, getPresignedUrl, startStreamingSession, incrementAvatarRequestCounter } from '@/app/lib/actions';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { generateRoomId } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { 
  LiveKitRoom, 
  LocalUserChoices 
} from '@livekit/components-react';
import { 
  Room, 
  RoomOptions, 
  VideoCodec, 
  VideoPresets 
} from 'livekit-client';
import { VideoConferenceCustom } from '@/app/components/VideoConferenceCustom';

type PageParams = {
  avatarId: string;
};

interface Avatar {
  avatar_id: string;
  avatar_name: string;
  image_uri: string | null;
  prompt: string;
  agent_bio?: string;
  scene_prompt?: string;
  voice_id?: string;
}

const CONN_DETAILS_ENDPOINT = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';

export default function ChatPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const [avatarId, setAvatarId] = useState<string>('');
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video mode states
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get('mode') === 'video';
  const [roomInitiating, setRoomInitiating] = useState(false);
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | undefined>(undefined);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  
  const { data: session } = useSession();

  const preJoinDefaults = useMemo(() => {
    return {
      username: session?.user?.name || 'user',
      videoEnabled: false,
      audioEnabled: true,
      videoDeviceId: undefined,
      audioDeviceId: undefined,
    };
  }, [session?.user?.name]);

  // Load avatar data
  useEffect(() => {
    async function loadAvatarData() {
      try {
        const resolvedParams = await params;
        setAvatarId(resolvedParams.avatarId);
        
        const avatarResult = await loadAvatar(resolvedParams.avatarId);
        
        if (!avatarResult.success || !avatarResult.avatar) {
          notFound();
        }

        setAvatar(avatarResult.avatar);

        let url = '';
        if (avatarResult.avatar.image_uri) {
          try {
            const urlResult = await getPresignedUrl(avatarResult.avatar.image_uri);
            url = urlResult.presignedUrl;
          } catch (error) {
            console.error('Failed to get presigned URL:', error);
          }
        }
        setPresignedUrl(url);
      } catch (error) {
        console.error('Error loading avatar:', error);
        setError('Failed to load avatar');
      } finally {
        setIsLoading(false);
      }
    }

    loadAvatarData();
  }, [params]);

  // Initialize video room when in video mode
  useEffect(() => {
    if (isVideoMode && avatar && !roomInitiating && !room) {
      initiateVideoRoom();
    }
  }, [isVideoMode, avatar, roomInitiating, room]);

  const initiateVideoRoom = async () => {
    if (!avatar || !session) return;
    
    setRoomInitiating(true);
    const newRoomName = generateRoomId();
    setRoomName(newRoomName);

    try {
      // Start streaming session
      await startStreamingSession({
        instruction: "test",
        seconds: 600,
        room: newRoomName,
        avatarSource: avatar.image_uri || '',
        avatar_id: avatar.avatar_id,
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar.avatar_name,
        llmAssistantBio: avatar.agent_bio || 'this is an agent bio',
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: avatar.scene_prompt,
        ttsVoiceIdCartesia: avatar.voice_id,
        userEmail: session?.user?.email || '',
      });

      await incrementAvatarRequestCounter(avatar.avatar_id);

      // Setup LiveKit connection
      setPreJoinChoices(preJoinDefaults);

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append('roomName', newRoomName);
      url.searchParams.append('participantName', preJoinDefaults.username);
      
      const connectionDetailsResp = await fetch(url.toString());
      const connectionDetailsData = await connectionDetailsResp.json();
      setConnectionDetails(connectionDetailsData);

      const roomOptions: RoomOptions = {
        videoCaptureDefaults: {
          deviceId: preJoinDefaults.videoDeviceId ?? undefined,
          resolution: VideoPresets.h720,
        },
        publishDefaults: {
          dtx: false,
          videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
          red: true,
          videoCodec: 'VP8' as VideoCodec,
        },
        audioCaptureDefaults: {
          deviceId: preJoinDefaults.audioDeviceId ?? undefined,
        },
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
      };

      const newRoom = new Room(roomOptions);
      await newRoom.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
      setRoom(newRoom);
    } catch (error) {
      console.error('Failed to start video chat:', error);
      setError('Failed to start video chat');
    } finally {
      setRoomInitiating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-row justify-center w-full">
        <div className="w-full relative">
          <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
            <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
              <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 animate-pulse shadow-lg flex-shrink-0" />
              <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                <div className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none animate-pulse">
                  <div className="p-4 space-y-4">
                    <div className="h-6 bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-700 rounded w-full" />
                    <div className="h-4 bg-gray-700 rounded w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="flex flex-row justify-center w-full">
        <div className="w-full relative">
          <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
            <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
              <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-gray-800 shadow-lg flex-shrink-0 flex items-center justify-center">
                <div className="text-gray-500 text-6xl">?</div>
              </div>
              <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                  <CardContent className="flex flex-col justify-center items-center h-full p-4 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <h1 className="text-4xl font-bold text-white">Error</h1>
                      <p className="text-gray-400 text-lg">{error || 'Failed to load avatar'}</p>
                      <Link href="/dashboard">
                        <Button className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-colors">
                          Back to Dashboard
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Video mode with LiveKit
  if (isVideoMode) {
    if (roomInitiating || !preJoinChoices || !room || !connectionDetails) {
      return (
        <div className="flex flex-row justify-center w-full">
          <div className="w-full relative">
            <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
              <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
                
                {/* Character Image */}
                {presignedUrl && (
                  <div
                    className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
                    style={{
                      backgroundImage: `url(${presignedUrl})`,
                    }}
                  />
                )}
                
                {/* Loading Card */}
                <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                  <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                    <CardContent className="flex flex-col justify-center items-center h-full p-4 text-center">
                      
                      <div className="flex flex-col items-center gap-6">
                        {/* Loading Spinner */}
                        <div className="flex items-center justify-center gap-3">
                          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        
                        <div className="flex flex-col text-center gap-2">
                          <p className="text-white text-xl font-medium">Preparing Video Chat...</p>
                          <p className="font-normal text-neutral-300 text-sm">
                            Setting up your video session with {avatar.avatar_name}. This will only take a few seconds.
                          </p>
                        </div>
                        
                        <Link href={`/dashboard/chat/${avatarId}`}>
                          <Button className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors">
                            Cancel
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </div>
        </div>
      );
    }

    // Show video interface
    return (
      <>
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
        
        <div className="flex flex-row justify-center w-full">
          <div className="w-full relative">
            <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
              <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
                
                {/* LiveKit Video replaced the static image */}
                <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                  <div 
                    data-lk-theme="default" 
                    style={{ 
                      height: '100%', 
                      width: '100%', 
                      backgroundColor: '#000', 
                      borderRadius: '5px', 
                      overflow: 'hidden',
                      position: 'relative'
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
                        window.location.href = `/dashboard/chat/${avatarId}`;
                      }}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                        <VideoConferenceCustom 
                          hideControlBar={false}
                          alwaysHideChat={false}
                          prompt={avatar.prompt}
                          scene={avatar.scene_prompt}
                          bio={avatar.agent_bio}
                          avatar_name={avatar.avatar_name}
                          presignedUrl={presignedUrl}
                          style={{ height: '100%', width: '100%' }}
                        />
                      </div>
                    </LiveKitRoom>
                  </div>
                </div>
                
                {/* Character Info Card - Same as before */}
                <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
                  <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                    <CardContent className="flex flex-col h-full p-4 lg:p-[15.12px] overflow-y-auto">
                      
                      {/* Top Section - Scrollable */}
                      <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-1 min-h-0">
                        
                        {/* Profile Header */}
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
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <p className="font-medium text-green-400 text-sm">Live Video Chat</p>
                              </div>
                            </div>
                          </div>

                          <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
                        </div>

                        {/* About Section */}
                        <div className="flex flex-col gap-4 lg:gap-[16.2px]">
                          <h3 className="font-bold text-white text-lg">About</h3>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-white text-base">
                                Prompt
                              </h4>
                              <p className="font-medium text-white text-sm mt-2 break-words">
                                {avatar.prompt || 'No prompt available'}
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold text-white text-base lg:text-[14.6px]">
                                Scene
                              </h4>
                              <p className="font-medium text-white text-sm lg:text-[12.8px] mt-2 break-words">
                                {avatar.scene_prompt || 'No scene prompt available'}
                              </p>
                            </div>

                            {avatar.voice_id && (
                              <div>
                                <h4 className="font-semibold text-white text-base lg:text-[14.6px]">
                                  Voice
                                </h4>
                                <p className="font-medium text-white text-sm lg:text-[12.8px] mt-2 break-words">
                                  {avatar.voice_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Section - Exit Video Button */}
                      <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0">
                        <Link href={`/dashboard/chat/${avatarId}`}>
                          <Button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto">
                            Exit Video Chat
                          </Button>
                        </Link>
                        <Link href="/dashboard">
                          <Button className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto">
                            Back to Dashboard
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // Regular chat mode (existing functionality)
  return (
    <div className="flex flex-row justify-center w-full">
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
            
            {/* Character Image */}
            {presignedUrl && (
              <div
                className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
                style={{
                  backgroundImage: `url(${presignedUrl})`,
                }}
              />
            )}
            
            {/* Character Info Card */}
            <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
              <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
                <CardContent className="flex flex-col h-full p-4 lg:p-[15.12px] overflow-y-auto">
                  
                  {/* Top Section - Scrollable */}
                  <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-1 min-h-0">
                    
                    {/* Profile Header */}
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
                          <p className="font-medium text-white text-base lg:text-[13.3px]">
                            {avatar.agent_bio || 'No bio available'}
                          </p>
                        </div>
                      </div>

                      <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
                    </div>

                    {/* About Section */}
                    <div className="flex flex-col gap-4 lg:gap-[16.2px]">
                      <h3 className="font-bold text-white text-lg">About</h3>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-white text-base">
                            Prompt
                          </h4>
                          <p className="font-medium text-white text-sm mt-2 break-words">
                            {avatar.prompt || 'No prompt available'}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-white text-base lg:text-[14.6px]">
                            Scene
                          </h4>
                          <p className="font-medium text-white text-sm lg:text-[12.8px] mt-2 break-words">
                            {avatar.scene_prompt || 'No scene prompt available'}
                          </p>
                        </div>

                        {avatar.voice_id && (
                          <div>
                            <h4 className="font-semibold text-white text-base lg:text-[14.6px]">
                              Voice
                            </h4>
                            <p className="font-medium text-white text-sm lg:text-[12.8px] mt-2 break-words">
                              {avatar.voice_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section with Chat Options */}
                  <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0">
                    
                    {/* Chat Options */}
                    <div className="flex flex-col text-center gap-4 w-full">
                      <p className="text-white text-lg lg:text-xl font-medium">Choose Chat Mode</p>
                      <p className="font-normal text-neutral-300 text-sm">
                        Chat with {avatar.avatar_name} via text or video
                      </p>
                      
                      <div className="flex flex-col gap-3 w-full">
                        <Link href={`/dashboard/chat/${avatarId}?mode=video`} className="w-full">
                          <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors w-full">
                            Start Video Chat
                          </Button>
                        </Link>
                        
                        <Button 
                          disabled 
                          className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg w-full cursor-not-allowed"
                        >
                          Text Chat (Coming Soon)
                        </Button>
                      </div>
                    </div>

                    {/* Back Button */}
                    <Link href="/dashboard">
                      <Button className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto">
                        Back to Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
