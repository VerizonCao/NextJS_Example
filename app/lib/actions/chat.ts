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

/**
 * Server action to trigger a manual refresh of recent chat avatars
 * This can be called from client components to force a refresh
 */
export async function triggerChatHistoryRefreshAction(
  userEmail: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    console.log(`Triggering chat history refresh for user: ${userEmail}`);
    
    // Simply call the main function to refresh data
    const result = await getRecentChatAvatarsAction(userEmail, 1000);
    
    return { 
      success: result.success, 
      message: result.success ? 'Chat history refreshed successfully' : result.message
    };
  } catch (error) {
    console.error('Error in triggerChatHistoryRefreshAction:', error);
    return { 
      success: false, 
      message: 'An error occurred while refreshing chat history' 
    };
  }
} 