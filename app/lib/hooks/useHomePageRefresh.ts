import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useChatHistory } from '@/app/lib/contexts/ChatHistoryContext';

export function useHomePageRefresh() {
  const pathname = usePathname();
  const { refreshRecentChats } = useChatHistory();

  useEffect(() => {
    // Trigger refresh when pathname is home page '/'
    if (pathname === '/') {
      console.log('Home page visited - refreshing chat history');
      refreshRecentChats();
    }
  }, [pathname, refreshRecentChats]);
} 