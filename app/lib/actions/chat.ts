'use server';

import { getRecentChatAvatars, RecentChatAvatar } from '../data/chat';
import { getUserByIdEmail } from '../data';
import { getPresignedUrl } from './s3';

export type RecentChatAvatarWithUrl = RecentChatAvatar & {
  presignedUrl?: string;
};

/**
 * Server action to get recent chat avatars with their profile images
 */
export async function getRecentChatAvatarsAction(
  userEmail: string, 
  limit: number = 10
): Promise<{ 
  success: boolean; 
  avatars: RecentChatAvatarWithUrl[] | null; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        avatars: null,
        message: 'User not found'
      };
    }

    const avatars = await getRecentChatAvatars(userId, limit);
    
    // Get presigned URLs for avatar images
    const avatarsWithUrls = await Promise.all(
      avatars.map(async (avatar) => {
        if (avatar.image_uri) {
          try {
            const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
            return {
              ...avatar,
              presignedUrl
            };
          } catch (error) {
            console.error(`Failed to get presigned URL for avatar ${avatar.avatar_id}:`, error);
            return avatar;
          }
        }
        return avatar;
      })
    );
    
    return { 
      success: true, 
      avatars: avatarsWithUrls, 
      message: 'Recent chat avatars loaded successfully' 
    };
  } catch (error) {
    console.error('Error in getRecentChatAvatarsAction:', error);
    return { 
      success: false, 
      avatars: null, 
      message: 'An error occurred while loading recent chat avatars' 
    };
  }
} 