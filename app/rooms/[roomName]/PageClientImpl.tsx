'use client';

import { decodePassphrase } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import {
  formatChatMessageLinks,
  LiveKitRoom,
  LocalUserChoices,
  VideoConference,
  useRemoteParticipants,
  useRoomContext,
  useChat,
} from '@livekit/components-react';
import { CustomPreJoin } from '@/app/ui/rita/prejoin';
import {
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  RoomEvent,
  RemoteVideoTrack,
  TrackEvent,
} from 'livekit-client';
import { useRouter, usePathname } from 'next/navigation';
import React from 'react';
import { removeParticipant, reportAvatarServeTime } from '@/app/lib/actions';
import { useSession } from 'next-auth/react';

// custom video conference
import { VideoConferenceCustom } from '@/app/components/VideoConferenceCustom';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
  returnPath?: string;
  presignedUrl?: string;
  prompt?: string;
  scene?: string;
  bio?: string;
  avatar_name?: string;
  avatar_id?: string;
}) {

  const router = useRouter();
  const pathname = usePathname();
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: 'user',
      videoEnabled: false,
      audioEnabled: true,
      videoDeviceId: undefined,
      audioDeviceId: undefined,
    };
  }, []);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );
  const [room, setRoom] = React.useState<Room | null>(null);
  const [hasConnected, setHasConnected] = React.useState(false);
  const [hadRemoteParticipant, setHadRemoteParticipant] = React.useState(false);
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const { data: session } = useSession();
  
  React.useEffect(() => {
    const submitData = async () => {
      try {
        const values = preJoinDefaults;
        setPreJoinChoices(values);

        const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
        url.searchParams.append('roomName', props.roomName);
        url.searchParams.append('participantName', values.username);
        if (props.region) {
          url.searchParams.append('region', props.region);
        }
        const connectionDetailsResp = await fetch(url.toString());
        const connectionDetailsData = await connectionDetailsResp.json();
        setConnectionDetails(connectionDetailsData);

        const roomOptions: RoomOptions = {
          videoCaptureDefaults: {
            deviceId: values.videoDeviceId ?? undefined,
            resolution: props.hq ? VideoPresets.h2160 : VideoPresets.h720,
          },
          publishDefaults: {
            dtx: false,
            videoSimulcastLayers: props.hq
              ? [VideoPresets.h1080, VideoPresets.h720]
              : [VideoPresets.h540, VideoPresets.h216],
            red: true,
            videoCodec: props.codec,
          },
          audioCaptureDefaults: {
            deviceId: values.audioDeviceId ?? undefined,
          },
          adaptiveStream: { pixelDensity: 'screen' },
          dynacast: true,
        };

        const newRoom = new Room(roomOptions);
        await newRoom.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
        console.log('Created new room instance');
        setRoom(newRoom);
        setHasConnected(true);

        // Add cleanup function to remove participant when leaving the page
        const handleBeforeUnload = async () => {
          if (newRoom && newRoom.state === 'connected') {
            try {
              // await removeParticipant(props.roomName, newRoom.localParticipant.identity);
            } catch (error) {
              // Silently ignore participant not found errors
              if (!(error instanceof Error && error.message.includes('participant not found'))) {
                console.error('Error removing participant:', error);
              }
            }
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          if (newRoom && newRoom.state === 'connected') {
            // removeParticipant(props.roomName, newRoom.localParticipant.identity).catch((error) => {
            //   if (!(error instanceof Error && error.message.includes('participant not found'))) {
            //     console.error('Error removing participant:', error);
            //   }
            // });
          }
        };
      } catch (error) {
        console.error('Error in setup:', error);
        setRoom(null);
        setConnectionDetails(undefined);
        setPreJoinChoices(undefined);
      }
    };

    submitData();
  }, [props.roomName, props.region, props.hq, props.codec, preJoinDefaults]);

  // Add cleanup effect for room
  React.useEffect(() => {
    if (!room) return;

    const handleRouteChange = async () => {
      if (room.state === 'connected') {
        try {
          // await removeParticipant(props.roomName, room.localParticipant.identity);
        } catch (error) {
          if (!(error instanceof Error && error.message.includes('participant not found'))) {
            console.error('Error removing participant:', error);
          }
        }
      }
    };

    // Handle browser/tab close
    const handleBeforeUnload = () => {
      if (room.state === 'connected') {
        // removeParticipant(props.roomName, room.localParticipant.identity).catch((error) => {
        //   if (!(error instanceof Error && error.message.includes('participant not found'))) {
        //     console.error('Error removing participant:', error);
        //   }
        // });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Check if we're leaving the room page
    const checkPath = () => {
      if (!pathname?.startsWith(`/rooms/${props.roomName}`)) {
        handleRouteChange();
      }
    };

    // Run check periodically
    const interval = setInterval(checkPath, 1000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      if (room.state === 'connected') {
        // removeParticipant(props.roomName, room.localParticipant.identity).catch((error) => {
        //   if (!(error instanceof Error && error.message.includes('participant not found'))) {
        //     console.error('Error removing participant:', error);
        //   }
        // });
      }
    };
  }, [room, props.roomName, pathname]);

  return (
    // <main data-lk-theme="default" style={{ height: '80vh' }}>
    <main data-lk-theme="default" style={{ height: '100vh', backgroundColor: '#000' }}>
      {!preJoinChoices || !room || !connectionDetails ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <CustomPreJoin 
            returnPath={props.returnPath} 
            presignedUrl={props.presignedUrl}
            prompt={props.prompt}
            scene={props.scene}
            bio={props.bio}
            avatar_name={props.avatar_name}
          />
        </div>
      ) : (
        <LiveKitRoom
          room={room}
          token={connectionDetails.participantToken}
          serverUrl={connectionDetails.serverUrl}
          video={preJoinChoices.videoEnabled}
          audio={preJoinChoices.audioEnabled}
          onDisconnected={() => {
            if (hasConnected && hadRemoteParticipant) {
              console.log('Room disconnected, navigating to return path is', props.returnPath);
              
              // Report serve time before navigation if we have the necessary data
              if (startTime && props.avatar_id && session?.user?.email) {
                const endTime = Date.now();
                const serveTimeSeconds = Math.round((endTime - startTime) / 1000); // Convert to seconds
                
                // Only report if serve time is reasonable (more than 1 second)
                if (serveTimeSeconds > 1) {
                  console.log('Reporting avatar serve time:', serveTimeSeconds);
                  reportAvatarServeTime(props.avatar_id, session.user.email, serveTimeSeconds)
                    .catch(error => console.error('Error reporting avatar serve time:', error));
                }
              }
              
              setTimeout(() => {
                router.push(props.returnPath || '/');
              }, 0); // defer navigation after React event loop
            } else {
              console.log('Disconnected early, but no redirect because remote never joined');
            }
          }}
        >
          <RoomContent
            userChoices={preJoinChoices}
            connectionDetails={connectionDetails}
            options={{ codec: props.codec, hq: props.hq }}
            onRemoteJoin={() => {
              setHadRemoteParticipant(true);
              setStartTime(Date.now());
            }}
            returnPath={props.returnPath}
            presignedUrl={props.presignedUrl}
            prompt={props.prompt}
            scene={props.scene}
            bio={props.bio}
            avatar_name={props.avatar_name}
            avatar_id={props.avatar_id}
          />
        </LiveKitRoom>
      )}
    </main>
  );
}

function RoomContent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
  onRemoteJoin: () => void;
  returnPath?: string;
  presignedUrl?: string;
  prompt?: string;
  scene?: string;
  bio?: string;
  avatar_name?: string;
  avatar_id?: string;
}) {
  const remoteParticipants = useRemoteParticipants();
  const hasRemoteParticipant = remoteParticipants.length > 0;
  const [showVideoConference, setShowVideoConference] = React.useState(false);
  const { send } = useChat();
  const lastProcessedIndex = React.useRef<number>(-1);
  const { data: session } = useSession();
  const startTimeRef = React.useRef<number | null>(null);
  const room = useRoomContext();

  // Set start time when remote participant joins
  React.useEffect(() => {
    if (hasRemoteParticipant && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      props.onRemoteJoin();
    }
  }, [hasRemoteParticipant, props]);

  // Add cleanup effect to report serve time when leaving
  // React.useEffect(() => {
  //   return () => {
  //     if (startTimeRef.current && props.avatar_id && session?.user?.email) {
  //       const endTime = Date.now();
  //       const serveTimeSeconds = Math.round((endTime - startTimeRef.current) / 1000); // Convert to seconds
        
  //       // Only report if serve time is reasonable (more than 1 second)
  //       if (serveTimeSeconds > 1) {
  //         console.log('reporting avatar serve time: ', serveTimeSeconds);
  //         reportAvatarServeTime(props.avatar_id, session.user.email, serveTimeSeconds)
  //           .catch(error => console.error('Error reporting avatar serve time:', error));
  //       }
  //     }
  //   };
  // }, [props.avatar_id, session?.user?.email]);

  // Reset index when remote participant disconnects
  React.useEffect(() => {
    if (!hasRemoteParticipant) {
      lastProcessedIndex.current = -1;
    }
  }, [hasRemoteParticipant]);

  // Add data sending functionality
  React.useEffect(() => {
    if (!room) return;

    const sendCustomData = () => {
      // Only send data if room is connected
      if (room.state !== 'connected') {
        console.log('Room not connected, skipping data send');
        return;
      }

      try {
        const customData = {
          timestamp: Date.now(),
          roomName: room.name,
          participantCount: remoteParticipants.length + 1, // +1 for local participant
          // Add any other custom data you want to send
        };

        // Send data to all participants
        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(customData)),
          { reliable: true } // ensure data delivery
        );
      } catch (error) {
        console.error('Error sending custom data:', error);
      }
    };

    // Handle incoming data messages
    const handleDataReceived = async (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        // Handle voice transcription data
        if (data.type === 'voice_transcription' && data.resp.index !== undefined) {
          // Only process if this is a new index
          if (data.resp.index <= lastProcessedIndex.current) {
            return;
          }
          
          // Update last processed index
          lastProcessedIndex.current = data.resp.index;
          // Add message to chat history using send function
          await send(data.resp.text);
        }
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    };

    // Subscribe to data messages
    room.on('dataReceived', handleDataReceived);

    // Add resolution detection
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'video') {
        const videoTrack = track as RemoteVideoTrack;
        videoTrack.on(TrackEvent.VideoDimensionsChanged, (dimensions) => {
          console.log(`Resolution changed to: ${dimensions.width}x${dimensions.height}`);
        });
      }
    });

    // Only start sending data when room is connected
    const handleRoomConnected = () => {
      sendCustomData();
      const interval = setInterval(sendCustomData, 5000);
      return () => clearInterval(interval);
    };

    let cleanup: (() => void) | undefined;

    if (room.state === 'connected') {
      cleanup = handleRoomConnected();
    }

    room.on('connected', () => {
      cleanup = handleRoomConnected();
    });

    room.on('disconnected', () => {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [room, remoteParticipants.length, send]);

  React.useEffect(() => {
    if (hasRemoteParticipant) {
      // Add 2 second delay before showing video conference
      const timer = setTimeout(() => {
        setShowVideoConference(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowVideoConference(false);
    }
  }, [hasRemoteParticipant]);

  return (
    <>
      {showVideoConference ? (
        <VideoConferenceCustom
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
          prompt={props.prompt}
          scene={props.scene}
          bio={props.bio}
          avatar_name={props.avatar_name}
          presignedUrl={props.presignedUrl}
        />
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <CustomPreJoin 
            returnPath={props.returnPath} 
            presignedUrl={props.presignedUrl}
            prompt={props.prompt}
            scene={props.scene}
            bio={props.bio}
            avatar_name={props.avatar_name}
          />
        </div>
      )}
      <DebugMode />
      <RecordingIndicator />
    </>
  );
}
