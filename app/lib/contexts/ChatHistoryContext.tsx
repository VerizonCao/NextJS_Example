'use client';

import React, { createContext, useContext } from 'react';
import { useRecentChats } from '@/app/lib/hooks/useRecentChats';
import { RecentChatAvatarWithUrl } from '@/app/lib/actions';

interface ChatHistoryContextType {
  recentChats: RecentChatAvatarWithUrl[];
  isLoadingChats: boolean;
  refreshRecentChats: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const chatHistoryData = useRecentChats();

  return (
    <ChatHistoryContext.Provider value={chatHistoryData}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider');
  }
  return context;
} 