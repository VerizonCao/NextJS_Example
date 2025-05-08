'use client';

import { getPresignedUrl, loadAvatar, updateAvatarData } from '@/app/lib/actions';
import { useState, useEffect } from 'react';
import { use } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type PageParams = {
  avatarId: string;
};

export default function EditAvatarPage({
    params,
  }: {
    params: Promise<PageParams>; // ← Promise type
  }) {
  const { avatarId } = use(params); // ← unwrap with `use`
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingVoice, setIsEditingVoice] = useState(false);
  const [avatar, setAvatar] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    avatar_name: '',
    agent_bio: '',
    prompt: '',
    scene_prompt: '',
    voice_id: ''
  });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const router = useRouter();

  // Load avatar data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await loadAvatar(avatarId);
        if (response.success && response.avatar) {
          setAvatar(response.avatar);
          setFormData({
            avatar_name: response.avatar.avatar_name,
            agent_bio: response.avatar.agent_bio || '',
            prompt: response.avatar.prompt || '',
            scene_prompt: response.avatar.scene_prompt || '',
            voice_id: response.avatar.voice_id || ''
          });
          if (response.avatar.image_uri) {
            try {
              const { presignedUrl } = await getPresignedUrl(response.avatar.image_uri);
              setImageUrl(presignedUrl);
            } catch (error) {
              console.error('Error getting presigned URL:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [avatarId]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600 font-['Montserrat',Helvetica]">Wrong Avatar ID</h1>
        <p className="font-['Montserrat',Helvetica] text-white">The avatar with ID {avatarId} does not exist.</p>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      const response = await updateAvatarData(avatarId, formData);
      if (response.success) {
        // Reload the avatar data to show updated values
        const updatedResponse = await loadAvatar(avatarId);
        if (updatedResponse.success && updatedResponse.avatar) {
          setAvatar(updatedResponse.avatar);
          setShowSuccessPopup(true);
        }
      } else {
        console.error('Failed to update avatar:', response.message);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-[#121214] flex flex-row justify-center w-full">
      <div className="bg-[#121214] w-[1920px] h-[1080px] relative">
        <div className="flex flex-col w-[1920px] items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
            {imageUrl && (
              <div className="relative w-[525.42px] h-[937.44px] rounded-xl overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt={avatar.avatar_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex flex-col w-[613.7px] h-[937.44px] items-center justify-between p-8 relative bg-[#1a1a1e] rounded-[4.72px]">
              <div className="flex flex-col items-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto] bg-[#1a1a1e]">
                  <h2 className="self-stretch font-semibold text-[16px] leading-[24px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Edit Profile</h2>
                  
                  <div className="space-y-4 w-full">
                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Name</div>
                      <div className="flex h-10 items-center gap-2 relative self-stretch w-full">
                        <input
                          type="text"
                          value={formData.avatar_name}
                          onChange={(e) => handleInputChange('avatar_name', e.target.value)}
                          className="h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs w-full"
                          placeholder="Type a message..."
                        />
                      </div>
                    </div>

                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Agent Bio</div>
                      <div className="flex h-10 items-center gap-2 relative self-stretch w-full">
                        <input
                          type="text"
                          value={formData.agent_bio}
                          onChange={(e) => handleInputChange('agent_bio', e.target.value)}
                          className="h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs w-full"
                          placeholder="Type a message..."
                        />
                      </div>
                    </div>

                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Prompt</div>
                      <div className="flex items-start gap-2.5 relative self-stretch w-full" style={{ height: '141px' }}>
                        <textarea
                          value={formData.prompt}
                          onChange={(e) => handleInputChange('prompt', e.target.value)}
                          className="w-full h-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs resize-none overflow-hidden"
                          placeholder="Type a message..."
                          style={{ height: '100%' }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Scene Prompt</div>
                      <div className="flex items-start gap-2.5 relative self-stretch w-full" style={{ height: '141px' }}>
                        <textarea
                          value={formData.scene_prompt}
                          onChange={(e) => handleInputChange('scene_prompt', e.target.value)}
                          className="w-full h-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs resize-none overflow-hidden"
                          placeholder="Type a message..."
                          style={{ height: '100%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-4 relative self-stretch w-full mt-2">
                    <div>
                      <div className="self-stretch font-semibold text-[16px] leading-[24px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">
                        Edit Voice
                      </div>
                    </div>
                    <div className="flex flex-row items-center relative self-stretch w-full">
                      <input
                        type="text"
                        value={formData.voice_id}
                        onChange={(e) => handleInputChange('voice_id', e.target.value)}
                        className="h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs w-full"
                        placeholder="Enter voice name"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-4 relative self-stretch w-full mt-2">
                    <div>
                      <div className="self-stretch font-semibold text-[16px] leading-[24px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">
                        Character Studio
                      </div>
                      <div className="text-[12px] leading-[18px] text-gray-400 mt-1">
                        Edit your avatar in the studio environment
                      </div>
                    </div>
                    <div className="flex flex-row items-center relative self-stretch w-full">
                      <a 
                        href={`/dashboard/avatar-studio/${avatarId}?avatar_uri=${encodeURIComponent(avatar.image_uri || '')}`}
                        className="inline-flex items-center justify-center gap-[9px] px-[18px] py-[7.2px] rounded-[10.8px] bg-[#222327] border border-solid border-[#d2d5da40] hover:bg-[#1a1a1e]"
                      >
                        <span className="font-medium text-white text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                          Open Studio
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end w-full">
                <button 
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-[9px] px-[18px] py-[7.2px] bg-[#5856d6] rounded-[10.8px]"
                >
                  <span className="font-medium text-white text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                    Finish
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
            <Button
              variant="ghost"
              className="absolute top-2 right-2 text-white"
              onClick={() => setShowSuccessPopup(false)}
            >
              <X size={24} />
            </Button>
            <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={28} />
              Success!
            </h2>
            <p className="text-white text-lg">Your character has been updated successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
}
