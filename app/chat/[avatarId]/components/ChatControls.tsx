import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  TrackToggle,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';
import Link from 'next/link';

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
      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto"
    >
      Exit Video Chat
    </Button>
  );
}

export function ChatControls({ avatarId, showExitButton = false }: ChatControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4 mt-4 flex-shrink-0">
      {/* Microphone Control */}
      <MicrophoneControl />
      
      {/* Exit and Back Buttons */}
      {showExitButton && <ExitVideoButton />}
      
      <Link href="/">
        <Button 
          variant="secondary"
          className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
        >
          Return to Home
        </Button>
      </Link>
    </div>
  );
} 