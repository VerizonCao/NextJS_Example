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
} from '@livekit/components-react';
import { CustomPreJoin } from '@/app/ui/rita/prejoin';
import {
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import React from 'react';

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
}) {

  // console.log('PageClientImpl props', props);
  const router = useRouter();
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
        console.log('Got connection details:', connectionDetailsData);

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
      } catch (error) {
        console.error('Error in setup:', error);
        setRoom(null);
        setConnectionDetails(undefined);
        setPreJoinChoices(undefined);
      }
    };

    submitData();
  }, [props.roomName, props.region, props.hq, props.codec, preJoinDefaults]);

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
              // router.push(props.returnPath || '/');
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
            onRemoteJoin={() => setHadRemoteParticipant(true)}
            returnPath={props.returnPath}
            presignedUrl={props.presignedUrl}
            prompt={props.prompt}
            scene={props.scene}
            bio={props.bio}
            avatar_name={props.avatar_name}
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
}) {
  const remoteParticipants = useRemoteParticipants();
  const hasRemoteParticipant = remoteParticipants.length > 0;

  // send data code start
  
  const room = useRoomContext();
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
  }, [room, remoteParticipants.length]);


  // send data code end

  React.useEffect(() => {
    if (hasRemoteParticipant) {
      props.onRemoteJoin();
    }
  }, [hasRemoteParticipant]);

  return (
    <>
      {hasRemoteParticipant ? (
        // <VideoConference
        <VideoConferenceCustom
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
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
