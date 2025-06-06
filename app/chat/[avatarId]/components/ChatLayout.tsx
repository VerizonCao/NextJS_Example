import React, { useState, useEffect } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { TextChat } from './TextChat';
import { ChatControlWrapper } from './ChatControls';
import type { Avatar } from '../types/chat.types';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
}

export function ChatLayout({ children, className = '', backgroundImage }: ChatLayoutProps) {
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);

  // Listen for navbar collapse state changes
  useEffect(() => {
    const checkNavbarState = () => {
      // Check if navbar is collapsed by measuring its width
      const navbar = document.querySelector('nav');
      if (navbar) {
        const isCollapsed = navbar.offsetWidth <= 80; // 16 * 4 + padding = ~64-80px
        setNavbarCollapsed(isCollapsed);
      }
    };
    
    // Initial check
    checkNavbarState();
    
    // Set up observer to watch for navbar width changes
    const observer = new MutationObserver(checkNavbarState);
    const navbar = document.querySelector('nav');
    if (navbar) {
      observer.observe(navbar, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Also listen for transition end events
    const handleTransition = () => setTimeout(checkNavbarState, 50);
    navbar?.addEventListener('transitionend', handleTransition);
    
    return () => {
      observer.disconnect();
      navbar?.removeEventListener('transitionend', handleTransition);
    };
  }, []);

  return (
    <div className={`flex flex-row justify-center w-full min-h-screen relative ${className}`}>
      {/* Blurred background image - contained within window */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(20px) brightness(0.6)',
            zIndex: -1
          }}
        />
      )}
      
      {/* Content overlay with dynamic navbar spacing and centering adjustment */}
      <div className="w-full relative z-10">
        <main className={`flex flex-col w-full h-full items-center justify-center px-4 lg:px-0 transition-all duration-300 ${navbarCollapsed ? 'pl-8' : 'pl-32'}`}>
          <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-0 py-[15px]" style={{ backgroundColor: 'transparent' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Unified Chat Panel Components
interface UnifiedChatPanelProps {
  // Avatar data
  avatar: Avatar;
  avatarId: string;
  presignedUrl: string;
  
  // State information
  chatState: 'info' | 'loading' | 'live';
  
  // Chat data
  chatHistory: any[];
  hasHistory: boolean;
  historyLoading: boolean;
  
  // Video/connection state
  isVideoMode?: boolean;
  firstFrameReceived?: boolean;
  room?: any;
  connectionDetails?: any;
  
  // Callbacks
  onLeaveChat?: () => void;
  onStartChat?: () => void;
}

interface ProfileHeaderProps {
  avatar: Avatar;
  presignedUrl: string;
}

function ProfileHeader({ avatar, presignedUrl }: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/20 flex-shrink-0">
      {presignedUrl && (
        <img
          className="w-12 h-12 object-cover rounded-full border border-white/20 flex-shrink-0"
          alt="Avatar"
          src={presignedUrl}
        />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <h2 className="font-semibold text-white text-base drop-shadow-lg truncate">
          {avatar.avatar_name || 'Unknown Avatar'}
        </h2>
        <p className="text-xs text-white/70 drop-shadow-md truncate">
          {avatar.agent_bio || 'No bio available'}
        </p>
      </div>
    </div>
  );
}

interface StatusBannerProps {
  chatState: 'info' | 'loading' | 'live';
  firstFrameReceived?: boolean;
}

function StatusBanner({ chatState, firstFrameReceived }: StatusBannerProps) {
  const getStatusContent = () => {
    switch (chatState) {
      case 'info':
        return {
          text: 'Previous Conversations',
          icon: null
        };
      case 'loading':
        return {
          text: 'Connecting...',
          icon: <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        };
      case 'live':
        return {
          text: firstFrameReceived ? 'Live Video Active' : 'Connecting...',
          icon: <div className={`w-2 h-2 rounded-full ${firstFrameReceived ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
        };
      default:
        return {
          text: 'Ready',
          icon: null
        };
    }
  };

  const status = getStatusContent();

  return (
    <div className="px-4 py-2 bg-black/20 border-b border-white/20 flex-shrink-0">
      <div className="flex items-center gap-2">
        {status.icon}
        <p className="text-xs font-medium text-white/70 drop-shadow-md">
          {status.text}
        </p>
      </div>
    </div>
  );
}

interface ChatMessagesContainerProps {
  chatState: 'info' | 'loading' | 'live';
  avatar: Avatar;
  avatarId: string;
  chatHistory: any[];
  historyLoading: boolean;
  isVideoMode?: boolean;
  firstFrameReceived?: boolean;
  onLeaveChat?: () => void;
  room?: any;
  connectionDetails?: any;
  onStartChat?: () => void;
  hasHistory: boolean;
}

function ChatMessagesContainer({ 
  chatState, 
  avatar, 
  avatarId, 
  chatHistory, 
  historyLoading,
  isVideoMode,
  firstFrameReceived,
  onLeaveChat,
  room,
  connectionDetails,
  onStartChat,
  hasHistory
}: ChatMessagesContainerProps & { onStartChat?: () => void; hasHistory: boolean }) {
  // Prepare custom controls for info and loading states
  const getCustomControls = () => {
    if (chatState === 'info' || chatState === 'loading') {
      const isDisabled = chatState === 'loading';
      
      return (
        <div className="border-t border-white/20 flex items-center justify-center w-full h-full px-4">
          <button 
            onClick={onStartChat}
            disabled={isDisabled}
            className={`flex items-center justify-center w-full rounded-full py-2 px-6 transition-colors backdrop-blur-sm ${
              isDisabled 
                ? 'bg-gray-600/40 cursor-not-allowed text-white/50' 
                : 'bg-[#00000033] hover:bg-[#ffffff1a] text-white'
            }`}
          >
            <span className="text-sm font-medium drop-shadow-md">
              {hasHistory ? 'Continue Chat' : 'Start Chat'}
            </span>
          </button>
        </div>
      );
    }
    return undefined; // No custom controls for live state
  };

  const customControls = getCustomControls();

  // Show loading state
  if (historyLoading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <span className="text-white/60 text-sm">Loading chat history...</span>
        </div>
      </div>
    );
  }

  // For info state - preview mode
  if (chatState === 'info') {
    return (
      <div className="flex-1 min-h-0">
        <TextChat 
          avatar_name={avatar.avatar_name} 
          avatarId={avatarId}
          initialMessages={chatHistory}
          previewMode={true}
          isVideoMode={false}
          firstFrameReceived={false}
          customControls={customControls}
        />
      </div>
    );
  }

  // For loading state - preview mode with video context
  if (chatState === 'loading') {
    return (
      <div className="flex-1 min-h-0">
        <TextChat 
          avatar_name={avatar.avatar_name} 
          avatarId={avatarId}
          initialMessages={chatHistory}
          previewMode={true}
          isVideoMode={isVideoMode}
          firstFrameReceived={firstFrameReceived}
          onLeaveChat={onLeaveChat}
          customControls={customControls}
        />
      </div>
    );
  }

  // For live state - active chat
  if (chatState === 'live' && room && connectionDetails) {
    return (
      <div className="flex-1 min-h-0">
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
            onLeaveChat={onLeaveChat}
          />
        </LiveKitRoom>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-4">
      <span className="text-white/60 text-sm">Chat not available</span>
    </div>
  );
}

export function UnifiedChatPanel({
  avatar,
  avatarId,
  presignedUrl,
  chatState,
  chatHistory,
  hasHistory,
  historyLoading,
  isVideoMode,
  firstFrameReceived,
  room,
  connectionDetails,
  onLeaveChat,
  onStartChat
}: UnifiedChatPanelProps) {
  return (
    <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
      <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-sm rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden">
        
        {/* 1. Profile Header */}
        <ProfileHeader 
          avatar={avatar}
          presignedUrl={presignedUrl}
        />

        {/* 2. Status Banner */}
        <StatusBanner 
          chatState={chatState}
          firstFrameReceived={firstFrameReceived}
        />

        {/* 3. Chat Messages Container with Unified Controls */}
        <ChatMessagesContainer
          chatState={chatState}
          avatar={avatar}
          avatarId={avatarId}
          chatHistory={chatHistory}
          historyLoading={historyLoading}
          isVideoMode={isVideoMode}
          firstFrameReceived={firstFrameReceived}
          onLeaveChat={onLeaveChat}
          room={room}
          connectionDetails={connectionDetails}
          onStartChat={onStartChat}
          hasHistory={hasHistory}
        />

      </div>
    </div>
  );
} 