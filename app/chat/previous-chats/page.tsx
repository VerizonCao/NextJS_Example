import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { MessageSquareIcon, ClockIcon, UserIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function PreviousChatsPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Placeholder chat data - replace with actual backend calls when ready
  const mockChats = [
    {
      id: '1',
      characterName: 'Aria',
      lastMessage: 'Thanks for the wonderful conversation! See you next time.',
      timestamp: '2024-01-15 14:30',
      characterImage: '/placeholder-avatar-1.jpg',
      messageCount: 45
    },
    {
      id: '2', 
      characterName: 'Luna',
      lastMessage: 'I really enjoyed talking about space and the stars with you.',
      timestamp: '2024-01-14 09:15',
      characterImage: '/placeholder-avatar-2.jpg',
      messageCount: 23
    },
    {
      id: '3',
      characterName: 'Kai',
      lastMessage: 'That was an amazing adventure story! Let\'s continue soon.',
      timestamp: '2024-01-13 16:45',
      characterImage: '/placeholder-avatar-3.jpg',
      messageCount: 67
    },
    {
      id: '4',
      characterName: 'Zara',
      lastMessage: 'Thank you for helping me with the puzzle. You\'re so clever!',
      timestamp: '2024-01-12 11:20',
      characterImage: '/placeholder-avatar-4.jpg',
      messageCount: 31
    },
    {
      id: '5',
      characterName: 'Echo',
      lastMessage: 'I hope we can talk about music again tomorrow.',
      timestamp: '2024-01-11 19:55',
      characterImage: '/placeholder-avatar-5.jpg',
      messageCount: 18
    }
  ];

  return (
    <div className="bg-[#222433] min-h-screen w-full">
      {/* Header Section */}
      <header className="fixed top-0 left-64 right-0 z-10 bg-[#222433] py-6 px-6 border-b border-[#3a3a4a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MessageSquareIcon className="w-8 h-8 text-white" />
            <h1 className="[font-family:'Montserrat',Helvetica] font-bold text-white text-3xl tracking-[0] leading-normal">
              Chat History
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 bg-[#00000033] rounded-lg text-white hover:bg-[#ffffff1a]"
            >
              <SearchIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 bg-[#00000033] rounded-lg text-white hover:bg-[#ffffff1a]"
            >
              <FilterIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pl-64 pt-32 pb-6">
        <div className="px-6">
          {/* Stats Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#00000033] rounded-xl p-6 border border-[#3a3a4a]">
                <div className="flex items-center gap-3">
                  <MessageSquareIcon className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-white text-2xl font-bold [font-family:'Montserrat',Helvetica]">
                      {mockChats.length}
                    </p>
                    <p className="text-gray-400 text-sm [font-family:'Montserrat',Helvetica]">
                      Total Conversations
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#00000033] rounded-xl p-6 border border-[#3a3a4a]">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-white text-2xl font-bold [font-family:'Montserrat',Helvetica]">
                      {mockChats.reduce((total, chat) => total + chat.messageCount, 0)}
                    </p>
                    <p className="text-gray-400 text-sm [font-family:'Montserrat',Helvetica]">
                      Total Messages
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#00000033] rounded-xl p-6 border border-[#3a3a4a]">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-white text-2xl font-bold [font-family:'Montserrat',Helvetica]">
                      {new Set(mockChats.map(chat => chat.characterName)).size}
                    </p>
                    <p className="text-gray-400 text-sm [font-family:'Montserrat',Helvetica]">
                      Unique Characters
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat List */}
          <div className="space-y-4">
            <h2 className="text-white text-xl font-semibold [font-family:'Montserrat',Helvetica] mb-4">
              Recent Conversations
            </h2>
            
            {mockChats.map((chat) => (
              <div
                key={chat.id}
                className="bg-[#00000033] rounded-xl p-6 border border-[#3a3a4a] hover:bg-[#ffffff0a] transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Character Avatar Placeholder */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg [font-family:'Montserrat',Helvetica]">
                    {chat.characterName.charAt(0)}
                  </div>
                  
                  {/* Chat Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold text-lg [font-family:'Montserrat',Helvetica] group-hover:text-blue-300 transition-colors">
                        {chat.characterName}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <ClockIcon className="w-4 h-4" />
                        <span className="[font-family:'Montserrat',Helvetica]">
                          {chat.timestamp}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm [font-family:'Montserrat',Helvetica] mb-2 line-clamp-2">
                      {chat.lastMessage}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="[font-family:'Montserrat',Helvetica]">
                        {chat.messageCount} messages
                      </span>
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      <span className="[font-family:'Montserrat',Helvetica]">
                        Click to continue
                      </span>
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="text-gray-400 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State for when no chats exist */}
          {mockChats.length === 0 && (
            <div className="text-center py-16">
              <MessageSquareIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold [font-family:'Montserrat',Helvetica] mb-2">
                No chat history yet
              </h3>
              <p className="text-gray-400 [font-family:'Montserrat',Helvetica] mb-6">
                Start a conversation with a character to see your chat history here.
              </p>
              <Button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white [font-family:'Montserrat',Helvetica]"
              >
                Browse Characters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 