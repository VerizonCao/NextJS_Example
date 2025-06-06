'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Import our organized components and hooks
import { useAvatarData } from './hooks/useAvatarData';
import { useVideoStream } from './hooks/useVideoStream';
import { ChatLayout, UnifiedChatPanel } from './components/ChatLayout';
import { VideoStream } from './components/VideoStream';
import { Loading, Error } from './components/LoadingStates';
import { PageParams } from './types/chat.types';
import { loadChatHistory } from '@/app/lib/actions/user';
import type { ChatMessage } from '@/app/lib/data';

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
  const getChatState = (): 'info' | 'loading' | 'live' => {
    if (!isVideoMode) return 'info';
    if (isVideoMode && (!room || !preJoinChoices || !connectionDetails)) return 'loading';
    if (isVideoMode && room && preJoinChoices && connectionDetails && firstFrameReceived) return 'live';
    return 'loading';
  };

  const chatState = getChatState();

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
        
        {/* Chat Section - Right - Using Unified Component */}
        <UnifiedChatPanel
          avatar={avatar}
          avatarId={avatarId}
          presignedUrl={presignedUrl}
          chatState={chatState}
          chatHistory={chatHistory}
          hasHistory={hasHistory}
          historyLoading={historyLoading}
          isVideoMode={isVideoMode}
          firstFrameReceived={firstFrameReceived}
          room={room}
          connectionDetails={connectionDetails}
          onLeaveChat={handleLeaveVideoChat}
        />
      </ChatLayout>
    );
  }

  // Regular chat mode (non-video) - Using Unified Component
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
      
      {/* Chat Section - Using Unified Component */}
      <UnifiedChatPanel
        avatar={avatar}
        avatarId={avatarId}
        presignedUrl={presignedUrl}
        chatState="info"
        chatHistory={chatHistory}
        hasHistory={hasHistory}
        historyLoading={historyLoading}
        isVideoMode={false}
        firstFrameReceived={false}
        onStartChat={() => setIsVideoModeOverride(true)}
      />
    </ChatLayout>
  );
}
