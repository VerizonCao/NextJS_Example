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
} from '@livekit/components-react';
import { CustomPreJoin } from '@/app/ui/rita/prejoin';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import React from 'react';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
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
  const [roomConnected, setRoomConnected] = React.useState(false);

  // Submit data when component mounts
  React.useEffect(() => {
    const submitData = async () => {
      try {
        console.log('Submitting data...');
        const values = preJoinDefaults;
        setPreJoinChoices(values);
        
        // Get connection details
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

        // Create room options
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

        // Create and connect to room
        const newRoom = new Room(roomOptions);
        console.log('Created new room instance');
        setRoom(newRoom);

        // Connect to room with proper error handling
        try {
          console.log('Attempting to connect to room...');
          await newRoom.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken, {
            autoSubscribe: true,
          });
          console.log('Successfully connected to room');
          setRoomConnected(true);
        } catch (error) {
          console.error('Error connecting to room:', error);
          // Clean up on error
          newRoom.disconnect();
          setRoom(null);
          setRoomConnected(false);
          setConnectionDetails(undefined);
          setPreJoinChoices(undefined);
          throw error;
        }
      } catch (error) {
        console.error('Error in setup:', error);
        // Reset all state on error
        setRoom(null);
        setRoomConnected(false);
        setConnectionDetails(undefined);
        setPreJoinChoices(undefined);
      }
    };

    submitData();
  }, [props.roomName, props.region, props.hq, props.codec, preJoinDefaults]);

  const handleLeave = React.useCallback(() => {
    console.log('User requested to leave room...');
    if (room) {
      room.disconnect();
    }
    setRoom(null);
    setRoomConnected(false);
    setConnectionDetails(undefined);
    setPreJoinChoices(undefined);
    router.push('/');
  }, [room, router]);

  // Handle room disconnection events
  React.useEffect(() => {
    if (room) {
      const handleDisconnected = () => {
        console.log('Room disconnected, attempting to reconnect...');
        // Always attempt to reconnect unless it's a user-initiated leave
        room.connect(connectionDetails?.serverUrl || '', connectionDetails?.participantToken || '', {
          autoSubscribe: true,
        }).catch((error) => {
          console.error('Failed to reconnect:', error);
        });
      };

      room.on('disconnected', handleDisconnected);
      return () => {
        room.off('disconnected', handleDisconnected);
      };
    }
  }, [room, connectionDetails]);

  return (
    <main data-lk-theme="default" style={{ height: '80vh' }}>     
      {!preJoinChoices || !room || !connectionDetails || !roomConnected ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <CustomPreJoin onLeave={handleLeave} />
        </div>
      ) : (
        <LiveKitRoom
          room={room}
          token={connectionDetails.participantToken}
          serverUrl={connectionDetails.serverUrl}
          connect={true}
          video={preJoinChoices.videoEnabled}
          audio={preJoinChoices.audioEnabled}
          onDisconnected={() => {
            console.log('Room disconnected, attempting to reconnect...');
            room.connect(connectionDetails.serverUrl, connectionDetails.participantToken, {
              autoSubscribe: true,
            }).catch((error) => {
              console.error('Failed to reconnect:', error);
            });
          }}
        >
          <RoomContent
            userChoices={preJoinChoices}
            connectionDetails={connectionDetails}
            options={{ codec: props.codec, hq: props.hq }}
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
}) {
  const remoteParticipants = useRemoteParticipants();
  const hasRemoteParticipant = remoteParticipants.length > 0;
  console.log('hasRemoteParticipant!!!!', hasRemoteParticipant);
  return (
    <>
      {hasRemoteParticipant ? (
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-lg font-medium text-gray-700">Waiting for agent to join...</div>
          <div className="mt-2 text-sm text-gray-500">You will be automatically connected when the agent is ready.</div>
        </div>
      )}
      <DebugMode />
      <RecordingIndicator />
    </>
  );
}
