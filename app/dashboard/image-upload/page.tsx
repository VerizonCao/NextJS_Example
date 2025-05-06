'use client';

import { useState, useEffect, useCallback } from 'react';
import { saveAvatarData, generatePresignedUrl } from '@/app/lib/actions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Cropper, { Area, Point } from 'react-easy-crop';

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
    setIsPlaying(voiceId);
    const voice = voices.find(v => v.id === voiceId);
    if (!voice) return;
    
    const audio = new Audio(voice.audioUrl);
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.onended = () => {
      setIsPlaying(null);
      setCurrentTime(0);
    };
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(null);
      setCurrentTime(0);
    });
  };

  const handleStopAudio = () => {
    setIsPlaying(null);
    setCurrentTime(0);
    // Stop all audio elements
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setShowCropper(true);
      setCroppedImage(null);
    }
  };

  const handleApplyCrop = () => {
    setShowCropper(false);
    if (croppedImage) {
      setPreviewUrl(croppedImage);
    }
  };

  const handleGenerateAvatar = async () => {
    if (selectedImage && prompt && name && selectedVoice && bio && scenePrompt) {
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
        // Upload the image using the presigned URL
        const uploadResponse = await fetch(presignedUrlResponse.presignedUrl, {
          method: 'PUT',
          body: selectedImage,
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
            // Save the avatar to the database using the server action
            const result = await saveAvatarData({
              avatar_name: name,
              prompt: prompt,
              scene_prompt: scenePrompt,
              agent_bio: bio,
              owner_email: owner_email,
              image_uri: key,
              voice_id: selectedVoice,
              is_public: isPublic
            });
            
            if (result.success) {
              console.log('Avatar saved successfully with name:', name);
              // You could add a success message or redirect here
            } else {
              console.error('Failed to save avatar to database:', result.message);
            }
          }

          // redirect to the dashboard
          router.push('/dashboard/my-avatars');
        } 
        
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  const isTextFieldsValid = prompt.trim() !== '' && scenePrompt.trim() !== '' && bio.trim() !== '' && name.trim() !== '';
  const isFormValid = selectedImage && isTextFieldsValid && selectedVoice !== '';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-white font-['Montserrat',Helvetica]">Image Upload</h1>

      {/* <audio controls src="/audio_samples/6f84f4b8-58a2-430c-8c79-688dad597532.wav" /> */}
      
      <div className="mb-4">
        <label 
          htmlFor="image-upload" 
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded cursor-pointer inline-block font-['Montserrat',Helvetica]"
        >
          Choose Image
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {showCropper && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-gray-900 p-4 rounded-lg w-[90vw] h-[90vh] flex flex-col">
            <div className="relative w-full h-[80vh]">
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
                    backgroundColor: 'black',
                  },
                  mediaStyle: {
                    backgroundColor: 'black',
                  },
                  cropAreaStyle: {
                    border: '2px solid white',
                  },
                }}
              />
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <label className="text-white">
                  Zoom:
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="ml-2 w-32"
                  />
                </label>
                <label className="text-white">
                  Rotation:
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="ml-2 w-32"
                  />
                </label>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCropper(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCrop}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewUrl && !showCropper && (
        <div className="mt-4">
          <p className="mb-2 text-white font-['Montserrat',Helvetica]">Selected image:</p>
          <div className="relative max-w-md border border-gray-300 rounded overflow-hidden">
            <Image 
              src={previewUrl} 
              alt="Preview" 
              width={500}
              height={500}
              className="object-contain"
            />
          </div>
          
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-white mb-1 font-['Montserrat',Helvetica]">
                Agent Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full p-2 border border-gray-300 rounded-md h-32 text-white font-['Montserrat',Helvetica] bg-transparent"
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="scenePrompt" className="block text-sm font-medium text-white mb-1 font-['Montserrat',Helvetica]">
                Scene Prompt
              </label>
              <textarea
                id="scenePrompt"
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="Describe the scene or environment..."
                className="w-full p-2 border border-gray-300 rounded-md h-32 text-white font-['Montserrat',Helvetica] bg-transparent"
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-white mb-1 font-['Montserrat',Helvetica]">
                Agent Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Enter a brief bio for your agent..."
                className="w-full p-2 border border-gray-300 rounded-md h-24 text-white font-['Montserrat',Helvetica] bg-transparent"
                rows={3}
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-1 font-['Montserrat',Helvetica]">
                Agent Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter agent name..."
                className="w-full p-2 border border-gray-300 rounded-md text-white font-['Montserrat',Helvetica] bg-transparent"
              />
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowVoiceSection(true)}
                disabled={!isTextFieldsValid}
                className={`py-2 px-4 rounded font-medium ${
                  isTextFieldsValid 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add Voice
              </button>
            </div>

            {showVoiceSection && (
              <>
                <div>
                  <label htmlFor="voice" className="block text-sm font-medium text-white mb-1 font-['Montserrat',Helvetica]">
                    Select Voice
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {voices.map((voice) => (
                      <div
                        key={voice.id}
                        className={`p-4 border rounded-md cursor-pointer ${
                          selectedVoice === voice.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-300'
                        }`}
                        onClick={() => setSelectedVoice(voice.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-['Montserrat',Helvetica]">Voice {voice.id.slice(0, 4)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPlaying === voice.id) {
                                handleStopAudio();
                              } else {
                                handlePlayAudio(voice.id);
                              }
                            }}
                            className="text-white font-['Montserrat',Helvetica] hover:text-blue-500"
                          >
                            {isPlaying === voice.id ? 'Stop' : 'Play'}
                          </button>
                        </div>
                        {isPlaying === voice.id && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="isPublic" className="text-white font-['Montserrat',Helvetica]">
                    Make this avatar public
                  </label>
                </div>

                <button
                  onClick={handleGenerateAvatar}
                  disabled={!isFormValid}
                  className={`w-full py-2 px-4 rounded-md ${
                    isFormValid
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } font-['Montserrat',Helvetica]`}
                >
                  Generate Avatar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
