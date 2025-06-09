'use client';

import { getPresignedUrl, loadAvatar, updateAvatarData, deleteAvatar, isUserAvatarOwnerAction } from '@/app/lib/actions';
import { useState, useEffect } from 'react';
import { use } from 'react';
import { X, CheckCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

type PageParams = {
  avatarId: string;
};

export default function EditAvatarPage({
    params,
  }: {
    params: Promise<PageParams>;
  }) {
  const { avatarId } = use(params);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingVoice, setIsEditingVoice] = useState(false);
  const [avatar, setAvatar] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [formData, setFormData] = useState({
    avatar_name: '',
    agent_bio: '',
    prompt: '',
    scene_prompt: '',
    voice_id: '',
    is_public: false
  });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { data: session } = useSession();

  // Add effect to auto-hide success popup
  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => {
        setShowSuccessPopup(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup]);

  // Add effect to auto-hide error popup
  useEffect(() => {
    if (showErrorPopup) {
      const timer = setTimeout(() => {
        setShowErrorPopup(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showErrorPopup]);

  // Load avatar data and check ownership
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
            voice_id: response.avatar.voice_id || '',
            is_public: response.avatar.is_public || false
          });
          if (response.avatar.image_uri) {
            try {
              const { presignedUrl } = await getPresignedUrl(response.avatar.image_uri);
              setImageUrl(presignedUrl);
            } catch (error) {
              console.error('Error getting presigned URL:', error);
            }
          }

          // Check ownership if user is logged in
          if (session?.user?.email) {
            const ownershipResponse = await isUserAvatarOwnerAction(session.user.email, avatarId);
            setIsOwner(ownershipResponse.isOwner);
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [avatarId, session?.user?.email, router]);

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
    if (!isOwner) return;
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
        setErrorMessage(response.message);
        setShowErrorPopup(true);
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      setShowErrorPopup(true);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (!isOwner) return;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    try {
      const response = await deleteAvatar(avatarId);
      if (response.success) {
        setShowDeleteSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        console.error('Failed to delete character:', response.message);
      }
    } catch (error) {
      console.error('Error deleting character:', error);
    }
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
            
            <div className={`flex flex-col w-[613.7px] h-[937.44px] items-center justify-between p-8 relative bg-[#1a1a1e] rounded-[4.72px] ${!isOwner ? 'opacity-75' : ''}`}>
              <div className="flex flex-col items-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto] bg-[#1a1a1e]">
                  <div className="flex justify-between items-center w-full">
                    <h2 className="font-semibold text-[16px] leading-[24px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Edit Profile</h2>
                  </div>
                  
                  <div className="space-y-4 w-full">
                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Name</div>
                      <div className="flex h-10 items-center gap-2 relative self-stretch w-full">
                        <input
                          type="text"
                          value={formData.avatar_name}
                          onChange={(e) => handleInputChange('avatar_name', e.target.value)}
                          className={`h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs w-full ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="Type a message..."
                          disabled={!isOwner}
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
                          className={`h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs w-full ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="Type a message..."
                          disabled={!isOwner}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Prompt</div>
                      <div className="flex items-start gap-2.5 relative self-stretch w-full" style={{ height: '141px' }}>
                        <textarea
                          value={formData.prompt}
                          onChange={(e) => handleInputChange('prompt', e.target.value)}
                          className={`w-full h-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs resize-none overflow-hidden ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="Type a message..."
                          style={{ height: '100%' }}
                          disabled={!isOwner}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">Scene Prompt</div>
                      <div className="flex items-start gap-2.5 relative self-stretch w-full" style={{ height: '141px' }}>
                        <textarea
                          value={formData.scene_prompt}
                          onChange={(e) => handleInputChange('scene_prompt', e.target.value)}
                          className={`w-full h-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs resize-none overflow-hidden ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="Type a message..."
                          style={{ height: '100%' }}
                          disabled={!isOwner}
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
                        className={`h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs w-full ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="Enter voice name"
                        disabled={!isOwner}
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
                    <div className="flex flex-row items-center justify-between relative self-stretch w-full">
                      <a 
                        href={`/character-studio/${avatarId}?avatar_uri=${encodeURIComponent(avatar.image_uri || '')}`}
                        className={`inline-flex items-center justify-center gap-[9px] px-[36px] py-[7.2px] rounded-[10.8px] bg-blue-500 hover:bg-blue-700 text-white transition-colors duration-200 ${!isOwner ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      >
                        <span className="font-medium text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                          Open in Studio
                        </span>
                      </a>
                      <button
                        onClick={() => handleInputChange('is_public', !formData.is_public)}
                        className={`inline-flex items-center justify-center gap-[9px] px-[36px] py-[7.2px] rounded-[10.8px] ${
                          formData.is_public 
                            ? 'bg-green-500 hover:bg-green-700' 
                            : 'bg-blue-500 hover:bg-blue-700'
                        } text-white transition-colors duration-200 ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isOwner}
                      >
                        <span className="font-medium text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                          {formData.is_public ? 'Public' : 'Private'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`inline-flex items-center justify-center gap-2 px-[18px] py-[7.2px] bg-red-800 hover:bg-red-900 rounded-[10.8px] text-white ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isOwner}
                >
                  <Trash2 size={18} />
                  <span className="font-medium text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                    Delete Character
                  </span>
                </Button>

                <button 
                  onClick={handleSave}
                  className={`inline-flex items-center justify-center gap-[9px] px-[18px] py-[7.2px] bg-[#5856d6] rounded-[10.8px] ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isOwner}
                >
                  <span className="font-medium text-white text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                    Save
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
            <Button
              variant="ghost"
              className="absolute top-2 right-2 text-white"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <X size={24} />
            </Button>
            <h2 className="text-white text-2xl font-semibold mb-4">Confirm Deletion</h2>
            <p className="text-white text-lg mb-6">Are you sure you want to delete this avatar? This action cannot be undone.</p>
            <div className="flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-white"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDelete();
                }}
                className="text-white border-red-600 hover:bg-red-600 hover:text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
            <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={28} />
              Avatar Deleted
            </h2>
            <p className="text-white text-lg">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

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

      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
            <Button
              variant="ghost"
              className="absolute top-2 right-2 text-white"
              onClick={() => setShowErrorPopup(false)}
            >
              <X size={24} />
            </Button>
            <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
              <X className="text-red-500 mr-2" size={28} />
              Error
            </h2>
            <p className="text-white text-lg">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
