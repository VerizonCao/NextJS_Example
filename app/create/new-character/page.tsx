'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { saveAvatarData, generatePresignedUrl, cloneVoice, sendImageForModeration } from '@/app/lib/actions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Cropper, { Area, Point } from 'react-easy-crop';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import DragDropImageUpload from '@/app/components/DragDropImageUpload';
import { CustomInput } from '@/app/components/ui/custom-input';
import { CustomTextarea } from '@/app/components/ui/custom-textarea';
import { X, CheckCircle } from 'lucide-react';
import VoiceCloneUpload from '@/app/components/VoiceCloneUpload';
import LayoutWithNavBar from '@/app/home/tab/layout-with-navbar';
import { validateGreetingFormat, GREETING_PLACEHOLDER, DEFAULT_GREETING_CONTENT } from '@/app/utils/greetingValidation';

interface VoiceSample {
  id: string;
  audioUrl: string;
}

export default function ImageUploadPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [greeting, setGreeting] = useState(DEFAULT_GREETING_CONTENT);
  const [greetingError, setGreetingError] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [name, setName] = useState('');
  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showVoiceSection, setShowVoiceSection] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [gender, setGender] = useState('');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Data for the tabs
  const tabs = [
    { id: "step-1", label: "1. Create Image" },
    { id: "step-2", label: "2. Edit Profile" },
    { id: "step-3", label: "3. Choose Voice" },
  ];

  // Form fields data
  const formFields = [
    { id: "character-name", label: "Character Name", type: "input", wordLimit: 20 },
    { id: "tagline", label: "Tagline", type: "input", wordLimit: 50 },
    {
      id: "description",
      label: "Description",
      type: "textarea",
      height: "h-[177px]",
      wordLimit: 500,
    },
    { id: "greeting", label: "Greeting", type: "textarea", height: "h-[140px]", wordLimit: 500 },
  ] as const;

  useEffect(() => {
    // Load local audio samples
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
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.onended = () => {
      setIsPlaying(null);
      setCurrentTime(0);
      setCurrentAudio(null);
    };
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(null);
      setCurrentTime(0);
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
    setCurrentTime(0);
  };

  const handleImageUpload = (file: File) => {
    setSelectedImage(file);
    setShowCropper(true);
    setCroppedImage(null);
  };

  const onCropComplete = useCallback(async (croppedArea: Area, croppedAreaPixels: Area) => {
    if (!selectedImage) return;

    try {
      const canvas = document.createElement('canvas');
      const image = document.createElement('img');
      image.src = URL.createObjectURL(selectedImage);
      
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
      });

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(
        image,
        croppedAreaPixels.x * scaleX,
        croppedAreaPixels.y * scaleY,
        croppedAreaPixels.width * scaleX,
        croppedAreaPixels.height * scaleY,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const croppedImageUrl = canvas.toDataURL('image/jpeg');
      setCroppedImage(croppedImageUrl);
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  }, [selectedImage]);

  const handleApplyCrop = () => {
    setShowCropper(false);
    if (croppedImage) {
      setPreviewUrl(croppedImage);
    }
  };

  const handleGenerateAvatar = async () => {
    if (selectedImage && prompt && name && selectedVoice && bio) {
      try {
        // Create a unique key for the image using the name and timestamp
        const timestamp = new Date().getTime();
        const fileExtension = selectedImage.name.split('.').pop();
        console.log('fileExtension:', fileExtension);
        const key = `rita-avatars/${name}-${timestamp}.${fileExtension}`;
        console.log('key:', key);
        
        // Get the presigned URL using the server action
        const presignedUrlResponse = await generatePresignedUrl(key);
        console.log('presignedUrl:', presignedUrlResponse);

        // Convert cropped image data URL to Blob
        let imageToUpload: Blob;
        if (croppedImage) {
          const response = await fetch(croppedImage);
          imageToUpload = await response.blob();
        } else {
          imageToUpload = selectedImage;
        }
        
        // Upload the image using the presigned URL
        const uploadResponse = await fetch(presignedUrlResponse.presignedUrl, {
          method: 'PUT',
          body: imageToUpload,
          headers: {
            'Content-Type': selectedImage.type,
          },
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        else
        {
          console.log('Image uploaded successfully:', key);
          console.log('Prompt:', prompt);
          console.log('Name:', name);
          
          // You can implement additional logic here, such as saving the image URL to your database
          const owner_email = session?.user?.email ?? '';
          if (owner_email) {
            // Strip the 'cloned-' prefix if it exists
            const voiceId = selectedVoice.startsWith('cloned-') 
              ? selectedVoice.slice(7) // Remove 'cloned-' prefix
              : selectedVoice;

            // Save the avatar to the database using the server action
            const result = await saveAvatarData({
              avatar_name: name,
              prompt: prompt,
              opening_prompt: greeting || undefined,
              agent_bio: bio,
              owner_email: owner_email,
              image_uri: key,
              voice_id: voiceId,
              is_public: isPublic,
              gender: gender || undefined
            });
            
            if (result.success && result.avatar_id) {
              console.log('Avatar saved successfully with name:', name);
              
              // Send the image for moderation
              const moderationResult = await sendImageForModeration(key, result.avatar_id);
              if (!moderationResult.success) {
                console.error('Failed to send image for moderation:', moderationResult.message);
              }
            } else {
              console.error('Failed to save avatar to database:', result.message);
            }
          }

          // redirect to the dashboard
          router.push('/');
        } 
        
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  // Validate greeting format
  const greetingValidation = greeting.trim() ? validateGreetingFormat(greeting) : { isValid: false, error: "Greeting is required" };
  const isTextFieldsValid = prompt.trim() !== '' && greetingValidation.isValid && bio.trim() !== '' && name.trim() !== '';
  const isFormValid = selectedImage && isTextFieldsValid && selectedVoice !== '';

  const isStep1Valid = selectedImage !== null;
  const isStep2Valid = name.trim() !== '' && bio.trim() !== '' && prompt.trim() !== '';
  const isStep3Valid = selectedVoice !== '';

  const handleNext = () => {
    if (currentStep === 1 && !isStep1Valid) {
      return;
    }
    if (currentStep === 2 && !isStep2Valid) {
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <LayoutWithNavBar className="bg-[#121214] min-h-screen">
      <div className="min-h-screen">
        <div className="w-full relative">
          <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
            <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-0 py-[15px] relative">
              {/* Left Side - Image Container */}
              <div className="relative lg:h-full flex-shrink-0 flex items-center justify-center">
                <div className="h-full" style={{ width: 'calc(100vh * 9/16 - 30px)' }}>
                  <div className="h-full flex items-center justify-center bg-[#1a1a1e] rounded-l-[4.72px] overflow-hidden">
                    <DragDropImageUpload 
                      onImageUpload={handleImageUpload} 
                      croppedImageUrl={croppedImage}
                    />
                  </div>
                </div>
              </div>

              {/* Right Side - Form Section */}
              <div className="relative w-full lg:w-auto lg:h-full aspect-[9/16] flex-shrink-0 min-w-[500px]">
                <div className="flex flex-col w-full h-full bg-[#1a1a1e] rounded-r-[4.72px] overflow-hidden">
                  {/* Header with tabs - fixed at top */}
                  <div className="flex-shrink-0 p-6 pb-4">
                    <div className="flex h-10 items-center gap-4 relative w-full">
                      {tabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`inline-flex items-center justify-center gap-2.5 relative flex-[0_0_auto] ${
                            tab.id === `step-${currentStep}`
                              ? "border-b-2 border-white"
                              : "border-b-2 border-transparent"
                          }`}
                        >
                          <div
                            className={`relative w-fit font-['Montserrat',Helvetica] font-medium text-sm tracking-[0] leading-6 whitespace-nowrap ${
                              tab.id === `step-${currentStep}` ? "text-white" : "text-white/60"
                            }`}
                          >
                            {tab.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable content area */}
                  <div className="flex-1 min-h-0 overflow-y-auto" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                  }}>
                    <div className="px-6 pb-6">
                      {/* Form Fields */}
                      {currentStep === 1 && (
                        <div className="text-xs text-gray-400 font-['Montserrat',Helvetica] space-y-1">
                          <p>Important notes for your image:</p>
                          <ul className="list-disc list-inside pl-1 space-y-1.5">
                            <li>Image must contain clear facial details. Certain anime styles are not yet supported.</li>
                            <li>Supports JPG, PNG, JFIF.</li>
                            <li>
                              The image will be cropped to a 9:16 aspect ratio. 
                              You can use <a href="https://huggingface.co/spaces/fffiloni/diffusers-image-outpaint" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">outpainting tools </a> to adjust your image before uploading.
                            </li>
                          </ul>
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="flex flex-col items-start gap-4 relative w-full">
                          {/* Character Name */}
                          <div className="space-y-2 w-full">
                            <label className="block text-sm font-medium text-white">Character Name</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs placeholder:text-[#535a65]"
                              placeholder="Enter the name for your character"
                            />
                          </div>

                          {/* Gender Selection */}
                          <div className="space-y-2 w-full">
                            <label className="block text-sm font-medium text-white">Gender</label>
                            <select
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              className="w-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs appearance-none"
                              style={{
                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 16px center',
                                backgroundSize: '16px',
                                paddingRight: '48px'
                              }}
                            >
                              <option value="" className="bg-[#1a1a1e]">Select gender</option>
                              <option value="male" className="bg-[#1a1a1e]">Male</option>
                              <option value="female" className="bg-[#1a1a1e]">Female</option>
                              <option value="non-binary" className="bg-[#1a1a1e]">Non-binary</option>
                            </select>
                          </div>

                          {/* Tagline */}
                          <div className="space-y-2 w-full">
                            <label className="block text-sm font-medium text-white">Tagline</label>
                            <input
                              type="text"
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              className="w-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs placeholder:text-[#535a65]"
                              placeholder="Give your character a quick catchphrase"
                            />
                          </div>

                          {/* Description */}
                          <div className="space-y-2 w-full">
                            <label className="block text-sm font-medium text-white">Description</label>
                            <textarea
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              className="w-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs placeholder:text-[#535a65] resize-none"
                              placeholder="In a third person perspective, how would your character describe themselves?"
                              style={{
                                height: 'auto',
                                minHeight: '120px'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 300) + 'px';
                              }}
                            />
                          </div>

                          {/* Greeting */}
                          <div className="space-y-2 w-full">
                            <label className="block text-sm font-medium text-white">Greeting</label>
                            <textarea
                              value={greeting}
                              onChange={(e) => {
                                setGreeting(e.target.value);
                                // Validate greeting format on change
                                if (e.target.value.trim()) {
                                  const validation = validateGreetingFormat(e.target.value);
                                  setGreetingError(validation.error);
                                } else {
                                  setGreetingError("Greeting is required");
                                }
                              }}
                              className="w-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs placeholder:text-[#535a65] resize-none"
                              placeholder={GREETING_PLACEHOLDER}
                              style={{
                                height: 'auto',
                                minHeight: '140px'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 300) + 'px';
                              }}
                            />
                            {greetingError && (
                              <div className="text-red-400 text-xs mt-1 font-['Montserrat',Helvetica]">
                                {greetingError}
                              </div>
                            )}
                          </div>

                          {/* Visibility */}
                          <div className="space-y-2 w-full">
                            <label className="block text-sm font-medium text-white">Visibility</label>
                            <div className="flex items-center justify-between p-4 bg-[#222327] rounded-2xl">
                              <div>
                                <div className="text-sm font-medium text-white">{isPublic ? 'Public' : 'Private'}</div>
                                <div className="text-xs text-[#8f9092]">
                                  {isPublic 
                                    ? 'Allow others to discover your character' 
                                    : 'Only you can see this character'}
                                </div>
                              </div>
                              <button
                                onClick={() => setIsPublic(!isPublic)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isPublic ? 'bg-white' : 'bg-[#8f9092]'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-[#1a1a1e] transition-transform ${
                                    isPublic ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Voice Selection */}
                      {currentStep === 3 && (
                        <div className="flex flex-col items-start gap-4 relative w-full">
                          {voices.map((voice) => (
                            <Button
                              key={voice.id}
                              variant="ghost"
                              className={`flex items-center justify-between w-full rounded-xl py-5 px-4 h-12 transition-colors ${
                                selectedVoice === voice.id
                                  ? "bg-[#2a2b30] border-2 border-[#5856d6]"
                                  : "bg-[#222327] hover:bg-[#2a2b30]"
                              }`}
                              onClick={() => setSelectedVoice(voice.id)}
                            >
                              <div className="flex items-center">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPlaying === voice.id) {
                                      handleStopAudio();
                                    } else {
                                      handlePlayAudio(voice.id);
                                    }
                                  }}
                                  className="text-[#5856d6] mr-4 hover:text-[#3c34b5] transition-colors cursor-pointer"
                                >
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="24" 
                                    height="24" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  >
                                    {isPlaying === voice.id ? (
                                      <rect x="6" y="4" width="12" height="16" />
                                    ) : (
                                      <polygon points="5 3 19 12 5 21 5 3" />
                                    )}
                                  </svg>
                                </div>
                                <div className="text-left">
                                  <p className="text-white font-medium text-xs">
                                    {voice.id.startsWith('cloned-') ? 'Cloned Voice' : `Voice ${voice.id}`}
                                  </p>
                                </div>
                              </div>
                            </Button>
                          ))}
                          <div className="w-full mt-4">
                            <VoiceCloneUpload 
                              onVoiceCloned={(voiceId, originalAudioUrl) => {
                                // Add the cloned voice to the voices list with a special prefix
                                const clonedVoiceId = `cloned-${voiceId}`;
                                setVoices(prev => [...prev, {
                                  id: clonedVoiceId,
                                  audioUrl: originalAudioUrl // Use the original audio file URL
                                }]);
                                // Automatically select the newly cloned voice
                                setSelectedVoice(clonedVoiceId);
                              }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fixed footer with navigation buttons */}
                  <div className="flex-shrink-0 p-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between w-full">
                      <Button
                        variant="ghost"
                        className="inline-flex items-center justify-center gap-[9px] px-[18px] py-[7.2px] rounded-[10.8px] text-white hover:bg-[#2a2a2e]"
                        onClick={currentStep === 1 ? () => setShowCropper(true) : handlePrevious}
                        disabled={currentStep === 1 && !selectedImage}
                      >
                        <span className="font-medium text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                          {currentStep === 1 ? 'Edit' : 'Previous'}
                        </span>
                      </Button>
                      {currentStep === 3 ? (
                        <Button 
                          className="inline-flex items-center justify-center gap-[9px] px-[18px] py-[7.2px] bg-[#5856d6] hover:bg-[#3c34b5] rounded-[10.8px] transition-colors duration-200"
                          onClick={async () => {
                            await handleGenerateAvatar();
                            setShowSuccessPopup(true);
                          }}
                          disabled={!isStep3Valid}
                        >
                          <span className="font-medium text-white text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                            Create Character
                          </span>
                        </Button>
                      ) : (
                        <Button 
                          className={`inline-flex items-center justify-center gap-[9px] px-[18px] py-[7.2px] rounded-[10.8px] transition-colors duration-200 ${
                            (currentStep === 1 && isStep1Valid) || (currentStep === 2 && isStep2Valid)
                              ? "bg-[#5856d6] hover:bg-[#3c34b5]"
                              : "bg-[#5856d6]/50 cursor-not-allowed"
                          }`}
                          onClick={handleNext}
                          disabled={(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)}
                        >
                          <span className="font-medium text-white text-[12.6px] leading-[21.6px] whitespace-nowrap font-['Montserrat',Helvetica]">
                            Next
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropper && selectedImage && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center">
          <Card 
            className="rounded-xl border text-card-foreground shadow bg-[#222327] border-none"
            style={{
              width: `calc(min(90vw, (90vh - 200px) * 9/16 + 48px))`, // Cropper width + padding
              maxWidth: '100vw'
            }}
          >
            <CardContent className="p-6 flex flex-col gap-6">
              {/* Header */}
              <p className="text-sm text-white font-medium flex-shrink-0">
                Crop your image to 9:16 aspect ratio:
              </p>

              {/* Cropper Container - Calculate height as 90vh minus other elements (header + controls + buttons) */}
              <div 
                className="relative bg-[#1a1a1e] rounded-sm overflow-hidden mx-auto"
                style={{
                  height: 'calc(90vh - 200px)', // Account for header (40px), zoom controls (60px), buttons (60px), padding (40px)
                  width: 'calc((90vh - 200px) * 9/16)', // Width based on available height to maintain 9:16
                  maxWidth: '90vw'
                }}
              >
                <Cropper
                  image={URL.createObjectURL(selectedImage)}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={9/16}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  minZoom={0.5}
                  maxZoom={3}
                  objectFit="contain"
                  showGrid={true}
                  restrictPosition={false}
                  style={{
                    containerStyle: {
                      backgroundColor: '#1a1a1e',
                    },
                    mediaStyle: {
                      backgroundColor: '#1a1a1e',
                    },
                    cropAreaStyle: {
                      border: '2px solid white',
                    },
                  }}
                />
              </div>

              {/* Controls - Fixed height */}
              <div className="flex flex-col gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">Zoom:</span>
                  <input
                    type="range"
                    value={zoom}
                    min={0.5}
                    max={3}
                    step={0.03}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-[#5856d6] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Buttons - Fixed height */}
              <div className="flex items-center justify-center gap-4 flex-shrink-0">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-[#2a2a2e]"
                  onClick={() => setShowCropper(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#5856d6] hover:bg-[#3c34b5] text-white"
                  onClick={handleApplyCrop}
                >
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
            <Button
              variant="ghost"
              className="absolute top-2 right-2 text-white"
              onClick={() => {
                setShowSuccessPopup(false);
                router.push('/');
              }}
            >
              <X size={24} />
            </Button>
            <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={28} />
              Success!
            </h2>
            <p className="text-white text-lg">You can find your character under my avatar.</p>
          </div>
        </div>
      )}
    </LayoutWithNavBar>
  );
}
