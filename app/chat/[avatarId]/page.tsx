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
import LayoutWithNavBar from '@/app/home/tab/layout-with-navbar';
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
  
  // UNIFIED CHAT MESSAGE STATE - Single source of truth
  const [allChatMessages, setAllChatMessages] = React.useState<ChatMessage[]>([]);
  const [hasHistory, setHasHistory] = React.useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = React.useState<boolean>(false);
  
  React.useEffect(() => {
    params.then(resolvedParams => setAvatarId(resolvedParams.avatarId));
  }, [params]);

  // Load chat history asynchronously in background - non-blocking
  React.useEffect(() => {
    async function loadHistory() {
      if (!avatarId) return;
      
      setHistoryLoading(true);
      try {
        // Use setTimeout to make this truly non-blocking
        setTimeout(async () => {
          try {
            const result = await loadChatHistory(avatarId);
            if (result.error) {
              console.error('Error loading chat history:', result.error);
              setHasHistory(false);
              setAllChatMessages([]);
            } else {
              setHasHistory(result.hasHistory || false);
              // Store the raw ChatMessage format - don't convert here
              const loadedMessages = result.messages || [];
              setAllChatMessages(loadedMessages);
              console.log('Loaded chat history:', { hasHistory: result.hasHistory, messageCount: loadedMessages.length });
            }
          } catch (error) {
            console.error('Failed to load chat history:', error);
            setHasHistory(false);
            setAllChatMessages([]);
          } finally {
            setHistoryLoading(false);
          }
        }, 0);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        setHasHistory(false);
        setAllChatMessages([]);
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [avatarId, avatar]);

  // Add opening prompt when avatar loads and there's no chat history
  React.useEffect(() => {    
    if (avatar && !historyLoading && allChatMessages.length === 0 && !hasHistory) {
      // Use opening_prompt if available, otherwise create a fallback
      const promptContent = avatar.opening_prompt || 
        `"Hello! I'm ${avatar.avatar_name}. It's wonderful to meet you!"\n\n**${avatar.avatar_name} smiled warmly, ready to begin your conversation.**`;
      
      const openingMessage: ChatMessage = {
        id: `opening-${avatar.avatar_id}`,
        content: promptContent,
        role: 'assistant',
        sender_id: 'assistant',
        sender_name: avatar.avatar_name || 'Assistant',
        created_at: new Date().toISOString()
      };
      setAllChatMessages([openingMessage]);
    }
  }, [avatar, historyLoading, allChatMessages.length, hasHistory]);

  // Callback to add new messages from live chat
  const handleNewMessage = React.useCallback((message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    isLocal?: boolean;
    isStreaming?: boolean;
  }) => {
    // Convert to ChatMessage format and add to unified state
    const chatMessage: ChatMessage = {
      id: message.id,
      content: message.content,
      role: message.role,
      sender_id: message.role === 'user' ? 'user' : 'assistant',
      sender_name: message.role === 'user' ? 'User' : avatar?.avatar_name || 'Assistant',
      created_at: message.timestamp.toISOString()
    };
    
    setAllChatMessages(prev => [...prev, chatMessage]);
  }, [avatarId, avatar]);

  // Callback to update streaming message
  const handleUpdateMessage = React.useCallback((messageId: string, content: string, isStreaming?: boolean) => {
    setAllChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content }
          : msg
      )
    );
  }, []);

  // Callback to clear messages (if needed for reset)
  const handleClearMessages = React.useCallback(() => {
    setAllChatMessages([]);
  }, []);

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

  // Show UI immediately when avatar data is available, don't wait for history
  if (isLoading) {
    return <Loading isVideoMode={isVideoMode} />;
  }

  // Error state
  if (error || !avatar) {
    return <Error error={error || 'Failed to load avatar'} />;
  }

  // Show UI immediately - chat history loading happens in background
  // Video mode - New layout design
  if (isVideoMode) {
    return (
      <LayoutWithNavBar className="bg-[#121214] min-h-screen">
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
          chatHistory={allChatMessages}
          hasHistory={hasHistory}
          historyLoading={historyLoading}
          isVideoMode={isVideoMode}
          firstFrameReceived={firstFrameReceived}
          room={room}
          connectionDetails={connectionDetails}
          onLeaveChat={handleLeaveVideoChat}
          onNewMessage={handleNewMessage}
          onUpdateMessage={handleUpdateMessage}
          onClearMessages={handleClearMessages}
        />
      </ChatLayout>
      </LayoutWithNavBar>
    );
  }

  // Regular chat mode (non-video) - Using Unified Component
  return (
    <LayoutWithNavBar className="bg-[#121214] min-h-screen">
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
        chatHistory={allChatMessages}
        hasHistory={hasHistory}
        historyLoading={historyLoading}
        isVideoMode={false}
        firstFrameReceived={false}
        onStartChat={() => setIsVideoModeOverride(true)}
        onNewMessage={handleNewMessage}
        onUpdateMessage={handleUpdateMessage}
        onClearMessages={handleClearMessages}
      />
    </ChatLayout>
    </LayoutWithNavBar>
  );
}
