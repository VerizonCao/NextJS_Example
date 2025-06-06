import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  useChat,
  useRoomContext,
  TrackToggle
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, Send, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatControlWrapper } from './ChatControls';
import './scrollbar.css';

// Text message structure
interface TextMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLocal?: boolean; // Flag to distinguish local vs LiveKit messages
  isStreaming?: boolean; // Flag for streaming assistant messages
}

// Display message structure (for initial messages from database)
interface DisplayMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface TextChatProps {
  avatar_name: string;
  avatarId: string;
  initialMessages?: DisplayMessage[]; // Previous chat messages to display
  previewMode?: boolean; // If true, chat input is disabled
  onLeaveChat?: () => void; // Callback for when user wants to leave chat
}

// Convert display messages to text message format
const convertDisplayToText = (displayMessages: DisplayMessage[]): TextMessage[] => {
  return displayMessages.map(msg => ({
    ...msg,
    isLocal: false,
    isStreaming: false
  }));
};

export function TextChat({ avatar_name, avatarId, initialMessages, previewMode, onLeaveChat }: TextChatProps) {
  // LiveKit chat for sending messages and receiving responses - only use when not in preview mode
  const { chatMessages: liveKitMessages, send: liveKitSend, isSending } = previewMode ? 
    { chatMessages: [], send: async () => {}, isSending: false } : 
    useChat();
  
  // Text chat state
  const [textMessages, setTextMessages] = useState<TextMessage[]>(
    initialMessages ? convertDisplayToText(initialMessages) : []
  );
  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const room = previewMode ? null : useRoomContext();
  const router = useRouter();
  const lastProcessedIndex = useRef<number>(-1);
  const lastLiveKitMessageCount = useRef<number>(0);
  const streamingMessageId = useRef<string | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Instant scroll to bottom with no animation
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  // Default to bottom on any state change or transition
  useEffect(() => {
    scrollToBottom();
  }, [textMessages, currentStreamingMessage, previewMode]);

  // Also scroll to bottom when component first mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle text streaming from LiveKit data channels - only in non-preview mode
  useEffect(() => {
    if (!room || previewMode) return;

    const handleDataReceived = async (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        // Handle voice transcription
        if (data.type === 'voice_transcription' && data.resp.index !== undefined) {
          if (data.resp.index <= lastProcessedIndex.current) {
            return;
          }
          
          lastProcessedIndex.current = data.resp.index;
          console.log('Adding voice transcription to text chat:', data.resp.text);
          
          // Add user message to text state immediately
          const userMessage: TextMessage = {
            id: `user-voice-${data.resp.index}`,
            content: data.resp.text,
            role: 'user',
            timestamp: new Date(),
            isLocal: true
          };
          
          setTextMessages(prev => [...prev, userMessage]);
          
          // Send to LiveKit for model processing
          await liveKitSend(data.resp.text);
        }
        
        // Handle text streaming from the model
        if (data.topic === 'llm_data') {
          if (data.text === '[START]') {
            // Start a new streaming message
            const messageId = `assistant-stream-${Date.now()}`;
            streamingMessageId.current = messageId;
            setCurrentStreamingMessage('');
            
            // Add placeholder message
            const assistantMessage: TextMessage = {
              id: messageId,
              content: '',
              role: 'assistant',
              timestamp: new Date(),
              isLocal: false,
              isStreaming: true
            };
            
            setTextMessages(prev => [...prev, assistantMessage]);
          } else if (data.text === '[DONE]' || data.text === '[INTERRUPTED]') {
            // Finalize the streaming message
            if (streamingMessageId.current) {
              setTextMessages(prev => 
                prev.map(msg => 
                  msg.id === streamingMessageId.current 
                    ? { ...msg, content: currentStreamingMessage, isStreaming: false }
                    : msg
                )
              );
              setCurrentStreamingMessage('');
              streamingMessageId.current = null;
            }
          } else {
            // Append to streaming message
            setCurrentStreamingMessage(prev => prev + data.text);
            
            // Update the streaming message in real-time
            if (streamingMessageId.current) {
              setTextMessages(prev => 
                prev.map(msg => 
                  msg.id === streamingMessageId.current 
                    ? { ...msg, content: currentStreamingMessage + data.text }
                    : msg
                )
              );
            }
          }
        }
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, liveKitSend, currentStreamingMessage, previewMode]);

  // Monitor LiveKit messages for assistant responses (fallback) - only in non-preview mode
  useEffect(() => {
    if (previewMode || liveKitMessages.length <= lastLiveKitMessageCount.current) return;
    
    const newMessages = liveKitMessages.slice(lastLiveKitMessageCount.current);
    
    console.log('New LiveKit messages:', newMessages.map(msg => ({
      id: msg.id,
      message: msg.message,
      from: msg.from,
      timestamp: msg.timestamp
    })));
    
    newMessages.forEach((msg) => {
      console.log('Processing LiveKit message:', {
        id: msg.id,
        message: msg.message,
        from: msg.from,
        streamingActive: !!streamingMessageId.current,
        messageContent: msg.message?.substring(0, 50) + '...'
      });
      
      // Only add messages that are clearly from the assistant/avatar
      // Avoid user message echoes by being more specific
      if (msg.from?.identity === 'avatar' || 
          (msg.from?.identity !== 'user' && 
           msg.message?.trim() && 
           !textMessages.some(existingMsg => 
             existingMsg.content === msg.message && 
             existingMsg.role === 'user' && 
             Math.abs(new Date().getTime() - existingMsg.timestamp.getTime()) < 5000
           ))) {
        
        const assistantMessage: TextMessage = {
          id: msg.id ?? `assistant-fallback-${Date.now()}`,
          content: msg.message,
          role: 'assistant',
          timestamp: new Date(),
          isLocal: false
        };
        
        console.log('Adding assistant message to text chat:', assistantMessage);
        setTextMessages(prev => [...prev, assistantMessage]);
      } else {
        console.log('Skipping message (likely user echo):', {
          identity: msg.from?.identity,
          message: msg.message?.substring(0, 30)
        });
      }
    });
    
    lastLiveKitMessageCount.current = liveKitMessages.length;
  }, [liveKitMessages, textMessages, previewMode]);

  // Reset transcription index when leaving
  useEffect(() => {
    return () => {
      lastProcessedIndex.current = -1;
      streamingMessageId.current = null;
      setCurrentStreamingMessage('');
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
      // Add user message to text state immediately
      const userMessage: TextMessage = {
        id: `user-${Date.now()}`,
        content: inputValue.trim(),
        role: 'user',
        timestamp: new Date(),
        isLocal: true
      };
      
      setTextMessages(prev => [...prev, userMessage]);
      
      // Send to LiveKit for model processing
      await liveKitSend(inputValue.trim());
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
    if (onLeaveChat) {
      onLeaveChat();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Debug Info Bar - Hidden in preview mode */}
      {!previewMode && (
        <div className="bg-blue-900/20 border-b border-blue-500/30 px-4 py-2 text-xs text-blue-200">
          <div className="flex justify-between items-center">
            <span>Text Chat | Messages: {textMessages.length} | LiveKit: {liveKitMessages.length} | Streaming: {streamingMessageId.current ? 'Yes' : 'No'}</span>
            <div className="text-xs text-blue-300">
              Last LK: {liveKitMessages.length > 0 ? liveKitMessages[liveKitMessages.length - 1]?.from?.identity || 'unknown' : 'none'}
            </div>
          </div>
          <div className="mt-1 text-xs text-blue-300/80">
            Recent: {textMessages.slice(-2).map(m => `${m.role}(${m.isLocal ? 'local' : 'remote'})`).join(', ')}
          </div>
        </div>
      )}

      {/* Chat Messages - Fixed height container */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 dark-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.7) transparent'
        }}
      >
        {textMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/60 text-sm drop-shadow-md">
            {previewMode ? 'No previous conversation found...' : 'Start a conversation...'}
          </div>
        ) : (
          <div className="space-y-3">
            {textMessages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 break-words text-xs relative ${
                    isUser 
                      ? 'bg-gray-800 text-white' 
                      : 'bg-gray-900 text-white'
                  }`}>
                    {/* Local indicator for testing */}
                    {msg.isLocal && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {/* Streaming indicator */}
                    {msg.isStreaming && (
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    <div className="whitespace-pre-wrap">
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-white/60 ml-1 animate-pulse">|</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.isStreaming && ' • Streaming...'}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Area - Using shared ChatControlWrapper */}
      <ChatControlWrapper>
        {!previewMode && (
          <div className="border-t border-white/20 px-4 py-4 h-full">
            <form onSubmit={handleSubmit} className="flex items-center gap-3 h-full">
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
                  placeholder="Enter to send (Text Chat)"
                  disabled={isSending || previewMode}
                  className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:border-white/20 text-xs"
                />
              </div>

              {/* Send Button */}
              <button 
                type="submit" 
                disabled={isSending || !inputValue.trim() || previewMode}
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
        )}
      </ChatControlWrapper>
    </div>
  );
} 