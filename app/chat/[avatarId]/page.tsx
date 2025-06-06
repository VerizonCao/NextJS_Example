'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Import our organized components and hooks
import { useAvatarData } from './hooks/useAvatarData';
import { useVideoStream } from './hooks/useVideoStream';
import { ChatLayout } from './components/ChatLayout';
import { ChatInfo } from './components/ChatInfo';
import { VideoStream } from './components/VideoStream';
import { TextChat } from './components/TextChat';
import { ChatControls } from './components/ChatControls';
import { Loading, Error } from './components/LoadingStates';
import { PageParams } from './types/chat.types';
import { loadChatHistory } from '@/app/lib/actions/user';
import type { ChatMessage } from '@/app/lib/data';
import { ChatControlWrapper } from './components/ChatControls';

export default function ChatPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  // Load avatar data
  const { avatar, presignedUrl, isLoading, error } = useAvatarData(params);
  
  // Determine if we're in video mode - using local state override
  const searchParams = useSearchParams();
  const [isVideoModeOverride, setIsVideoModeOverride] = React.useState<boolean | null>(null);
  const isVideoMode = isVideoModeOverride !== null ? isVideoModeOverride : searchParams.get('mode') === 'video';
  
  // Setup video streaming
  const {
    room,
    isInitiating,
    preJoinChoices,
    connectionDetails,
    firstFrameReceived
  } = useVideoStream(avatar, isVideoMode);

  // Get avatar ID for navigation
  const [avatarId, setAvatarId] = React.useState<string>('');
  
  // Chat history state - loaded once and maintained throughout
  const [chatHistory, setChatHistory] = React.useState<any[]>([]);
  const [hasHistory, setHasHistory] = React.useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = React.useState<boolean>(true);
  
  React.useEffect(() => {
    params.then(resolvedParams => setAvatarId(resolvedParams.avatarId));
  }, [params]);

  // Load chat history once when avatarId is available
  React.useEffect(() => {
    async function loadHistory() {
      if (!avatarId) return;
      
      setHistoryLoading(true);
      try {
        const result = await loadChatHistory(avatarId);
        if (result.error) {
          console.error('Error loading chat history:', result.error);
          setHasHistory(false);
          setChatHistory([]);
        } else {
          setHasHistory(result.hasHistory || false);
          // Convert to display format for TextChat
          const convertedMessages = (result.messages || []).map((msg: ChatMessage) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            timestamp: new Date(msg.created_at)
          }));
          setChatHistory(convertedMessages);
          console.log('Loaded chat history:', { hasHistory: result.hasHistory, messageCount: convertedMessages.length });
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        setHasHistory(false);
        setChatHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [avatarId]);

  // Auto-collapse sidebar when entering chat
  React.useEffect(() => {
    const collapseNavbar = () => {
      // Find the navbar collapse button and click it
      const navbar = document.querySelector('nav');
      if (navbar) {
        // Check if navbar is not already collapsed
        const isCurrentlyCollapsed = navbar.offsetWidth <= 80;
        if (!isCurrentlyCollapsed) {
          // Find the collapse button (the MenuIcon button when expanded)
          const collapseButton = navbar.querySelector('button[class*="w-8 h-8"]');
          if (collapseButton) {
            (collapseButton as HTMLButtonElement).click();
          }
        }
      }
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(collapseNavbar, 100);
    
    return () => clearTimeout(timer);
  }, []); // Only run once when component mounts

  // Determine chat state based on video mode and connection status
  const isChatActive = isVideoMode && room && preJoinChoices && connectionDetails && firstFrameReceived;
  const showChatPreview = !isVideoMode && !historyLoading;

  // Handle leaving video chat - return to info mode without page refresh
  const handleLeaveVideoChat = React.useCallback(() => {
    // Disconnect from LiveKit room if connected
    if (room && room.state === 'connected') {
      room.disconnect();
    }
    
    // Switch back to info mode using state
    setIsVideoModeOverride(false);
  }, [room]);

  // Loading state
  if (isLoading) {
    return <Loading isVideoMode={isVideoMode} />;
  }

  // Error state
  if (error || !avatar) {
    return <Error error={error || 'Failed to load avatar'} />;
  }

  // Video mode - New layout design
  if (isVideoMode) {
    return (
      <ChatLayout backgroundImage={presignedUrl}>
        {/* Video Section - Left */}
        <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
          <VideoStream
            avatar={avatar}
            presignedUrl={presignedUrl}
            room={room}
            preJoinChoices={preJoinChoices}
            connectionDetails={connectionDetails}
            firstFrameReceived={firstFrameReceived}
            isInitiating={isInitiating}
            avatarId={avatarId}
          />
        </div>
        
        {/* Chat Section - Right */}
        <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
          <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/20">
              {presignedUrl && (
                <img
                  className="w-10 h-10 object-cover rounded-full border border-white/20"
                  alt="Avatar"
                  src={presignedUrl}
                />
              )}
              <div className="flex flex-col flex-1">
                <h2 className="font-semibold text-white text-base drop-shadow-lg">
                  {avatar.avatar_name || 'Unknown Avatar'}
                </h2>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    firstFrameReceived ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                  }`}></div>
                  <p className="text-xs text-white/80 drop-shadow-md">
                    {firstFrameReceived ? 'Live Video Active' : 'Connecting...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Message */}
            <div className="px-4 py-2 bg-black/20 border-b border-white/20">
              <p className="text-xs text-white/60 text-center drop-shadow-md">
                Your chat is secure and encrypted
              </p>
            </div>

            {/* Single TextChat Component - Active or Loading */}
            <div className="flex-1 min-h-0">
              {isChatActive ? (
                <LiveKitRoom
                  room={room}
                  token={connectionDetails.participantToken}
                  serverUrl={connectionDetails.serverUrl}
                  video={false}
                  audio={false}
                >
                  <TextChat 
                    avatar_name={avatar.avatar_name} 
                    avatarId={avatarId}
                    initialMessages={chatHistory}
                    isVideoMode={isVideoMode}
                    firstFrameReceived={firstFrameReceived}
                    onLeaveChat={handleLeaveVideoChat}
                  />
                </LiveKitRoom>
              ) : (
                <TextChat 
                  avatar_name={avatar.avatar_name} 
                  avatarId={avatarId}
                  initialMessages={chatHistory}
                  previewMode={true}
                  isVideoMode={isVideoMode}
                  firstFrameReceived={firstFrameReceived}
                  onLeaveChat={handleLeaveVideoChat}
                />
              )}
            </div>
          </div>
        </div>
      </ChatLayout>
    );
  }

  // Regular chat mode (non-video) - Simplified design with seamless chat
  return (
    <ChatLayout backgroundImage={presignedUrl}>
      {/* Character Image */}
      {presignedUrl && (
        <div
          className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-l-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
          style={{
            backgroundImage: `url(${presignedUrl})`,
          }}
        />
      )}
      
      {/* Character Info and Chat */}
      <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
        <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
          
          {/* Profile Header */}
          <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-shrink-0 p-4 lg:p-[15.12px]">
            <div className="flex items-center gap-4 lg:gap-[15.12px]">
              {presignedUrl && (
                <img
                  className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] object-cover rounded-full flex-shrink-0 border-2 border-white/20"
                  alt="Avatar"
                  src={presignedUrl}
                />
              )}

              <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1 min-w-0">
                <h2 className="font-bold text-white text-lg lg:text-[16.4px] drop-shadow-lg">
                  {avatar.avatar_name || 'Unknown Avatar'}
                </h2>
                <p className="font-medium text-white text-base lg:text-[13.3px] drop-shadow-md">
                  {avatar.agent_bio || 'No bio available'}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-white/20" />
          </div>

          {/* Chat History Section - Seamless Integration */}
          <div className="flex-1 min-h-0 flex flex-col">
            {showChatPreview && hasHistory && (
              <div className="px-4 py-2 bg-black/20 border-b border-white/20">
                <h3 className="text-white text-sm font-medium">Previous Conversation</h3>
              </div>
            )}
            
            {/* Loading indicator for chat history */}
            {historyLoading && (
              <div className="flex items-center justify-center flex-1 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-white/60 text-sm">Loading chat history...</span>
                </div>
              </div>
            )}
            
            {/* Single TextChat Component - Seamless */}
            {showChatPreview && (
              <div className="flex-1 h-full">
                <TextChat 
                  avatar_name={avatar.avatar_name} 
                  avatarId={avatarId}
                  initialMessages={chatHistory}
                  previewMode={true}
                  isVideoMode={isVideoMode}
                  firstFrameReceived={firstFrameReceived}
                />
              </div>
            )}
          </div>

          {/* Bottom Section with Start Chat Button - Using shared ChatControlWrapper */}
          <ChatControlWrapper className="border-t border-white/20">
            <div className="flex items-center justify-center w-full h-full px-4">
              <button 
                onClick={() => setIsVideoModeOverride(true)}
                className="flex items-center justify-center w-full bg-[#00000033] hover:bg-[#ffffff1a] rounded-full py-2 px-6 transition-colors backdrop-blur-sm"
              >
                <span className="text-white text-sm font-medium drop-shadow-md">
                  {hasHistory ? 'Continue Chat' : 'Start'}
                </span>
              </button>
            </div>
          </ChatControlWrapper>
        </div>
      </div>
    </ChatLayout>
  );
}
