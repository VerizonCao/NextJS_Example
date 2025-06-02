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
  storeUserRoom
} from './data';

import { RoomServiceClient } from 'livekit-server-sdk';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

import { customAlphabet } from 'nanoid'
import { use } from 'react';
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
    // Initialize AWS Lambda client
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

    // Invoke Lambda function
    const lambdaCommand = new InvokeCommand({
      FunctionName: "llm-handler",
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ 
        instruction,
        seconds,
        room_name: room,
        avatarSource,
        ...(avatar_id !== null && { avatar_id }),
        ...(llmUserNickname !== null && { llm_user_nickname: llmUserNickname }),
        ...(llmUserBio !== null && { llm_user_bio: llmUserBio }),
        ...(llmAssistantNickname !== null && { llm_assistant_nickname: llmAssistantNickname }),
        ...(llmAssistantBio !== null && { llm_assistant_bio: llmAssistantBio }),
        ...(llmAssistantAdditionalCharacteristics !== null && { llm_assistant_additional_characteristics: llmAssistantAdditionalCharacteristics }),
        ...(llmConversationContext !== null && { llm_conversation_context: llmConversationContext }),
        ...(ttsVoiceIdCartesia !== null && { tts_voice_id_cartesia: ttsVoiceIdCartesia })
      })),
    });

    try {
      await lambdaClient.send(lambdaCommand);
      console.log("Lambda invocation succeeded for room:", room);
    } catch (lambdaError) {
      console.error("Lambda invocation failed:", lambdaError);
      // Continue with the rest of the function even if Lambda fails
    }

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
 * @param userId The ID of the user requesting the avatar
 * @param serveTime The time taken to serve the avatar in milliseconds
 * @returns Promise<{ success: boolean; message: string }> Response indicating if the metric was recorded
 */
export async function reportAvatarServeTime(
  avatarId: string,
  userId: string,
  serveTime: number
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
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
    if (userId == 'u-vSOjV52Fssi' || userId === 'u-A6ymSzslVmL' || userId === 'u-oK5KkVLYRTH' || userId === 'u-mwpqtYu1f2B' || userId === 'u-2rco6HuUYIt') {
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
    if (userId == 'u-vSOjV52Fssi' || userId === 'u-A6ymSzslVmL' || userId === 'u-oK5KkVLYRTH' || userId === 'u-mwpqtYu1f2B' || userId === 'u-2rco6HuUYIt') {
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
