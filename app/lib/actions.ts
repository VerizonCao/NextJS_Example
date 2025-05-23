'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { getPresignedGetUrl, getPresignedPutUrl } from './s3';
import { avatarRequestCounter, attributes, avatarServeTimeCounter} from './metrics';
import { 
  saveAvatar, 
  getUserByIdEmail, 
  loadAvatarsByOwner, 
  getPresignedUrlRedis, 
  setPresignedUrlRedis, 
  loadAvatar as loadAvatarFromDb, 
  updateAvatarData as updateAvatarDataFromDb,
  loadPublicAvatars as loadPublicAvatarsFromDb,
  deleteAvatar as deleteAvatarFromDb,
  getUserServeCount,
  incrementUserServeCount,
  Avatar,
  updateUserPreferredName,
  getUserPreferredName,
  isUserAvatarOwner,
  findUserPreviousRoom,
  storeUserRoom,
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
  getNextAvatarThumbnailJob,
  loadPaginatedPublicAvatars
} from './data';

import { RoomServiceClient } from 'livekit-server-sdk';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 11)

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
  });
   
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    // const rawFormData = {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });
      // Test it out:
    //   console.log(rawFormData);
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    // save into db
    try{
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch(error){
        console.log(error);
    }

   

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}


// function to start runpod agent for now. 
export async function startStreamingSession({
  instruction,
  seconds,
  room = "my-room",
  avatarSource = "",
  avatar_id = null,
  llmUserNickname = null,
  llmUserBio = null,
  llmAssistantNickname = null,
  llmAssistantBio = null,
  llmAssistantAdditionalCharacteristics = null,
  llmConversationContext = null,
  ttsVoiceIdCartesia = null,
  userEmail = null,
}: {
  instruction: string;
  seconds: number;
  room?: string;
  avatarSource?: string;
  avatar_id?: string | null;
  llmUserNickname?: string | null;
  llmUserBio?: string | null;
  llmAssistantNickname?: string | null;
  llmAssistantBio?: string | null;
  llmAssistantAdditionalCharacteristics?: string | null;
  llmConversationContext?: string | null;
  ttsVoiceIdCartesia?: string | null;
  userEmail?: string | null;
}) {
  try {
    // Check user's serve count if email is provided
    if (userEmail) {
      const { success, count } = await getUserServeCountAction(userEmail);
      if (success && count >= 10) {
        return { 
          success: false, 
          message: 'Maximum serve count reached',
          error: 'LIMIT_REACHED',
          currentCount: count,
          maxCount: 10
        };
      }

      // Check if user has a preferred name
      const { success: nameSuccess, preferredName } = await getUserPreferredNameAction(userEmail);
      if (nameSuccess && preferredName) {
        llmUserNickname = preferredName;
      }
    }

    const input: Record<string, any> = {
      instruction,
      seconds,
      room,
      avatarSource,
    };

    // Only add fields that are not null
    if (avatar_id !== null) input.avatar_id = avatar_id;
    if (llmUserNickname !== null) input.llm_user_nickname = llmUserNickname;
    if (llmUserBio !== null) input.llm_user_bio = llmUserBio;
    if (llmAssistantNickname !== null) input.llm_assistant_nickname = llmAssistantNickname;
    if (llmAssistantBio !== null) input.llm_assistant_bio = llmAssistantBio;
    if (llmAssistantAdditionalCharacteristics !== null) input.llm_assistant_additional_characteristics = llmAssistantAdditionalCharacteristics;
    if (llmConversationContext !== null) input.llm_conversation_context = llmConversationContext;
    if (ttsVoiceIdCartesia !== null) input.tts_voice_id_cartesia = ttsVoiceIdCartesia;

    const response = await fetch('https://api.runpod.ai/v2/ig6zqibcn2nc8b/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.RUNPOD_API_KEY || '',
      },
      body: JSON.stringify({ input }),
    });

    const data = await response.json();
    console.log('Streaming session completed:', data);

    // Increment user's serve count if email is provided
    if (userEmail) {
      const { newCount } = await incrementUserServeCountAction(userEmail);
      return {
        ...data,
        success: true,
        currentCount: newCount,
        maxCount: 6
      };
    }

    return data;
  } catch (error) {
    console.error('Error in streaming session:', error);
    throw error;
  }
}

export async function getPresignedUrl(key: string) {
  try {
    // First check if we have the presigned URL in Redis
    const cachedUrl = await getPresignedUrlRedis(key);
    if (cachedUrl) {
      return { presignedUrl: cachedUrl };
    }

    // If not in Redis, generate a new one
    const presignedUrl = await getPresignedGetUrl(key);
    
    // Store the new presigned URL in Redis with a 1-hour TTL
    await setPresignedUrlRedis(key, presignedUrl);
    
    return { presignedUrl };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

export async function generatePresignedUrl(key: string) {
  try {
    const presignedUrl = await getPresignedPutUrl(key);
    return { presignedUrl };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

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
}): Promise<{ success: boolean; message: string }> {
  try {
    const owner_id = await getUserByIdEmail(avatarData.owner_email);
    
    if (!owner_id) {
      return { success: false, message: 'User not found' };
    }

    // add avatar id here
    const avatarId = 'a-' + nanoid();

    const success = await saveAvatar({
      ...avatarData,
      avatar_id: avatarId,
      owner_id: owner_id
    });
    if (success) {
      return { success: true, message: 'Avatar saved successfully' };
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
    // Get the user ID from their email
    const userId = await getUserByIdEmail(userEmail);
    
    if (!userId) {
      return { success: false, avatars: null, message: 'User not found' };
    }

    // Load all avatars for this user
    const avatars = await loadAvatarsByOwner(userId);
    
    // Limit to only 20 avatars
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
    // Load all public avatars
    const avatars = await loadPublicAvatarsFromDb();

    // Fire-and-forget async process
    Promise.resolve().then(async () => {
      await Promise.all(
        avatars.map(async (avatar) => {
          const avatarId = avatar.avatar_id;
          // const exists = await hasCachedAvatarThumbCount(avatarId);
          // here, instead, we check a new cache. 
          const exists = await hasCachedRequestAvatarThumbCount(avatarId);
          if (exists) {
            // Update Redis value into DB-backed avatar cache if needed
            // update: we just do nothing. since we return immediately. 
            // const cachedCount = await getCachedAvatarThumbCount(avatarId);
            // avatar.thumb_count = cachedCount;
          } else {
            try {
              // add into the cache first
              await cacheAvatarThumbRequest(avatarId);
              
              // old way, directly update the data. 
              // await updateAvatarThumbCountAction(avatarId);

              // instead, we just call action to add those avatarids into the queue. 
              // make sure we internally use the redis to check if the id has been processed recently.
              await queueAvatarThumbnailsAction([avatarId]);


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
 * @param offset Number of avatars to skip (for pagination)
 * @param limit Maximum number of avatars to return (default: 20)
 * @param searchTerm Optional search term to filter avatars (default: '')
 * @returns Promise<{ success: boolean; avatars: any[] | null; message: string }> Response with paginated avatars
 */
export async function loadPaginatedPublicAvatarsAction(
  offset: number = 0,
  limit: number = 20,
  searchTerm: string = ''
): Promise<{ 
  success: boolean; 
  avatars: any[] | null; 
  message: string;
  hasMore: boolean;
}> {
  try {
    // Load paginated public avatars with search term
    const avatars = await loadPaginatedPublicAvatars(offset, limit, searchTerm);
    
    // Check if there are potentially more avatars (if we got a full page)
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
              await queueAvatarThumbnailsAction([avatarId]);
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
      message: 'Paginated public avatars loaded successfully',
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
 * Server action to retrieve voice data from Cartesia API
 */

// gender: masculine, feminine, gender_neutral
export async function getCartesiaVoices(
  gender: string, 
  limit: number,
  is_starred: boolean
): Promise<{ 
  success: boolean; 
  voices: any[] | null; 
  message: string,
}> {
  try {
    const response = await fetch(`https://api.cartesia.ai/voices/?limit=${limit}&is_starred=${is_starred}&gender=${gender}&is_owner=false`, {
      method: 'GET',
      headers: {
        'Cartesia-Version': '2024-11-13',
        'X-API-Key': process.env.CARTESIA_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error fetching voices:', response.status, errorData);
      return { 
        success: false, 
        voices: null, 
        message: `Failed to fetch voices: ${response.status} ${response.statusText}` 
      };
    }

    const data = await response.json();
    console.log("voice return data is", data);
    
    return { 
      success: true, 
      voices: data.data, 
      message: 'Voices retrieved successfully' 
    };
  } catch (error) {
    console.error('Error in getCartesiaVoices action:', error);
    return { 
      success: false, 
      voices: null, 
      message: 'An error occurred while retrieving voices' 
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
 * @param avatarId The ID of the avatar to update
 * @param updateData Partial avatar data containing only the fields to update
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
 */
export async function updateAvatarData(
  avatarId: string,
  updateData: Partial<Omit<Avatar, 'avatar_id' | 'create_time' | 'update_time'>>
): Promise<{ success: boolean; message: string }> {
  try {
    const success = await updateAvatarDataFromDb(avatarId, updateData);
    
    if (success) {
      return { success: true, message: 'Avatar updated successfully' };
    } else {
      return { success: false, message: 'No fields were updated' };
    }
  } catch (error) {
    console.error('Error in updateAvatarData action:', error);
    return { success: false, message: 'An error occurred while updating the avatar' };
  }
}


/**
 * Server action to increment the avatar request counter for a specific avatar
 * @param avatarId The ID of the avatar to increment the counter for
 * @returns Promise<{ success: boolean; message: string }> Response indicating if the counter was incremented
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
 * @param avatarId The ID of the avatar being served
 * @param userEmail The email of the user requesting the avatar
 * @param serveTime The time taken to serve the avatar in milliseconds
 * @returns Promise<{ success: boolean; message: string }> Response indicating if the metric was recorded
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
    // Get the user ID from email
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
 * @param avatarId The ID of the avatar to delete
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
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
 * Server action to check RunPod endpoint health status
 */
export async function checkRunPodHealth(): Promise<{ 
  success: boolean; 
  data: {
    jobs: {
      completed: number;
      failed: number;
      inProgress: number;
      inQueue: number;
      retried: number;
    };
    workers: {
      idle: number;
      initializing: number;
      ready: number;
      running: number;
      throttled: number;
      unhealthy: number;
    };
  } | null;
  message: string;
}> {
  try {
    const { RUNPOD_API_KEY, ENDPOINT_ID } = process.env;
    
    if (!RUNPOD_API_KEY || !ENDPOINT_ID) {
      console.error('Missing RunPod configuration:', { 
        hasApiKey: !!RUNPOD_API_KEY, 
        hasEndpointId: !!ENDPOINT_ID 
      });
      return { 
        success: false, 
        data: null, 
        message: 'Missing RunPod configuration' 
      };
    }

    const response = await fetch(`https://api.runpod.ai/v2/${ENDPOINT_ID}/health`, {
      headers: {
        'Authorization': RUNPOD_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RunPod health check failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch RunPod health: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate the response structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid RunPod health response:', data);
      throw new Error('Invalid RunPod health response format');
    }

    // Ensure we have the expected structure with default values
    const jobs = data.jobs || {};
    const workers = data.workers || {};
    
    return {
      success: true,
      data: {
        jobs: {
          completed: Number(jobs.completed) || 0,
          failed: Number(jobs.failed) || 0,
          inProgress: Number(jobs.inProgress) || 0,
          inQueue: Number(jobs.inQueue) || 0,
          retried: Number(jobs.retried) || 0,
        },
        workers: {
          idle: Number(workers.idle) || 0,
          initializing: Number(workers.initializing) || 0,
          ready: Number(workers.ready) || 0,
          running: Number(workers.running) || 0,
          throttled: Number(workers.throttled) || 0,
          unhealthy: Number(workers.unhealthy) || 0,
        },
      },
      message: 'Health check completed successfully'
    };
  } catch (error) {
    console.error('Error checking RunPod health:', error);
    return { 
      success: false, 
      data: null, 
      message: error instanceof Error ? error.message : 'Failed to check RunPod health' 
    };
  }
}

/**
 * Server action to remove a participant from a LiveKit room
 */
export async function removeParticipant(roomName: string, identity: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    
    await roomService.removeParticipant(roomName, identity);
    
    return { 
      success: true, 
      message: 'Participant removed successfully' 
    };
  } catch (error: any) {
    console.error('Error removing participant:', error);
    
    // Handle the case where participant is not found
    if (error.status === 404 && error.code === 'not_found') {
      return {
        success: true,
        message: 'Participant was already removed or not found'
      };
    }
    
    return { 
      success: false, 
      message: 'Failed to remove participant' 
    };
  }
}

/**
 * Server action to get the serve count for a user
 * @param userEmail The email of the user to get the serve count for
 * @returns Promise<{ success: boolean; count: number; message: string }> Response with the serve count
 */
export async function getUserServeCountAction(userEmail: string): Promise<{ 
  success: boolean; 
  count: number; 
  message: string 
}> {
  try {
    // Get the real user ID from email
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
 * @param userEmail The email of the user to increment the serve count for
 * @returns Promise<{ success: boolean; newCount: number; message: string }> Response with the new serve count
 */
export async function incrementUserServeCountAction(userEmail: string): Promise<{ 
  success: boolean; 
  newCount: number; 
  message: string 
}> {
  try {
    // Get the real user ID from email
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
 * Server action to load a single avatar by its ID with permission check
 */
export async function loadAuthorizedAvatar(avatarId: string, email: string): Promise<{ 
  success: boolean; 
  avatar: Avatar | null; 
  message: string;
  authorized: boolean;
}> {
  try {
    // Get user ID from email
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

    // Check if the user is authorized to view this avatar
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
 * Server action to update a user's preferred name
 * @param userEmail The email of the user to update
 * @param preferredName The new preferred name to set
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
 */
export async function updateUserPreferredNameAction(
  userEmail: string,
  preferredName: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get the user ID from email
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
 * @param userEmail The email of the user to get the preferred name for
 * @returns Promise<{ success: boolean; preferredName: string | null; message: string }> Response with the preferred name
 */
export async function getUserPreferredNameAction(userEmail: string): Promise<{ 
  success: boolean; 
  preferredName: string | null; 
  message: string 
}> {
  try {
    // Get the user ID from email
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
 * Server action to delete a user's previous room if it exists
 * This is a fire-and-forget operation that doesn't need to be awaited
 * @param userEmail The email of the user to check for previous rooms
 * @param room_name The name of the current room to compare against
 */
export async function deleteUserPreviousRoomAction(userEmail: string, room_name: string) {
  try {
    // Get the user ID from email
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      console.error('User not found for email:', userEmail);
      return;
    }

    // Find and remove the previous room ID from Redis
    const roomId = await findUserPreviousRoom(userId);
    if (!roomId) {
      return; // No previous room found, nothing to do
    }

    // Only delete if the room IDs don't match
    if (roomId === room_name) {
      console.log(`Room "${roomId}" matches current room, skipping deletion.`);
      return;
    }

    // Delete the room from LiveKit
    try {
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!
      );
      
      await roomService.deleteRoom(roomId);
      console.log(`Room "${roomId}" deleted successfully.`);
    } catch (error) {
      console.error(`Failed to delete room "${roomId}":`, error);
    }
  } catch (error) {
    console.error('Error in deleteUserPreviousRoomAction:', error);
  }
}

/**
 * Server action to store a room ID for a user
 * @param userEmail The email of the user to store the room for
 * @param roomId The room ID to store
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
 */
export async function storeUserRoomAction(
  userEmail: string,
  roomId: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get the user ID from email
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Store the room ID in Redis
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

/**
 * Server action to check if a user is the owner of an avatar
 * @param userEmail The email of the user to check
 * @param avatarId The avatar ID to check ownership for
 * @returns Promise<{ success: boolean; isOwner: boolean; message: string }> Response indicating ownership status
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
    // Get the user ID from email
    const userId = await getUserByIdEmail(userEmail);
    if (!userId) {
      return {
        success: false,
        isOwner: false,
        message: 'User not found'
      };
    }

    // Check if user is in the special list
    if (userId == 'u-vSOjV52Fssi' || userId === 'u-A6ymSzslVmL' || userId === 'u-oK5KkVLYRTH' || userId === 'u-mwpqtYu1f2B') {
      return {
        success: true,
        isOwner: true,
        message: 'Special user - full access granted'
      };
    }

    const isOwner = await isUserAvatarOwner(userId, avatarId);
    return { 
      success: true, 
      isOwner, 
      message: isOwner ? 'User is the owner of this avatar' : 'User is not the owner of this avatar' 
    };
  } catch (error) {
    console.error('Error checking avatar ownership:', error);
    return { 
      success: false, 
      isOwner: false, 
      message: 'An error occurred while checking avatar ownership' 
    };
  }
}

/**
 * Server action to clone a voice using Cartesia API
 */
export async function cloneVoice(formData: FormData): Promise<{ 
  success: boolean; 
  voice_id: string | null; 
  message: string;
  error?: string;
}> {
  try {
    const file = formData.get('file') as File;
    
    if (!file) {
      return { 
        success: false, 
        voice_id: null, 
        message: 'No file provided',
        error: 'NO_FILE'
      };
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create FormData for Cartesia API
    const cartesiaFormData = new FormData();
    cartesiaFormData.append('clip', new Blob([buffer], { type: file.type }), file.name);
    cartesiaFormData.append('name', 'Cloned Voice');
    cartesiaFormData.append('language', 'en');
    cartesiaFormData.append('description', 'Voice cloned from user upload');

    // Call Cartesia API
    const response = await fetch('https://api.cartesia.ai/voices/clone', {
      method: 'POST',
      headers: {
        'Cartesia-Version': '2025-04-16',
        'Authorization': `Bearer ${process.env.CARTESIA_API_KEY}`,
      },
      body: cartesiaFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cartesia API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return {
        success: false,
        voice_id: null,
        message: `Failed to clone voice: ${response.status} ${response.statusText}`,
        error: errorData.message || 'API_ERROR'
      };
    }

    const data = await response.json();
    return { 
      success: true, 
      voice_id: data.id,
      message: 'Voice cloned successfully' 
    };
  } catch (error) {
    console.error('Error cloning voice:', error);
    return { 
      success: false, 
      voice_id: null, 
      message: error instanceof Error ? error.message : 'Failed to clone voice',
      error: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Server action to add a thumb (like) to an avatar
 * @param userId The ID of the user giving the thumb
 * @param avatarId The ID of the avatar receiving the thumb
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
 */
export async function addAvatarThumbAction(
  userEmail: string,
  avatarId: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get the user ID from email
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
        message: 'Avatar thumbed successfully' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to thumb avatar' 
      };
    }
  } catch (error) {
    console.error('Error adding avatar thumb:', error);
    return { 
      success: false, 
      message: 'An error occurred while thumbing the avatar' 
    };
  }
}

/**
 * Server action to remove a thumb (unlike) from an avatar
 * @param userEmail The email of the user removing the thumb
 * @param avatarId The ID of the avatar to remove the thumb from
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
 */
export async function removeAvatarThumbAction(
  userEmail: string,
  avatarId: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get the user ID from email
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
        message: 'Avatar thumb removed successfully' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to remove avatar thumb' 
      };
    }
  } catch (error) {
    console.error('Error removing avatar thumb:', error);
    return { 
      success: false, 
      message: 'An error occurred while removing the avatar thumb' 
    };
  }
}

/**
 * Server action to get the number of thumbs for an avatar
 * @param avatarId The ID of the avatar to get the thumb count for
 * @returns Promise<{ success: boolean; count: number; message: string }> Response with the thumb count
 */
export async function getAvatarThumbCountAction(
  avatarId: string
): Promise<{ 
  success: boolean; 
  count: number; 
  message: string 
}> {
  try {

    // First check if we have a cached count, this prevents the database from being hit for each avatar
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

/**
 * Server action to check if a user has thumbed an avatar
 * @param userEmail The email of the user to check
 * @param avatarId The ID of the avatar to check
 * @returns Promise<{ success: boolean; hasThumb: boolean; message: string }> Response indicating if the user has thumbed the avatar
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
    // Get the user ID from email
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


// thumbnail redis actions

/**
 * Server action to cache an avatar's thumb count in Redis
 * @param avatarId The ID of the avatar
 * @param count The thumb count to cache
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
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
 * @param avatarId The ID of the avatar
 * @returns Promise<{ success: boolean; count: number; message: string }> Response with the cached thumb count
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
 * @param avatarId The ID of the avatar
 * @returns Promise<{ success: boolean; exists: boolean; message: string }> Response indicating if the cache exists
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
 * Server action to update an avatar's thumb count
 * @param avatarId The ID of the avatar
 * @returns Promise<{ success: boolean; thumbCount?: number; message: string }> Response with updated count or error
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
    
    // Use the thumb count directly from the result
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
 * Server action to queue avatar thumbnail generation jobs
 * @param avatarIds Array of avatar IDs to generate thumbnails for
 * @returns Promise<{ success: boolean; message: string }> Response indicating success or failure
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
    
    // console.log(`Queueing ${uniqueAvatarIds.length} unique avatar thumbnail jobs`);
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
 * @returns Promise<{ success: boolean; avatarId: string | null; message: string }> Response with the next avatar ID or error
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
