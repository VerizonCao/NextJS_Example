'use client';

import { getPresignedUrl, loadAvatar, updateAvatarData, deleteAvatar, isUserAvatarOwnerAction } from '@/app/lib/actions';
import { useState, useEffect } from 'react';
import { use } from 'react';
import { X, CheckCircle, Trash2, Play, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import LayoutWithNavBar from '@/app/home/tab/layout-with-navbar';
import { validateGreetingFormat, GREETING_PLACEHOLDER, DEFAULT_GREETING_CONTENT } from '@/app/utils/greetingValidation';
import VoiceCloneUpload from '@/app/components/VoiceCloneUpload';

type PageParams = {
  avatarId: string;
};

interface VoiceSample {
  id: string;
  audioUrl: string;
}

export default function EditAvatarPage({
    params,
  }: {
    params: Promise<PageParams>;
  }) {
  const { avatarId } = use(params);
  const [avatar, setAvatar] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [formData, setFormData] = useState({
    avatar_name: '',
    agent_bio: '',
    prompt: '',
    opening_prompt: '',
    voice_id: '',
    is_public: false
  });
  const [greetingError, setGreetingError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Load voices
  useEffect(() => {
    const audioSamples: VoiceSample[] = [
      {
        id: '6f84f4b8-58a2-430c-8c79-688dad597532',
        audioUrl: '/audio_samples/6f84f4b8-58a2-430c-8c79-688dad597532.wav'
      },
      {
        id: '794f9389-aac1-45b6-b726-9d9369183238',
        audioUrl: '/audio_samples/794f9389-aac1-45b6-b726-9d9369183238.wav'
      },
      {
        id: 'c99d36f3-5ffd-4253-803a-535c1bc9c306',
        audioUrl: '/audio_samples/c99d36f3-5ffd-4253-803a-535c1bc9c306.wav'
      },
      {
        id: 'd3b22900-ec95-4344-a548-2d34e9b842b7',
        audioUrl: '/audio_samples/d3b22900-ec95-4344-a548-2d34e9b842b7.wav'
      }
    ];
    setVoices(audioSamples);
  }, []);

  const handlePlayAudio = (voiceId: string) => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    setIsPlaying(voiceId);
    const voice = voices.find(v => v.id === voiceId);
    if (!voice) return;
    
    const audio = new Audio(voice.audioUrl);
    setCurrentAudio(audio);
    
    audio.onended = () => {
      setIsPlaying(null);
      setCurrentAudio(null);
    };
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(null);
      setCurrentAudio(null);
    });
  };

  const handleStopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setIsPlaying(null);
  };

  // Auto-hide popups
  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => {
        setShowSuccessPopup(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup]);

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
            opening_prompt: response.avatar.opening_prompt || response.avatar.scene_prompt || DEFAULT_GREETING_CONTENT,
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

  const handleSave = async () => {
    if (!isOwner) return;
    
    // Validate greeting format before saving
    if (formData.opening_prompt.trim()) {
      const validation = validateGreetingFormat(formData.opening_prompt);
      if (!validation.isValid) {
        setGreetingError(validation.error);
        return;
      }
    }
    
    try {
      const response = await updateAvatarData(avatarId, formData);
      if (response.success) {
        // Reload the avatar data to show updated values
        const updatedResponse = await loadAvatar(avatarId);
        if (updatedResponse.success && updatedResponse.avatar) {
          setAvatar(updatedResponse.avatar);
          setShowSuccessPopup(true);
          setGreetingError(null);
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
    
    // Clear greeting error when user starts typing
    if (field === 'opening_prompt') {
      setGreetingError(null);
      // Validate on change
      if (typeof value === 'string' && value.trim()) {
        const validation = validateGreetingFormat(value);
        setGreetingError(validation.error);
      }
    }
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

  if (isLoading) {
    return (
      <LayoutWithNavBar className="bg-[#121214] min-h-screen">
        <div className="bg-[#121214] min-h-screen w-full flex items-center justify-center">
          <div className="text-white text-lg">Preparing character...</div>
        </div>
      </LayoutWithNavBar>
    );
  }

  if (!avatar) {
    return (
      <LayoutWithNavBar className="bg-[#121214] min-h-screen">
        <div className="bg-[#121214] min-h-screen w-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-2">Wrong Avatar ID</h1>
            <p className="text-[#8f9092]">The avatar with ID {avatarId} does not exist.</p>
          </div>
        </div>
      </LayoutWithNavBar>
    );
  }

  return (
    <LayoutWithNavBar className="bg-[#121214] min-h-screen">
      <div className="bg-[#121214] min-h-screen py-16">
        <div className="max-w-[700px] mx-auto px-6">
          
          {/* Form Content - Narrower container */}
          <div className="w-full space-y-8">
            
            {/* Character Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Character Name</label>
              <input
                type="text"
                value={formData.avatar_name}
                onChange={(e) => handleInputChange('avatar_name', e.target.value)}
                className={`w-full px-4 py-3 bg-[#222327] rounded-xl border border-[#d2d5da40] text-white text-sm placeholder:text-[#535a65] focus:border-[#5856d6] focus:outline-none transition-colors ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="Enter character name"
                disabled={!isOwner}
              />
              <p className="text-xs text-[#8f9092]">
                Image is not editable. Use Character Studio for image modifications.
              </p>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Tagline</label>
              <input
                type="text"
                value={formData.agent_bio}
                onChange={(e) => handleInputChange('agent_bio', e.target.value)}
                className={`w-full px-4 py-3 bg-[#222327] rounded-xl border border-[#d2d5da40] text-white text-sm placeholder:text-[#535a65] focus:border-[#5856d6] focus:outline-none transition-colors ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="Give your character a quick catchphrase"
                disabled={!isOwner}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Description</label>
              <textarea
                value={formData.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                className={`w-full h-[120px] px-4 py-3 bg-[#222327] rounded-xl border border-[#d2d5da40] text-white text-sm placeholder:text-[#535a65] focus:border-[#5856d6] focus:outline-none transition-colors resize-none ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="In a third person perspective, how would your character describe themselves?"
                disabled={!isOwner}
              />
            </div>

            {/* Greeting */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Greeting</label>
              <textarea
                value={formData.opening_prompt}
                onChange={(e) => handleInputChange('opening_prompt', e.target.value)}
                className={`w-full h-[140px] px-4 py-3 bg-[#222327] rounded-xl border border-[#d2d5da40] text-white text-sm placeholder:text-[#535a65] focus:border-[#5856d6] focus:outline-none transition-colors resize-none ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={GREETING_PLACEHOLDER}
                disabled={!isOwner}
              />
              {greetingError && (
                <div className="text-red-400 text-xs">
                  {greetingError}
                </div>
              )}
            </div>

            {/* Voice Selection - With Container - Fixed nested button issue */}
            <div className="bg-[#1a1a1e] rounded-xl p-8">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-white">Voice</label>
                <div className="space-y-3">
                  {voices.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => !isOwner ? null : handleInputChange('voice_id', voice.id)}
                      className={`flex items-center justify-between w-full p-4 rounded-xl transition-colors cursor-pointer ${
                        formData.voice_id === voice.id
                          ? "bg-[#ffffff1a] border-2 border-white"
                          : "bg-[#222327] hover:bg-[#2a2a2e] border-2 border-transparent"
                      } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPlaying === voice.id) {
                              handleStopAudio();
                            } else {
                              handlePlayAudio(voice.id);
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ffffff1a] hover:bg-[#ffffff20] text-white transition-colors"
                        >
                          {isPlaying === voice.id ? (
                            <Square className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <span className="text-white text-sm font-medium">
                          {voice.id.startsWith('cloned-') ? 'Cloned Voice' : `Voice ${voice.id}`}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {isOwner && (
                    <div className="mt-4">
                      <VoiceCloneUpload 
                        onVoiceCloned={(voiceId, originalAudioUrl) => {
                          const clonedVoiceId = `cloned-${voiceId}`;
                          setVoices(prev => [...prev, {
                            id: clonedVoiceId,
                            audioUrl: originalAudioUrl
                          }]);
                          handleInputChange('voice_id', clonedVoiceId);
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white">Visibility</label>
              <div className="flex items-center justify-between p-4 bg-[#222327] rounded-xl">
                <div>
                  <div className="text-sm font-medium text-white">Public Character</div>
                  <div className="text-xs text-[#8f9092]">Allow others to discover and use your character</div>
                </div>
                <button
                  onClick={() => handleInputChange('is_public', !formData.is_public)}
                  disabled={!isOwner}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_public ? 'bg-white' : 'bg-[#8f9092]'
                  } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#1a1a1e] transition-transform ${
                      formData.is_public ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions - Separator and buttons */}
          <div className="w-full mt-8">
            <div className="w-full h-[1px] bg-[#2a2a2e] mb-6" />
            <div className="flex justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!isOwner}
                className={`text-red-400 text-sm font-medium hover:text-red-300 transition-colors border-b border-transparent hover:border-red-400 ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Delete Character
              </button>

              <button 
                onClick={handleSave}
                disabled={!isOwner}
                className={`px-6 py-3 text-sm font-medium bg-[#ffffff1a] hover:bg-[#ffffff20] text-white rounded-xl transition-colors ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1e] rounded-xl p-8 max-w-md mx-4">
            <div className="text-center space-y-4">
              <h2 className="text-white text-xl font-semibold">Confirm Deletion</h2>
              <p className="text-[#8f9092] text-sm">Are you sure you want to delete this character? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white hover:bg-[#ffffff1a] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDelete();
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1e] rounded-xl p-8 max-w-md mx-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="text-green-500 w-12 h-12" />
              </div>
              <h2 className="text-white text-xl font-semibold">Character Deleted</h2>
              <p className="text-[#8f9092] text-sm">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1e] rounded-xl p-8 max-w-md mx-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="text-green-500 w-12 h-12" />
              </div>
              <h2 className="text-white text-xl font-semibold">Success!</h2>
              <p className="text-[#8f9092] text-sm">Your character has been updated successfully.</p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full px-4 py-3 text-sm font-medium bg-[#ffffff1a] hover:bg-[#ffffff20] text-white rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1e] rounded-xl p-8 max-w-md mx-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <X className="text-red-500 w-12 h-12" />
              </div>
              <h2 className="text-white text-xl font-semibold">Error</h2>
              <p className="text-[#8f9092] text-sm">{errorMessage}</p>
              <button
                onClick={() => setShowErrorPopup(false)}
                className="w-full px-4 py-3 text-sm font-medium bg-[#ffffff1a] hover:bg-[#ffffff20] text-white rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutWithNavBar>
  );
}
