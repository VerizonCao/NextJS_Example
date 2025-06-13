import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Room, 
  RoomOptions, 
  VideoCodec, 
  VideoPresets 
} from 'livekit-client';
import { LocalUserChoices } from '@livekit/components-react';
import { startStreamingSession, incrementAvatarRequestCounter, storeUserRoomAction, deleteUserPreviousRoomAction } from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { Avatar, VideoStreamState } from '../types/chat.types';

const CONN_DETAILS_ENDPOINT = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';

export function useVideoStream(avatar: Avatar | null, isVideoMode: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [isInitiating, setIsInitiating] = useState(false);
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | undefined>(undefined);
  const [firstFrameReceived, setFirstFrameReceived] = useState(false);
  
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

  // Check for video element and agent-avatar role
  useEffect(() => {
    if (!isVideoMode || !room) return;

    const checkForVideoAndAgent = () => {
      const videoElement = document.querySelector('.lk-participant-media-video[data-lk-local-participant="false"]');
      const hasAgentAvatar = Array.from(room.remoteParticipants.values()).some(participant =>
        participant.attributes?.role === 'agent-avatar'
      );
      
      if (videoElement && hasAgentAvatar && !firstFrameReceived) {
        console.log('Remote video element and agent avatar found!');
        setFirstFrameReceived(true);
      }
    };

    // Check immediately
    checkForVideoAndAgent();

    // Then check every 0.5 seconds
    const interval = setInterval(checkForVideoAndAgent, 500);

    // Cleanup interval when component unmounts or video is found
    return () => {
      clearInterval(interval);
    };
  }, [isVideoMode, room, firstFrameReceived]);

  const initiateVideoRoom = useCallback(async () => {
    if (!avatar || !session) return;
    
    setIsInitiating(true);
    const newRoomName = generateRoomId();
    setRoomName(newRoomName);


    deleteUserPreviousRoomAction(session?.user?.email || '', newRoomName);

    storeUserRoomAction(session?.user?.email || '', newRoomName);

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
        llmAssistantAdditionalCharacteristics: avatar.prompt || '',
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
      throw error;
    } finally {
      setIsInitiating(false);
    }
  }, [avatar, session, preJoinDefaults]);

  // Cleanup effect when leaving video mode or unmounting
  useEffect(() => {
    if (!isVideoMode) {
      if (room) {
        room.disconnect();
        setRoom(null);
      }
      setRoomName('');
      setFirstFrameReceived(false);
    }
  }, [isVideoMode, room]);

  // Initialize video room when in video mode
  useEffect(() => {
    if (isVideoMode && avatar && !isInitiating && !room) {
      initiateVideoRoom();
    }
  }, [isVideoMode, avatar, isInitiating, room, initiateVideoRoom]);

  return {
    room,
    roomName,
    isInitiating,
    preJoinChoices,
    connectionDetails,
    firstFrameReceived,
    initiateVideoRoom
  };
} 