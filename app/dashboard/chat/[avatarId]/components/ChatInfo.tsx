import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar } from '../types/chat.types';

interface ChatInfoProps {
  avatar: Avatar;
  presignedUrl: string;
  avatarId: string;
  statusComponent?: React.ReactNode;
  controlsComponent?: React.ReactNode;
}

export function ChatInfo({ 
  avatar, 
  presignedUrl, 
  avatarId, 
  statusComponent,
  controlsComponent 
}: ChatInfoProps) {
  return (
    <div className="w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0">
      <Card className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-[5px] border-none overflow-hidden">
        <CardContent className="flex flex-col h-full p-4 lg:p-[15.12px] overflow-y-auto">
          
          {/* Top Section - Scrollable */}
          <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-1 min-h-0">
            
            {/* Profile Header */}
            <div className="flex flex-col gap-4 lg:gap-[16.2px] flex-shrink-0">
              <div className="flex items-center gap-4 lg:gap-[15.12px]">
                {presignedUrl && (
                  <img
                    className="w-16 h-16 lg:w-[68.04px] lg:h-[68.04px] object-cover rounded-full flex-shrink-0"
                    alt="Avatar"
                    src={presignedUrl}
                  />
                )}

                <div className="flex flex-col gap-2 lg:gap-[7.56px] flex-1 min-w-0">
                  <h2 className="font-bold text-white text-lg lg:text-[16.4px]">
                    {avatar.avatar_name || 'Unknown Avatar'}
                  </h2>
                  
                  {statusComponent || (
                    <p className="font-medium text-white text-base lg:text-[13.3px]">
                      {avatar.agent_bio || 'No bio available'}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
              
              {/* Optional controls component (microphone, etc.) */}
              {controlsComponent}
            </div>

            {/* About Section */}
            <div className="flex flex-col gap-4 lg:gap-[16.2px]">
              <h3 className="font-bold text-white text-lg">About</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white text-base">
                    Prompt
                  </h4>
                  <p className="font-medium text-white text-sm mt-2 break-words">
                    {avatar.prompt || 'No prompt available'}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white text-base lg:text-[14.6px]">
                    Scene
                  </h4>
                  <p className="font-medium text-white text-sm lg:text-[12.8px] mt-2 break-words">
                    {avatar.scene_prompt || 'No scene prompt available'}
                  </p>
                </div>

                {avatar.voice_id && (
                  <div>
                    <h4 className="font-semibold text-white text-base lg:text-[14.6px]">
                      Voice
                    </h4>
                    <p className="font-medium text-white text-sm lg:text-[12.8px] mt-2 break-words">
                      {avatar.voice_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section with Chat Options */}
          <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0">
            
            {/* Chat Options */}
            <div className="flex flex-col text-center gap-4 w-full">
              <p className="text-white text-lg lg:text-xl font-medium">Choose Chat Mode</p>
              <p className="font-normal text-neutral-300 text-sm">
                Chat with {avatar.avatar_name} via text or video
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <Link href={`/dashboard/chat/${avatarId}?mode=video`} className="w-full">
                  <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors w-full">
                    Start Video Chat
                  </Button>
                </Link>
                
                <Button 
                  disabled 
                  className="bg-gray-600 text-gray-400 px-6 py-3 rounded-lg w-full cursor-not-allowed"
                >
                  Text Chat (Coming Soon)
                </Button>
              </div>
            </div>

            {/* Back Button */}
            <Link href="/dashboard">
              <Button className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 