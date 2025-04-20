'use client';

import { getPresignedUrl, loadAvatar, updateAvatarData } from '@/app/lib/actions';
import { useState, useEffect } from 'react';
import { use } from 'react';

type PageParams = {
  avatarId: string;
};

export default function EditAvatarPage({
  params,
}: {
  params: Promise<PageParams>;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { avatarId } = use(params);
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    avatar_name: '',
    agent_bio: '',
    prompt: '',
    scene_prompt: ''
  });

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
            scene_prompt: response.avatar.scene_prompt || ''
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
        <h1 className="text-2xl font-bold text-red-600">Wrong Avatar ID</h1>
        <p>The avatar with ID {avatarId} does not exist.</p>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      const response = await updateAvatarData(avatarId, formData);
      if (response.success) {
        setIsEditing(false);
        // Reload the avatar data to show updated values
        const updatedResponse = await loadAvatar(avatarId);
        if (updatedResponse.success && updatedResponse.avatar) {
          setAvatar(updatedResponse.avatar);
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

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Avatar</h1>
      <div className="flex gap-6 items-start">
        {imageUrl && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Image</h2>
            <img 
              src={imageUrl} 
              alt={avatar.avatar_name}
              className="max-w-xs max-h-[1000px] rounded-lg object-cover"
            />
          </div>
        )}
        
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Avatar Details</h2>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button 
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-gray-600">Name:</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.avatar_name}
                  onChange={(e) => handleInputChange('avatar_name', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              ) : (
                <p className="font-medium">{avatar.avatar_name}</p>
              )}
            </div>
            <div>
              <p className="text-gray-600">Agent Bio:</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.agent_bio}
                  onChange={(e) => handleInputChange('agent_bio', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              ) : (
                <p className="font-medium">{avatar.agent_bio || 'No bio'}</p>
              )}
            </div>
            <div>
              <p className="text-gray-600">Prompt:</p>
              {isEditing ? (
                <textarea
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              ) : (
                <p className="font-medium">{avatar.prompt || 'No prompt'}</p>
              )}
            </div>
            <div>
              <p className="text-gray-600">Scene Prompt:</p>
              {isEditing ? (
                <textarea
                  value={formData.scene_prompt}
                  onChange={(e) => handleInputChange('scene_prompt', e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              ) : (
                <p className="font-medium">{avatar.scene_prompt || 'No scene prompt'}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Voice</h2>
              <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                Edit
              </button>
            </div>
            {avatar.voice_id && (
              <div className="mt-2">
                <p className="text-gray-600">Voice ID:</p>
                <p className="font-medium">{avatar.voice_id}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
