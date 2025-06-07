import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getRecentChatAvatarsAction, RecentChatAvatarWithUrl } from '@/app/lib/actions';

export function useRecentChats() {
  const { data: session } = useSession();
  const [recentChats, setRecentChats] = useState<RecentChatAvatarWithUrl[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  
  const userEmail = session?.user?.email || '';

  const fetchRecentChats = useCallback(async () => {
    if (!session || !userEmail) {
      setRecentChats([]);
      return;
    }
    
    setIsLoadingChats(true);
    try {
      const { success, avatars } = await getRecentChatAvatarsAction(userEmail, 10);
      if (success && avatars) {
        setRecentChats(avatars);
      } else {
        setRecentChats([]);
      }
    } catch (error) {
      console.error('Error fetching recent chats:', error);
      setRecentChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [session, userEmail]);

  // Initial fetch
  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  // Refresh function that can be called externally
  const refreshRecentChats = useCallback(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  return {
    recentChats,
    isLoadingChats,
    refreshRecentChats
  };
} 