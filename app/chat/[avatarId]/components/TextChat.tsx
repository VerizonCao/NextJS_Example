import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  useChat,
  ChatEntry,
  useRoomContext,
  TrackToggle
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, Send, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TextChatProps {
  avatar_name: string;
  avatarId: string;
}

export function TextChat({ avatar_name, avatarId }: TextChatProps) {
  const { chatMessages, send, isSending } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const room = useRoomContext();
  const router = useRouter();
  const lastProcessedIndex = useRef<number>(-1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Handle voice transcription
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = async (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        if (data.type === 'voice_transcription' && data.resp.index !== undefined) {
          if (data.resp.index <= lastProcessedIndex.current) {
            return;
          }
          
          lastProcessedIndex.current = data.resp.index;
          console.log('Adding voice transcription to chat:', data.resp.text);
          await send(data.resp.text);
        }
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, send]);

  // Reset transcription index when leaving
  useEffect(() => {
    return () => {
      lastProcessedIndex.current = -1;
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() !== '') {
      await send(inputValue);
      setInputValue('');
    }
  };

  const handleMicChange = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
  }, []);

  const handleLeaveChat = () => {
    if (room && room.state === 'connected') {
      room.disconnect();
    }
    router.push('/');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages - Direct on panel */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/60 text-sm drop-shadow-md">
            Start a conversation...
          </div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((msg, idx) => {
              const isUser = msg.from?.identity !== 'avatar';
              return (
                <div key={msg.id ?? idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 break-words text-xs ${
                    isUser 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-gray-900 text-white'
                  }`}>
                    <div className="whitespace-pre-wrap">
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Area */}
      <div className="border-t border-white/20 p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          {/* Microphone Control - Custom button that controls LiveKit */}
          <button
            type="button"
            onClick={() => {
              // Find the actual LiveKit TrackToggle and trigger it
              const micToggle = document.querySelector('[data-testid="microphone_toggle"]') as HTMLButtonElement;
              if (micToggle) {
                micToggle.click();
                setIsMicEnabled(!isMicEnabled);
              }
            }}
            className="flex items-center justify-center w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full transition-colors border-0 flex-shrink-0 backdrop-blur-sm"
          >
            {isMicEnabled ? (
              <Mic className="w-5 h-5 text-white" />
            ) : (
              <MicOff className="w-5 h-5 text-red-400" />
            )}
          </button>

          {/* Hidden LiveKit TrackToggle for actual functionality */}
          <TrackToggle
            source={Track.Source.Microphone}
            onChange={handleMicChange}
            className="hidden"
            data-testid="microphone_toggle"
          />

          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Enter to send, Shift+Enter for new line"
              disabled={isSending}
              className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:border-white/20 text-xs"
            />
          </div>

          {/* Send Button */}
          <button 
            type="submit" 
            disabled={isSending || !inputValue.trim()}
            className="flex items-center justify-center w-10 h-10 bg-[#00000033] hover:bg-[#ffffff1a] disabled:bg-gray-600/60 disabled:cursor-not-allowed rounded-full transition-colors flex-shrink-0 backdrop-blur-sm"
          >
            <Send className="w-5 h-5 text-white" />
          </button>

          {/* 3-Dots Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center justify-center w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex-shrink-0 backdrop-blur-sm"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute bottom-12 right-0 min-w-[150px] bg-black/80 backdrop-blur-sm rounded-md shadow-lg border border-white/20 z-[999999]">
                <div className="p-1">
                  <button
                    onClick={handleLeaveChat}
                    className="flex items-center px-3 py-2 text-xs text-white bg-gray-800 hover:bg-gray-700 rounded-md cursor-pointer w-full justify-start transition-colors"
                  >
                    Leave Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 