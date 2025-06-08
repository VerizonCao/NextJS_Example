'use server';

import { 
  getUserByIdEmail,
  getUserServeCount,
  incrementUserServeCount,
  updateUserPreferredName,
  getUserPreferredName,
  findUserPreviousRoom,
  storeUserRoom
} from '../data';
import { auth } from '@/auth';

/**
 * Server action to get the serve count for a user
 */
export async function getUserServeCountAction(userEmail: string): Promise<{ 
  success: boolean; 
  count: number; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        count: 0,
        message: 'User not found'
      };
    }

    // if it's our user, just return success with count 0
    if (userId == 'u-vSOjV52Fssi' || userId === 'u-A6ymSzslVmL' || userId === 'u-oK5KkVLYRTH' || userId === 'u-mwpqtYu1f2B') {
      return {
        success: true,
        count: 0,
        message: 'Bypass user - no count limit'
      };
    }

    const count = await getUserServeCount(userId);
    return { 
      success: true, 
      count, 
      message: 'Serve count retrieved successfully' 
    };
  } catch (error) {
    console.error('Error getting user serve count:', error);
    return { 
      success: false, 
      count: 0, 
      message: 'Failed to get serve count' 
    };
  }
}

/**
 * Server action to increment the serve count for a user
 */
export async function incrementUserServeCountAction(userEmail: string): Promise<{ 
  success: boolean; 
  newCount: number; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        newCount: 0,
        message: 'User not found'
      };
    }

    const newCount = await incrementUserServeCount(userId);
    return { 
      success: true, 
      newCount, 
      message: 'Serve count incremented successfully' 
    };
  } catch (error) {
    console.error('Error incrementing user serve count:', error);
    return { 
      success: false, 
      newCount: 0, 
      message: 'Failed to increment serve count' 
    };
  }
}

/**
 * Server action to update a user's preferred name
 */
export async function updateUserPreferredNameAction(
  userEmail: string,
  preferredName: string
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

    const success = await updateUserPreferredName(userId, preferredName);
    if (success) {
      return { 
        success: true, 
        message: 'Preferred name updated successfully' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to update preferred name' 
      };
    }
  } catch (error) {
    console.error('Error updating preferred name:', error);
    return { 
      success: false, 
      message: 'An error occurred while updating preferred name' 
    };
  }
}

/**
 * Server action to get a user's preferred name
 */
export async function getUserPreferredNameAction(userEmail: string): Promise<{ 
  success: boolean; 
  preferredName: string | null; 
  message: string 
}> {
  try {
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        preferredName: null,
        message: 'User not found'
      };
    }

    const preferredName = await getUserPreferredName(userId);
    return { 
      success: true, 
      preferredName, 
      message: preferredName ? 'Preferred name retrieved successfully' : 'No preferred name set' 
    };
  } catch (error) {
    console.error('Error getting preferred name:', error);
    return { 
      success: false, 
      preferredName: null, 
      message: 'An error occurred while getting preferred name' 
    };
  }
}

/**
 * Server action to store a room ID for a user
 */
export async function storeUserRoomAction(
  userEmail: string,
  roomId: string
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

    const success = await storeUserRoom(userId, roomId);
    if (success) {
      return {
        success: true,
        message: 'Room stored successfully'
      };
    } else {
      return {
        success: false,
        message: 'Failed to store room'
      };
    }
  } catch (error) {
    console.error('Error in storeUserRoomAction:', error);
    return {
      success: false,
      message: 'An error occurred while storing room'
    };
  }
}

export async function loadChatHistory(avatarId: string) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return { error: 'User not authenticated' };
    }

    // Get user_id from email
    const userId = await getUserByIdEmail(session.user.email);
    if (!userId) {
      return { error: 'User not found in database' };
    }

    // Import chat functions from the new chat module
    const { getLatestChatMessages, hasChatHistory } = await import('@/app/lib/data/chat');
    
    // Check if user has chat history with this avatar
    const hasHistory = await hasChatHistory(userId, avatarId);
    if (!hasHistory) {
      return { messages: [], hasHistory: false };
    }

    // Get the latest chat messages
    const messages = await getLatestChatMessages(userId, avatarId);
    
    return { 
      messages, 
      hasHistory: true,
      userId 
    };
  } catch (error) {
    console.error('Error loading chat history:', error);
    return { error: 'Failed to load chat history' };
  }
} 