import { Room } from 'livekit-client';
import { LocalUserChoices } from '@livekit/components-react';
import { ConnectionDetails } from '@/lib/types';

export interface Avatar {
  avatar_id: string;
  avatar_name: string;
  image_uri: string | null;
  prompt: string | null;
  agent_bio?: string | null;
  scene_prompt?: string | null;
  voice_id?: string | null;
  opening_prompt?: string | null;
}

export interface ChatState {
  room: Room | null;
  avatar: Avatar | null;
  connectionDetails: ConnectionDetails | null;
  presignedUrl: string;
  firstFrameReceived: boolean;
  isVideoMode: boolean;
}

export interface VideoStreamState {
  room: Room | null;
  roomName: string;
  isInitiating: boolean;
  preJoinChoices: LocalUserChoices | undefined;
  connectionDetails: ConnectionDetails | undefined;
  firstFrameReceived: boolean;
}

export interface AvatarData {
  avatar: Avatar | null;
  presignedUrl: string;
  isLoading: boolean;
  error: string | null;
}

export type PageParams = {
  avatarId: string;
}; 