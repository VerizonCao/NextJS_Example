import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  TrackToggle,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface ChatControlsProps {
  avatarId: string;
  showExitButton?: boolean;
}

// Microphone control component
function MicrophoneControl() {
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  const handleMicChange = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
  }, []);

  return (
    <div className="flex items-center gap-3 bg-black/20 rounded-lg px-4 py-3">
      <TrackToggle
        source={Track.Source.Microphone}
        onChange={handleMicChange}
        className="flex items-center justify-center w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors border-0"
      >
        {isMicEnabled ? (
          <Mic className="w-6 h-6 text-green-400" />
        ) : (
          <MicOff className="w-6 h-6 text-red-400" />
        )}
      </TrackToggle>
      <div className="flex flex-col">
        <span className="text-white text-sm font-medium">
          {isMicEnabled ? 'Microphone On' : 'Microphone Off'}
        </span>
        <span className="text-gray-400 text-xs">
          Click to {isMicEnabled ? 'mute' : 'unmute'}
        </span>
      </div>
    </div>
  );
}

// Exit video button component that properly disconnects from the room
function ExitVideoButton() {
  const room = useRoomContext();

  const handleExitVideo = useCallback(() => {
    if (room && room.state === 'connected') {
      // Disconnect from the room properly, just like LiveKit's DisconnectButton
      room.disconnect();
      // The onDisconnected callback will handle the navigation
    }
  }, [room]);

  return (
    <Button 
      onClick={handleExitVideo}
      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs h-auto"
    >
      Exit
    </Button>
  );
}

// Shared wrapper component for consistent chat control dimensions
interface ChatControlWrapperProps {
  children?: React.ReactNode;
  className?: string;
}

export function ChatControlWrapper({ children, className = "" }: ChatControlWrapperProps) {
  return (
    <div 
      className={`flex-shrink-0 ${className}`} 
      style={{ height: '73px' }}
    >
      {children}
    </div>
  );
}

export function ChatControls({ avatarId, showExitButton = false }: ChatControlsProps) {
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  const handleMicChange = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
  }, []);

  return (
    <ChatControlWrapper className="border-t border-white/20">
      <div className="flex flex-col items-center justify-center gap-2 h-full px-4">
        {/* Microphone Control - Compact */}
        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1">
          <TrackToggle
            source={Track.Source.Microphone}
            onChange={handleMicChange}
            className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors border-0"
          >
            {isMicEnabled ? (
              <Mic className="w-4 h-4 text-green-400" />
            ) : (
              <MicOff className="w-4 h-4 text-red-400" />
            )}
          </TrackToggle>
          <span className="text-white text-xs">Mic</span>
        </div>
        
        {/* Exit and Back Buttons - Horizontal layout */}
        <div className="flex gap-2">
          {showExitButton && (
            <ExitVideoButton />
          )}
          
          <Link href="/">
            <Button 
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3 py-1 rounded text-xs h-auto"
            >
              Home
            </Button>
          </Link>
        </div>
      </div>
    </ChatControlWrapper>
  );
} 