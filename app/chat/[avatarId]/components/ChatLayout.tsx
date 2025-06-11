import React, { useState, useEffect } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { TextChat } from './TextChat';
import { ChatControlWrapper } from './ChatControls';
import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Avatar } from '../types/chat.types';
import type { ChatMessage } from '@/app/lib/data';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
}

// Helper function to convert ChatMessage to DisplayMessage format for TextChat
const convertChatMessagesToDisplay = (messages: ChatMessage[]) => {
  return messages.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role as 'user' | 'assistant',
    timestamp: new Date(msg.created_at)
  }));
};

export function ChatLayout({ children, className = '', backgroundImage }: ChatLayoutProps) {
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<Avatar | null>(null);
  const [currentAvatarId, setCurrentAvatarId] = useState<string>('');

  // Toggle function for profile popup
  const toggleProfilePopup = (avatar?: Avatar, avatarId?: string) => {
    if (avatar && avatarId) {
      setCurrentAvatar(avatar);
      setCurrentAvatarId(avatarId);
    }
    setIsProfilePopupOpen(!isProfilePopupOpen);
  };

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
            filter: 'blur(60px) brightness(0.6)',
            zIndex: -1
          }}
        />
      )}
      
      {/* Content overlay */}
      <div className="w-full relative z-10">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-0 py-[15px] relative" style={{ backgroundColor: 'transparent' }}>
            {/* Pass toggle function only to UnifiedChatPanel components */}
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && child.type === UnifiedChatPanel) {
                return React.cloneElement(child, { onToggleProfilePopup: toggleProfilePopup } as any);
              }
              return child;
            })}
          </div>
        </main>
      </div>

      {/* Profile Panel - slide out from right */}
      {isProfilePopupOpen && (
        <>
          {/* Backdrop for mobile/click outside */}
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsProfilePopupOpen(false)}
          />
          
          {/* Slide-out Panel */}
          <div 
            className={`fixed top-0 right-0 h-full bg-black/90 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${
              isProfilePopupOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ width: 'min(25vw, 600px)' }}
          >
            <ProfilePopup 
              isOpen={isProfilePopupOpen}
              onClose={() => setIsProfilePopupOpen(false)}
              avatar={currentAvatar}
              avatarId={currentAvatarId}
            />
          </div>
        </>
      )}
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
  onToggleProfilePopup?: (avatar: Avatar, avatarId: string) => void;
  
  // Message management callbacks
  onNewMessage?: (message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    isLocal?: boolean;
    isStreaming?: boolean;
  }) => void;
  onUpdateMessage?: (messageId: string, content: string, isStreaming?: boolean) => void;
  onClearMessages?: () => void;
}

interface ProfileHeaderProps {
  avatar: Avatar;
  presignedUrl: string;
  onToggleInfoPanel: () => void;
  onToggleProfilePopup?: (avatar: Avatar, avatarId: string) => void;
  avatarId: string;
}

function ProfileHeader({ avatar, presignedUrl, onToggleInfoPanel, onToggleProfilePopup, avatarId }: ProfileHeaderProps) {
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
      {/* Profile Info Button - now toggles profile popup */}
      <button
        onClick={() => onToggleProfilePopup ? onToggleProfilePopup(avatar, avatarId) : onToggleInfoPanel()}
        data-profile-info-button
        className="flex items-center justify-center w-8 h-8 bg-transparent hover:bg-black/20 rounded-full transition-colors flex-shrink-0"
      >
        <Info className="w-4 h-4 text-white" />
      </button>
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
  
  // Message management callbacks
  onNewMessage?: (message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    isLocal?: boolean;
    isStreaming?: boolean;
  }) => void;
  onUpdateMessage?: (messageId: string, content: string, isStreaming?: boolean) => void;
  onClearMessages?: () => void;
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
  hasHistory,
  onNewMessage,
  onUpdateMessage,
  onClearMessages
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

  // Always show the TextChat component immediately, don't block on history loading
  // Show a small loading indicator inside the chat area if history is still loading
  
  // For info state - preview mode
  if (chatState === 'info') {
    return (
      <div className="flex-1 min-h-0 relative">
        <TextChat 
          avatar_name={avatar.avatar_name} 
          avatarId={avatarId}
          initialMessages={convertChatMessagesToDisplay(chatHistory)}
          previewMode={true}
          isVideoMode={false}
          firstFrameReceived={false}
          customControls={customControls}
          onNewMessage={onNewMessage}
          onUpdateMessage={onUpdateMessage}
          onClearMessages={onClearMessages}
        />
        {/* Show loading indicator inside chat if history is loading */}
        {historyLoading && (
          <div className="absolute inset-4 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-md z-10">
            <div className="flex items-center gap-2 bg-black/80 rounded-lg px-4 py-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-white/80 text-sm">Loading chat history...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For loading state - preview mode with video context
  if (chatState === 'loading') {
    return (
      <div className="flex-1 min-h-0 relative">
        <TextChat 
          avatar_name={avatar.avatar_name} 
          avatarId={avatarId}
          initialMessages={convertChatMessagesToDisplay(chatHistory)}
          previewMode={true}
          isVideoMode={isVideoMode}
          firstFrameReceived={firstFrameReceived}
          onLeaveChat={onLeaveChat}
          customControls={customControls}
          onNewMessage={onNewMessage}
          onUpdateMessage={onUpdateMessage}
          onClearMessages={onClearMessages}
        />
        {/* Show loading indicator inside chat if history is loading */}
        {historyLoading && (
          <div className="absolute inset-4 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-md z-10">
            <div className="flex items-center gap-2 bg-black/80 rounded-lg px-4 py-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-white/80 text-sm">Loading chat history...</span>
            </div>
          </div>
        )}
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
            initialMessages={convertChatMessagesToDisplay(chatHistory)}
            isVideoMode={isVideoMode}
            firstFrameReceived={firstFrameReceived}
            onLeaveChat={onLeaveChat}
            onNewMessage={onNewMessage}
            onUpdateMessage={onUpdateMessage}
            onClearMessages={onClearMessages}
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
  onStartChat,
  onToggleProfilePopup,
  onNewMessage,
  onUpdateMessage,
  onClearMessages
}: UnifiedChatPanelProps) {
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  const handleToggleInfoPanel = () => {
    setIsInfoPanelOpen(!isInfoPanelOpen);
  };

  // Close panel when clicking outside (keeping for potential future use)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is outside both the panel and the info button
      if (isInfoPanelOpen && 
          !target.closest('[data-profile-info-panel]') && 
          !target.closest('[data-profile-info-button]')) {
        setIsInfoPanelOpen(false);
      }
    };

    if (isInfoPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isInfoPanelOpen]);

  return (
    <>
      <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]" data-unified-chat-panel>
        <div className="flex flex-col w-full h-full bg-black/40 backdrop-blur-3xl rounded-r-[5px] border-r border-t border-b border-white/10 overflow-hidden relative">
          
          {/* 1. Profile Header */}
          <ProfileHeader 
            avatar={avatar}
            presignedUrl={presignedUrl}
            onToggleInfoPanel={handleToggleInfoPanel}
            onToggleProfilePopup={onToggleProfilePopup}
            avatarId={avatarId}
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
            onNewMessage={onNewMessage}
            onUpdateMessage={onUpdateMessage}
            onClearMessages={onClearMessages}
          />

        </div>
      </div>
    </>
  );
}

// Profile Popup Component
interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  avatar: Avatar | null;
  avatarId: string;
}

function ProfilePopup({ isOpen, onClose, avatar, avatarId }: ProfilePopupProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleEdit = () => {
    if (!session) {
      // Could show login popup or redirect to login  
      router.push('/auth/signin');
      return;
    }
    // Navigate to edit page
    router.push(`/edit-character/${avatarId}`);
  };

  if (!isOpen || !avatar) return null;

  return (
    <div className="relative h-full p-6">
      {/* Close button - anchored to top right */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 bg-transparent hover:bg-white/10 rounded-full transition-colors z-10"
      >
        <span className="text-white text-xl">×</span>
      </button>
      
      {/* Content - aligned to left with spacing */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Avatar Name */}
        <h4 className="text-white text-xl font-semibold">
          {avatar.avatar_name || 'Unknown Avatar'}
        </h4>
        
        {/* Avatar Bio */}
        {avatar.agent_bio && (
          <p className="text-white/70 text-sm leading-relaxed">
            {avatar.agent_bio}
          </p>
        )}
        
        {/* Edit Button */}
        <button
          onClick={handleEdit}
          className="w-full px-4 py-3 bg-[rgb(29,29,30)] hover:bg-[rgb(40,40,42)] rounded-[8px] text-sm text-white transition-colors duration-200 text-center leading-tight mt-4"
        >
          Edit Avatar
        </button>
      </div>
    </div>
  );
} 