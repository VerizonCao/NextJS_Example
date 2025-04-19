'use client';

import { useState, useEffect } from 'react';
import { saveAvatarData, generatePresignedUrl } from '@/app/lib/actions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface VoiceSample {
  id: string;
  audioUrl: string;
}

export default function ImageUploadPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create a preview URL for the selected image
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
              voice_id: selectedVoice
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
      <h1 className="text-2xl font-bold mb-4">Image Upload</h1>

      {/* <audio controls src="/audio_samples/6f84f4b8-58a2-430c-8c79-688dad597532.wav" /> */}
      
      <div className="mb-4">
        <label 
          htmlFor="image-upload" 
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded cursor-pointer inline-block"
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

      {previewUrl && (
        <div className="mt-4">
          <p className="mb-2">Selected image:</p>
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
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                Agent Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full p-2 border border-gray-300 rounded-md h-32"
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="scenePrompt" className="block text-sm font-medium text-gray-700 mb-1">
                Scene Prompt
              </label>
              <textarea
                id="scenePrompt"
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="Describe the scene or environment..."
                className="w-full p-2 border border-gray-300 rounded-md h-32"
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Agent Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Enter a brief bio for your agent..."
                className="w-full p-2 border border-gray-300 rounded-md h-24"
                rows={3}
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name"
                className="w-full p-2 border border-gray-300 rounded-md"
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
                  <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Voice
                  </label>
                  <div className="space-y-2">
                    {voices.map((voice) => (
                      <div
                        key={voice.id}
                        className={`p-3 border rounded-md cursor-pointer ${
                          selectedVoice === voice.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                        onClick={() => setSelectedVoice(voice.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPlaying === voice.id) {
                                  handleStopAudio();
                                } else {
                                  handlePlayAudio(voice.id);
                                }
                              }}
                              className="p-1 rounded-full hover:bg-gray-100"
                            >
                              {isPlaying === voice.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <span className="text-sm">Voice Sample {voice.id.slice(0, 4)}...</span>
                          </div>
                          {selectedVoice === voice.id && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {isPlaying === voice.id && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full" 
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={!isFormValid}
                    className={`py-2 px-4 rounded font-medium ${
                      isFormValid 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Generate Agent
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
