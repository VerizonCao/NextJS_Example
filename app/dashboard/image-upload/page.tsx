'use client';

import { useState } from 'react';
import { saveAvatarData, generatePresignedUrl } from '@/app/lib/actions';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


// Create nanoid function


export default function ImageUploadPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const { data: session, status } = useSession();
  const router = useRouter();

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
    if (selectedImage && prompt && name) {
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
              owner_email: owner_email,
              image_uri: key
            });
            
            if (result.success) {
              console.log('Avatar saved successfully with name:', name);
              // You could add a success message or redirect here
            } else {
              console.error('Failed to save avatar to database:', result.message);
            }
          }

          // redirect to the dashboard
          router.push('/dashboard');
        } 
        
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
  };

  const isFormValid = selectedImage && prompt.trim() !== '' && name.trim() !== '';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Image Upload</h1>
      
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
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="max-w-md border border-gray-300 rounded"
          />
          
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                Prompt
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
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
                onClick={handleGenerateAvatar}
                disabled={!isFormValid}
                className={`py-2 px-4 rounded font-medium ${
                  isFormValid 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Generate Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
