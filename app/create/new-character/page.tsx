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
  const [scenePrompt, setScenePrompt] = useState('');
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
    { id: "scene", label: "Scene", type: "textarea", height: "h-[190px]", wordLimit: 500 },
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
              scene_prompt: scenePrompt || undefined,
              agent_bio: bio,
              owner_email: owner_email,
              image_uri: key,
              voice_id: voiceId, // Use the cleaned voice ID
              is_public: isPublic
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

  const isTextFieldsValid = prompt.trim() !== '' && scenePrompt.trim() !== '' && bio.trim() !== '' && name.trim() !== '';
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
    <div className="bg-[#121214] min-h-screen">
      <div className="max-w-[1920px] mx-auto px-10 py-6">
        <div className="flex items-center justify-center gap-2 relative self-stretch w-full">
          {/* Left Side - Drag and Drop Area */}
          <DragDropImageUpload 
            onImageUpload={handleImageUpload} 
            croppedImageUrl={croppedImage}
          />

          {/* Right Side - Form Section */}
          <div className="flex flex-col w-[613.7px] h-[937.44px] items-center justify-between p-8 relative bg-[#1a1a1e] rounded-[4.72px]">
            <div className="flex flex-col items-center gap-6 relative self-stretch w-full flex-[0_0_auto]">
              {/* Custom Tabs */}
              <div className="flex h-10 items-center gap-4 relative self-stretch w-full">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`inline-flex items-center justify-center gap-2.5 relative self-stretch flex-[0_0_auto] ${
                      tab.id === `step-${currentStep}`
                        ? "border-b-2 border-[#5856d6]"
                        : "border-b-2 border-transparent"
                    }`}
                  >
                    <div
                      className={`relative w-fit font-['Montserrat',Helvetica] font-medium text-sm tracking-[0] leading-6 whitespace-nowrap ${
                        tab.id === `step-${currentStep}` ? "text-[#5856d6]" : "text-white"
                      }`}
                    >
                      {tab.label}
                    </div>
                  </div>
                ))}
              </div>
              {/* Form Fields */}
              {currentStep === 1 && (
                <div className="text-xs text-gray-400 mt-3 font-['Montserrat',Helvetica] space-y-1">
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
                <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto] bg-[#1a1a1e]">
                  {formFields.map((field) => (
                    <React.Fragment key={field.id}>
                      <div className="self-stretch mt-[-1.00px] font-semibold text-[12.6px] leading-[21.6px] relative font-['Montserrat',Helvetica] text-white tracking-[0]">
                        {field.label}
                      </div>

                      {field.type === "input" ? (
                        <CustomInput
                          className="h-10 px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs placeholder:text-[#535a65]"
                          placeholder={
                            field.id === "character-name"
                              ? "Enter the name for your character"
                              : field.id === "tagline"
                              ? "Give your character a quick catchphrase"
                              : "Type a message..."
                          }
                          wordLimit={field.wordLimit}
                          value={field.id === "character-name" ? name : field.id === "tagline" ? bio : ""}
                          onChange={(e) => {
                            if (field.id === "character-name") setName(e.target.value);
                            else if (field.id === "tagline") setBio(e.target.value);
                          }}
                        />
                      ) : (
                        <CustomTextarea
                          height={field.height}
                          className="w-full px-3 py-2 bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] font-['Montserrat',Helvetica] font-normal text-white text-xs placeholder:text-[#535a65]"
                          placeholder={
                            field.id === "description"
                              ? "In a third person perspective, how would your character describe themselves?"
                              : field.id === "scene"
                              ? "*Optional* Describe the starting scene of the story between your character and you."
                              : "Type a message..."
                          }
                          wordLimit={field.wordLimit}
                          value={field.id === "description" ? prompt : field.id === "scene" ? scenePrompt : ""}
                          onChange={(e) => {
                            if (field.id === "description") setPrompt(e.target.value);
                            else if (field.id === "scene") setScenePrompt(e.target.value);
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                  <div className="mt-4 flex items-center gap-2 self-stretch">
                    <input
                      type="checkbox"
                      id="isPublicCheckbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="h-4 w-4 text-[#5856d6] bg-gray-700 border-gray-600 rounded focus:ring-[#5856d6] focus:ring-2"
                    />
                    <label htmlFor="isPublicCheckbox" className="font-['Montserrat',Helvetica] text-sm text-white">
                      Make this character public
                    </label>
                  </div>
                </div>
              )}

              {/* Voice Selection */}
              {currentStep === 3 && (
                <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto] bg-[#1a1a1e]">
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

            {/* Previous and Next Buttons */}
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

      {/* Crop Modal */}
      {showCropper && selectedImage && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center">
          <Card className="w-[90vw] max-w-[452px] bg-[#222327] border-none">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                <p className="text-sm text-white font-medium">
                  Crop your image to 9:16 aspect ratio:
                </p>

                <div className="relative w-full aspect-[9/16] bg-[#1a1a1e] rounded-sm overflow-hidden">
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

                <div className="flex flex-col gap-4">
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

                <div className="flex items-center justify-center gap-4">
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
    </div>
  );
}
