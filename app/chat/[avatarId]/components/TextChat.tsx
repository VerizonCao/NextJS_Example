import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  useChat,
  ChatEntry,
  useRoomContext
} from '@livekit/components-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TextChatProps {
  avatar_name: string;
}

export function TextChat({ avatar_name }: TextChatProps) {
  const { chatMessages, send, isSending } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const room = useRoomContext();
  const lastProcessedIndex = useRef<number>(-1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Add voice transcription handling
  useEffect(() => {
    if (!room) return;

    // Handle incoming data messages for voice transcription
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
          
          // Add transcription to chat history using send function
          console.log('Adding voice transcription to chat:', data.resp.text);
          await send(data.resp.text);
        }
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    };

    // Subscribe to data messages
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inputRef.current && inputRef.current.value.trim() !== '') {
      await send(inputRef.current.value);
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex-shrink-0 pb-4">
        <h3 className="font-bold text-white text-lg drop-shadow-lg">Chat with {avatar_name}</h3>
        <p className="text-white/80 text-sm mt-1 drop-shadow-md">Send messages to interact during video chat</p>
        <p className="text-white/60 text-xs mt-1 drop-shadow-md">Voice transcriptions will appear automatically</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-3 mb-4 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/60 text-sm">
            Start a conversation with {avatar_name}
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map((msg, idx, allMsg) => {
              const hideName = idx >= 1 && allMsg[idx - 1].from === msg.from;
              return (
                <div key={msg.id ?? idx} className="text-white drop-shadow-md">
                  <ChatEntry
                    hideName={hideName}
                    hideTimestamp={false}
                    entry={msg}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder={`Message ${avatar_name}...`}
          disabled={isSending}
          className="flex-1 bg-black/40 backdrop-blur-sm border-white/20 text-white placeholder-white/60 focus:border-blue-400/50 focus:ring-blue-400/20"
        />
        <Button 
          type="submit" 
          disabled={isSending}
          className="bg-blue-600/80 hover:bg-blue-700/80 backdrop-blur-sm border border-blue-500/30 text-white px-4 drop-shadow-md"
        >
          Send
        </Button>
      </form>
    </div>
  );
} 