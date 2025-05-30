import { loadAvatar, getPresignedUrl } from '@/app/lib/actions';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type PageParams = {
  avatarId: string;
};

export default async function ChatPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { avatarId } = await params;

  try {
    // Load avatar data on the server
    const avatarResult = await loadAvatar(avatarId);
    
    if (!avatarResult.success || !avatarResult.avatar) {
      notFound();
    }

    let presignedUrl = '';
    if (avatarResult.avatar.image_uri) {
      try {
        const urlResult = await getPresignedUrl(avatarResult.avatar.image_uri);
        presignedUrl = urlResult.presignedUrl;
      } catch (error) {
        console.error('Failed to get presigned URL:', error);
      }
    }

    const avatar = avatarResult.avatar;

    return (
      <div className="flex flex-row justify-center w-full">
        <div className="w-full relative">
          <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
            <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
              
              {/* Character Image */}
              {presignedUrl && (
                <div
                  className="relative w-full lg:w-auto lg:h-full aspect-[9/16] rounded-[5px] bg-cover bg-center shadow-lg flex-shrink-0"
                  style={{
                    backgroundImage: `url(${presignedUrl})`,
                  }}
                />
              )}
              
              {/* Character Info Card - Now with 9:16 aspect ratio and wider */}
              <div className="w-full lg:w-auto lg:h-full aspect-[11/16] flex-shrink-0">
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
                            <p className="font-medium text-white text-base lg:text-[13.3px]">
                              {avatar.agent_bio || 'No bio available'}
                            </p>
                          </div>
                        </div>

                        <Separator className="w-full h-px bg-[rgb(29,29,30)]" />
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

                    {/* Bottom Section - Fixed at bottom */}
                    <div className="flex flex-col items-center gap-4 mt-6 flex-shrink-0">
                      
                      {/* Coming Soon Message */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex flex-col text-center">
                          <p className="text-white text-lg lg:text-xl font-medium">Chat Feature Coming Soon!</p>
                          <p className="font-normal text-neutral-300 text-sm">
                            Text-based chat with {avatar.avatar_name} will be available in the next update.
                          </p>
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
            </div>
          </main>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading avatar:', error);
    notFound();
  }
}
