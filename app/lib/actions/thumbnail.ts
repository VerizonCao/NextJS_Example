'use server';

import { 
  cacheAvatarThumbCount,
  getCachedAvatarThumbCount,
  hasCachedAvatarThumbCount,
  queueAvatarThumbnailJobs,
  getNextAvatarThumbnailJob,
  getAvatarThumbCount
} from '../data';

/**
 * Server action to cache an avatar's thumb count in Redis
 */
export async function cacheAvatarThumbCountAction(
  avatarId: string,
  count: number
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const success = await cacheAvatarThumbCount(avatarId, count);
    if (success) {
      return { 
        success: true, 
        message: 'Avatar thumb count cached successfully' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to cache avatar thumb count' 
      };
    }
  } catch (error) {
    console.error('Error caching avatar thumb count:', error);
    return { 
      success: false, 
      message: 'An error occurred while caching the avatar thumb count' 
    };
  }
}

/**
 * Server action to get a cached avatar thumb count from Redis
 */
export async function getCachedAvatarThumbCountAction(
  avatarId: string
): Promise<{ 
  success: boolean; 
  count: number; 
  message: string 
}> {
  try {
    const count = await getCachedAvatarThumbCount(avatarId);
    return { 
      success: true, 
      count, 
      message: 'Cached thumb count retrieved successfully' 
    };
  } catch (error) {
    console.error('Error getting cached avatar thumb count:', error);
    return { 
      success: false, 
      count: 0, 
      message: 'Failed to get cached thumb count' 
    };
  }
}

/**
 * Server action to check if an avatar's thumb count is cached in Redis
 */
export async function hasCachedAvatarThumbCountAction(
  avatarId: string
): Promise<{ 
  success: boolean; 
  exists: boolean; 
  message: string 
}> {
  try {
    const exists = await hasCachedAvatarThumbCount(avatarId);
    return { 
      success: true, 
      exists, 
      message: exists ? 'Cached thumb count exists' : 'No cached thumb count found' 
    };
  } catch (error) {
    console.error('Error checking cached avatar thumb count:', error);
    return { 
      success: false, 
      exists: false, 
      message: 'An error occurred while checking for cached thumb count' 
    };
  }
}

/**
 * Server action to queue avatar thumbnail generation jobs
 */
export async function queueAvatarThumbnailsAction(
  avatarIds: string[]
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    if (!Array.isArray(avatarIds) || avatarIds.length === 0) {
      return {
        success: false,
        message: 'No avatar IDs provided'
      };
    }

    // Validate that all IDs follow the expected format
    const validIds = avatarIds.filter(id => typeof id === 'string' && id.startsWith('a-'));
    if (validIds.length !== avatarIds.length) {
      return {
        success: false,
        message: 'Invalid avatar IDs provided'
      };
    }

    // Filter out duplicates at the action level
    const uniqueAvatarIds = [...new Set(validIds)];
    
    const success = await queueAvatarThumbnailJobs(uniqueAvatarIds);
    
    if (success) {
      return {
        success: true,
        message: `Successfully queued ${uniqueAvatarIds.length} avatar(s) for thumbnail generation`
      };
    } else {
      return {
        success: false,
        message: 'Failed to queue avatar thumbnails'
      };
    }
  } catch (error) {
    console.error('Error in queueAvatarThumbnailsAction:', error);
    return {
      success: false,
      message: 'An error occurred while queuing avatar thumbnails'
    };
  }
}

/**
 * Server action to get the next avatar thumbnail job from the queue
 */
export async function getNextAvatarThumbnailJobAction(): Promise<{ 
  success: boolean; 
  avatarId: string | null;
  message: string 
}> {
  try {
    const avatarId = await getNextAvatarThumbnailJob();
    
    if (avatarId) {
      return {
        success: true,
        avatarId,
        message: 'Successfully retrieved next avatar thumbnail job'
      };
    } else {
      return {
        success: true,
        avatarId: null,
        message: 'No pending avatar thumbnail jobs in queue'
      };
    }
  } catch (error) {
    console.error('Error in getNextAvatarThumbnailJobAction:', error);
    return {
      success: false,
      avatarId: null,
      message: 'An error occurred while retrieving the next avatar thumbnail job'
    };
  }
}

/**
 * Server action to get the number of thumbs for an avatar
 */
export async function getAvatarThumbCountAction(
  avatarId: string
): Promise<{ 
  success: boolean; 
  count: number; 
  message: string 
}> {
  try {
    // First check if we have a cached count
    const exists = await hasCachedAvatarThumbCount(avatarId);
    if (exists) {
      const cachedCount = await getCachedAvatarThumbCount(avatarId);
      return { 
        success: true, 
        count: cachedCount, 
        message: 'Thumb count retrieved from cache' 
      };
    }

    // If not in cache, get from database
    const count = await getAvatarThumbCount(avatarId);
    
    // Cache the count for future requests
    await cacheAvatarThumbCount(avatarId, count);
    
    return { 
      success: true, 
      count, 
      message: 'Thumb count retrieved successfully' 
    };
  } catch (error) {
    console.error('Error getting avatar thumb count:', error);
    return { 
      success: false, 
      count: 0, 
      message: 'Failed to get thumb count' 
    };
  }
} 