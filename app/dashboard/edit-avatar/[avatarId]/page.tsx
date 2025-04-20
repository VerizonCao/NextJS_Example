import { loadAvatar } from '@/app/lib/data';
import { getPresignedUrl } from '@/app/lib/actions';

export default async function EditAvatarPage({
  params,
}: {
  params: { avatarId: string };
}) {
  const avatar = await loadAvatar(params.avatarId);

  if (!avatar) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600">Wrong Avatar ID</h1>
        <p>The avatar with ID {params.avatarId} does not exist.</p>
      </div>
    );
  }

  let imageUrl = null;
  if (avatar.image_uri) {
    try {
      const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
      imageUrl = presignedUrl;
    } catch (error) {
      console.error('Error getting presigned URL:', error);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Avatar</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Avatar Details</h2>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-gray-600">Avatar ID:</p>
              <p className="font-medium">{avatar.avatar_id}</p>
            </div>
            <div>
              <p className="text-gray-600">Name:</p>
              <p className="font-medium">{avatar.avatar_name}</p>
            </div>
            <div>
              <p className="text-gray-600">Owner ID:</p>
              <p className="font-medium">{avatar.owner_id}</p>
            </div>
            <div>
              <p className="text-gray-600">Created:</p>
              <p className="font-medium">{avatar.create_time.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Updated:</p>
              <p className="font-medium">{avatar.update_time.toLocaleString()}</p>
            </div>
            {avatar.voice_id && (
              <div>
                <p className="text-gray-600">Voice ID:</p>
                <p className="font-medium">{avatar.voice_id}</p>
              </div>
            )}
          </div>
        </div>
        
        {avatar.prompt && (
          <div>
            <h2 className="text-lg font-semibold">Prompt</h2>
            <p className="mt-2">{avatar.prompt}</p>
          </div>
        )}

        {avatar.scene_prompt && (
          <div>
            <h2 className="text-lg font-semibold">Scene Prompt</h2>
            <p className="mt-2">{avatar.scene_prompt}</p>
          </div>
        )}

        {avatar.agent_bio && (
          <div>
            <h2 className="text-lg font-semibold">Agent Bio</h2>
            <p className="mt-2">{avatar.agent_bio}</p>
          </div>
        )}
        
        {imageUrl && (
          <div>
            <h2 className="text-lg font-semibold">Image</h2>
            <img 
              src={imageUrl} 
              alt={avatar.avatar_name}
              className="mt-2 max-w-xs rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
