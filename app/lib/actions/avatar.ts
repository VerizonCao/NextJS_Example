'use server';

import { customAlphabet } from 'nanoid';
import { 
  saveAvatar, 
  getUserByIdEmail, 
  loadAvatarsByOwner, 
  loadAvatar as loadAvatarFromDb, 
  updateAvatarData as updateAvatarDataFromDb,
  loadPublicAvatars as loadPublicAvatarsFromDb,
  deleteAvatar as deleteAvatarFromDb,
  Avatar,
  isUserAvatarOwner,
  addAvatarThumb,
  removeAvatarThumb,
  getAvatarThumbCount,
  hasUserThumbedAvatar,
  cacheAvatarThumbCount,
  getCachedAvatarThumbCount,
  hasCachedAvatarThumbCount,
  cacheAvatarThumbRequest,
  hasCachedRequestAvatarThumbCount,
  queueAvatarThumbnailJobs,
  loadPaginatedPublicAvatarsByCreationTime,
  loadPaginatedPublicAvatarsByScore,
  cacheAvatarResults,
  getCachedAvatarResults,
  incrementAvatarServeCount,
  getAndRemoveAvatarServeCount,
  addAvatarServeTime,
  getAllAvatarServeCountKeys,
  getAvatarServeTime,
  sendImageModerationTask,
  checkAvatarModerationPass
} from '../data';
import { avatarRequestCounter, avatarServeTimeCounter } from '../metrics';
import { getAvatarThumbCountAction } from '@/app/lib/actions/thumbnail';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 11);

/**
 * Server action to save avatar data to the database
 */
export async function saveAvatarData(avatarData: {
  avatar_name: string;
  prompt?: string;
  scene_prompt?: string;
  agent_bio?: string;
  owner_email: string;
  image_uri?: string;
  voice_id?: string;
  is_public?: boolean;
}): Promise<{ success: boolean; message: string; avatar_id?: string }> {
  try {
    const owner_id = await getUserByIdEmail(avatarData.owner_email);
    
    if (!owner_id) {
      return { success: false, message: 'User not found' };
    }

    const avatarId = 'a-' + nanoid();

    const success = await saveAvatar({
      ...avatarData,
      avatar_id: avatarId,
      owner_id: owner_id
    });
    if (success) {
      return { success: true, message: 'Avatar saved successfully', avatar_id: avatarId };
    } else {
      return { success: false, message: 'Failed to save avatar' };
    }
  } catch (error) {
    console.error('Error in saveAvatarData action:', error);
    return { success: false, message: 'An error occurred while saving the avatar' };
  }
}

/**
 * Server action to load all avatars for a user by their email
 */
export async function loadUserAvatars(userEmail: string): Promise<{ 
  success: boolean; 
  avatars: any[] | null; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    
    if (!userId) {
      return { success: false, avatars: null, message: 'User not found' };
    }

    const avatars = await loadAvatarsByOwner(userId);
    const limitedAvatars = avatars.slice(0, 20);
    
    return { 
      success: true, 
      avatars: limitedAvatars, 
      message: 'Avatars loaded successfully' 
    };
  } catch (error) {
    console.error('Error in loadUserAvatars action:', error);
    return { 
      success: false, 
      avatars: null, 
      message: 'An error occurred while loading Characters' 
    };
  }
}

/**
 * Server action to load all public avatars
 */
export async function loadPublicAvatars(): Promise<{ 
  success: boolean; 
  avatars: any[] | null; 
  message: string 
}> {
  try {
    const avatars = await loadPublicAvatarsFromDb();

    // Fire-and-forget async process
    Promise.resolve().then(async () => {
      await Promise.all(
        avatars.map(async (avatar) => {
          const avatarId = avatar.avatar_id;
          const exists = await hasCachedRequestAvatarThumbCount(avatarId);
          if (!exists) {
            try {
              await cacheAvatarThumbRequest(avatarId);
              await queueAvatarThumbnailJobs([avatarId]);
            } catch (error) {
              console.error(`Error updating thumb count for avatar ${avatarId}:`, error);
            }
          }
        })
      );
    });
    
    return { 
      success: true, 
      avatars, 
      message: 'Public avatars loaded successfully' 
    };
  } catch (error) {
    console.error('Error in loadPublicAvatars action:', error);
    return { 
      success: false, 
      avatars: null, 
      message: 'An error occurred while loading public avatars' 
    };
  }
}

/**
 * Server action to load public avatars with pagination
 */
export async function loadPaginatedPublicAvatarsAction(
  offset: number = 0,
  limit: number = 20,
  searchTerm: string = '',
  sortBy: 'score' | 'time' = 'time'
): Promise<{ 
  success: boolean; 
  avatars: any[] | null; 
  message: string;
  hasMore: boolean;
}> {
  try {
    // Choose the appropriate function based on sort parameter
    const avatars = sortBy === 'score' 
      ? await loadPaginatedPublicAvatarsByScore(offset, limit, searchTerm)
      : await loadPaginatedPublicAvatarsByCreationTime(offset, limit, searchTerm);
    
    const hasMore = avatars.length === limit;
    
    // Fire-and-forget async process for thumb count updates
    Promise.resolve().then(async () => {
      await Promise.all(
        avatars.map(async (avatar) => {
          const avatarId = avatar.avatar_id;
          const exists = await hasCachedRequestAvatarThumbCount(avatarId);
          if (!exists) {
            try {
              await cacheAvatarThumbRequest(avatarId);
              await queueAvatarThumbnailJobs([avatarId]);
            } catch (error) {
              console.error(`Error updating thumb count for avatar ${avatarId}:`, error);
            }
          }
        })
      );
    });
    
    return { 
      success: true, 
      avatars, 
      message: `Paginated public avatars loaded successfully (sorted by ${sortBy})`,
      hasMore
    };
  } catch (error) {
    console.error('Error in loadPaginatedPublicAvatarsAction:', error);
    return { 
      success: false, 
      avatars: null, 
      message: 'An error occurred while loading paginated public avatars',
      hasMore: false
    };
  }
}

/**
 * Server action to load a single avatar by its ID
 */
export async function loadAvatar(avatarId: string): Promise<{ 
  success: boolean; 
  avatar: Avatar | null; 
  message: string 
}> {
  try {
    const avatar = await loadAvatarFromDb(avatarId);
    
    if (!avatar) {
      return { 
        success: false, 
        avatar: null, 
        message: 'Avatar not found' 
      };
    }
    
    return { 
      success: true, 
      avatar, 
      message: 'Avatar loaded successfully' 
    };
  } catch (error) {
    console.error('Error in loadAvatar action:', error);
    return { 
      success: false, 
      avatar: null, 
      message: 'An error occurred while loading the avatar' 
    };
  }
}

/**
 * Server action to update an existing avatar's data
 */
export async function updateAvatarData(
  avatarId: string,
  updateData: Partial<Omit<Avatar, 'avatar_id' | 'create_time' | 'update_time'>>
): Promise<{ success: boolean; message: string }> {
  try {
    // check if the avatar is trying to make public, and if it pass the image moderation
    if (updateData.is_public === true) {
      const moderationStatus = await checkAvatarModerationPass(avatarId);
      if (!moderationStatus.isModerated) {
        return {
          success: false,
          message: moderationStatus.message
        };
      }
    }

    const success = await updateAvatarDataFromDb(avatarId, updateData);
    return {
      success,
      message: success ? 'Avatar updated successfully' : 'Failed to update avatar'
    };
  } catch (error) {
    console.error('Error updating avatar:', error);
    return {
      success: false,
      message: 'Failed to update avatar'
    };
  }
}

/**
 * Server action to increment the avatar request counter for a specific avatar
 */
export async function incrementAvatarRequestCounter(avatarId: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    avatarRequestCounter.add(1, { avatar_id: avatarId });

    return { 
      success: true, 
      message: 'Avatar request counter incremented' 
    };
  } catch (error) {
    console.error('Error incrementing avatar request counter:', error);
    return { 
      success: false, 
      message: 'Failed to increment avatar request counter' 
    };
  }
}

/**
 * Server action to report avatar serve time
 */
export async function reportAvatarServeTime(
  avatarId: string,
  userEmail: string,
  serveTime: number
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    avatarServeTimeCounter.add(serveTime, { 
      avatar_id: avatarId,
      user_id: userId
    });

    // Also increment the Redis serve count
    incrementAvatarServeCountAction(avatarId, serveTime);

    return { 
      success: true, 
      message: 'Avatar serve time recorded' 
    };
  } catch (error) {
    console.error('Error recording avatar serve time:', error);
    return { 
      success: false, 
      message: 'Failed to record avatar serve time' 
    };
  }
}

/**
 * Server action to delete an avatar by its ID
 */
export async function deleteAvatar(avatarId: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const success = await deleteAvatarFromDb(avatarId);
    
    if (success) {
      return { success: true, message: 'Avatar deleted successfully' };
    } else {
      return { success: false, message: 'Avatar not found or could not be deleted' };
    }
  } catch (error) {
    console.error('Error in deleteAvatar action:', error);
    return { success: false, message: 'An error occurred while deleting the avatar' };
  }
}

/**
 * Server action to load a single avatar by its ID with permission check
 */
export async function loadAuthorizedAvatar(avatarId: string, email: string): Promise<{ 
  success: boolean; 
  avatar: Avatar | null; 
  message: string;
  authorized: boolean;
}> {
  try {
    const userId = await getUserByIdEmail(email);
    if (!userId) {
      return {
        success: false,
        avatar: null,
        message: 'User not found',
        authorized: false
      };
    }

    const avatar = await loadAvatarFromDb(avatarId);
    if (!avatar) {
      return { 
        success: false, 
        avatar: null, 
        message: 'Avatar not found',
        authorized: false
      };
    }

    const isAuthorized = avatar.owner_id === userId;
    if (!isAuthorized) {
      return {
        success: false,
        avatar: null,
        message: 'You do not have permission to view this avatar',
        authorized: false
      };
    }
    
    return { 
      success: true, 
      avatar, 
      message: 'Avatar loaded successfully',
      authorized: true
    };
  } catch (error) {
    console.error('Error in loadAuthorizedAvatar action:', error);
    return { 
      success: false, 
      avatar: null, 
      message: 'An error occurred while loading the avatar',
      authorized: false
    };
  }
}

/**
 * Server action to check if a user is the owner of an avatar
 */
export async function isUserAvatarOwnerAction(
  userEmail: string,
  avatarId: string
): Promise<{ 
  success: boolean; 
  isOwner: boolean; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        isOwner: false,
        message: 'User not found'
      };
    }

    const isOwner = await isUserAvatarOwner(userId, avatarId);
    return {
      success: true,
      isOwner,
      message: isOwner ? 'User is the owner of the avatar' : 'User is not the owner of the avatar'
    };
  } catch (error) {
    console.error('Error in isUserAvatarOwnerAction:', error);
    return {
      success: false,
      isOwner: false,
      message: 'An error occurred while checking if the user is the owner of the avatar'
    };
  }
}

/**
 * Server action to update an avatar's thumb count
 */
export async function updateAvatarThumbCountAction(
  avatarId: string
): Promise<{ success: boolean; thumbCount?: number; message: string }> {
  try {
    // Get the current thumb count using the getAvatarThumbCountAction
    const thumbCountResult = await getAvatarThumbCountAction(avatarId);
    
    if (!thumbCountResult.success) {
      return { success: false, message: thumbCountResult.message };
    }
    
    const thumbCount = thumbCountResult.count || 0;
    
    // Update the avatar with the thumb count
    const updateResult = await updateAvatarData(avatarId, { thumb_count: thumbCount });
    
    if (updateResult.success) {
      return { 
        success: true, 
        thumbCount,
        message: 'Thumb count updated successfully' 
      };
    } else {
      return { success: false, message: updateResult.message };
    }
  } catch (error) {
    console.error('Error in updateAvatarThumbCountAction:', error);
    return { success: false, message: 'An error occurred while updating thumb count' };
  }
}

/**
 * Server action to check if a user has thumbed an avatar
 */
export async function hasUserThumbedAvatarAction(
  userEmail: string,
  avatarId: string
): Promise<{ 
  success: boolean; 
  hasThumb: boolean; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        hasThumb: false,
        message: 'User not found'
      };
    }

    const hasThumb = await hasUserThumbedAvatar(userId, avatarId);
    return { 
      success: true, 
      hasThumb, 
      message: 'Thumb status retrieved successfully' 
    };
  } catch (error) {
    console.error('Error checking if user has thumbed avatar:', error);
    return { 
      success: false, 
      hasThumb: false, 
      message: 'An error occurred while checking thumb status' 
    };
  }
}

/**
 * Server action to add a thumb to an avatar
 */
export async function addAvatarThumbAction(
  userEmail: string,
  avatarId: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const success = await addAvatarThumb(userId, avatarId);
    if (success) {
      return { 
        success: true, 
        message: 'Thumb added successfully' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to add thumb' 
      };
    }
  } catch (error) {
    console.error('Error adding avatar thumb:', error);
    return { 
      success: false, 
      message: 'An error occurred while adding thumb' 
    };
  }
}

/**
 * Server action to remove a thumb from an avatar
 */
export async function removeAvatarThumbAction(
  userEmail: string,
  avatarId: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const success = await removeAvatarThumb(userId, avatarId);
    if (success) {
      return { 
        success: true, 
        message: 'Thumb removed successfully' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to remove thumb' 
      };
    }
  } catch (error) {
    console.error('Error removing avatar thumb:', error);
    return { 
      success: false, 
      message: 'An error occurred while removing thumb' 
    };
  }
}

/**
 * Server action to increment avatar serve count
 */
export async function incrementAvatarServeCountAction(
  avatarId: string,
  value: number
): Promise<{ 
  success: boolean; 
  newCount?: number;
  message: string 
}> {
  try {
    const newCount = await incrementAvatarServeCount(avatarId, value);
    
    return { 
      success: true, 
      newCount,
      message: 'Avatar serve count incremented successfully' 
    };
  } catch (error) {
    console.error('Error in incrementAvatarServeCountAction:', error);
    return { 
      success: false, 
      message: 'An error occurred while incrementing avatar serve count' 
    };
  }
}

/**
 * Server action to flush avatar serve time from Redis to database
 */
export async function flushAvatarServeTimeAction(
  avatarId: string
): Promise<{ 
  success: boolean; 
  serveTime?: number;
  message: string 
}> {
  try {
    // Get and remove the serve time from Redis
    const serveTime = await getAndRemoveAvatarServeCount(avatarId);
    
    if (serveTime === 0) {
      return {
        success: true,
        serveTime: 0,
        message: 'No serve time to flush'
      };
    }
    
    // Add the serve time to the database
    const success = await addAvatarServeTime(avatarId, serveTime);
    
    if (success) {
      return {
        success: true,
        serveTime,
        message: 'Avatar serve time flushed successfully'
      };
    } else {
      return {
        success: false,
        message: 'Failed to update avatar serve time in database'
      };
    }
  } catch (error) {
    console.error('Error in flushAvatarServeTimeAction:', error);
    return {
      success: false,
      message: 'An error occurred while flushing avatar serve time'
    };
  }
}

/**
 * Server action to flush all avatar serve times from Redis to database
 */
export async function flushAllAvatarServeTimesAction(): Promise<{ 
  success: boolean; 
  processedCount: number;
  totalServeTime: number;
  errors: string[];
  message: string 
}> {
  try {
    // Get all avatar serve count keys
    const keys = await getAllAvatarServeCountKeys();
    
    if (keys.length === 0) {
      return {
        success: true,
        processedCount: 0,
        totalServeTime: 0,
        errors: [],
        message: 'No avatar serve times to flush'
      };
    }
    
    let processedCount = 0;
    let totalServeTime = 0;
    const errors: string[] = [];
    
    // Process each key one by one
    for (const key of keys) {
      try {
        // Extract avatar ID from key (assuming format: avatar_serve_{avatarId})
        const avatarId = key.replace('avatar_serve_', '');
        
        // Flush the serve time for this avatar
        const result = await flushAvatarServeTimeAction(avatarId);
        
        if (result.success) {
          processedCount++;
          totalServeTime += result.serveTime || 0;
        } else {
          errors.push(`Failed to flush ${avatarId}: ${result.message}`);
        }
      } catch (error) {
        const avatarId = key.replace('avatar_serve_', '');
        errors.push(`Error processing ${avatarId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      success: true,
      processedCount,
      totalServeTime,
      errors,
      message: `Processed ${processedCount} out of ${keys.length} avatar serve times. Total serve time: ${totalServeTime}ms`
    };
  } catch (error) {
    console.error('Error in flushAllAvatarServeTimesAction:', error);
    return {
      success: false,
      processedCount: 0,
      totalServeTime: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'An error occurred while flushing all avatar serve times'
    };
  }
}

/**
 * Server action to get an avatar's serve time from the database
 */
export async function getAvatarServeTimeAction(
  avatarId: string
): Promise<{ 
  success: boolean; 
  serveTime?: number;
  message: string 
}> {
  try {
    const serveTime = await getAvatarServeTime(avatarId);
    
    return { 
      success: true, 
      serveTime,
      message: 'Avatar serve time retrieved successfully' 
    };
  } catch (error) {
    console.error('Error in getAvatarServeTimeAction:', error);
    return { 
      success: false, 
      message: 'An error occurred while retrieving avatar serve time' 
    };
  }
}

/**
 * Server action to send an image for moderation
 */
export async function sendImageForModeration(
  imagePath: string,
  avatarId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const success = await sendImageModerationTask(imagePath, avatarId);
    if (success) {
      return { success: true, message: 'Image sent for moderation successfully' };
    } else {
      return { success: false, message: 'Failed to send image for moderation' };
    }
  } catch (error) {
    console.error('Error sending image for moderation:', error);
    return { success: false, message: 'Failed to send image for moderation' };
  }
}

/**
 * Server action to check if an avatar has passed moderation
 */
export async function checkAvatarModeration(
  avatarId: string
): Promise<{ success: boolean; isModerated: boolean; message: string }> {
  try {
    const result = await checkAvatarModerationPass(avatarId);
    return {
      success: true,
      isModerated: result.isModerated,
      message: result.message
    };
  } catch (error) {
    console.error('Error checking avatar moderation:', error);
    return {
      success: false,
      isModerated: false,
      message: 'Failed to check avatar moderation status'
    };
  }
}