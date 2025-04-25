'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { getPresignedGetUrl, getPresignedPutUrl } from './s3';
import { 
  saveAvatar, 
  getUserByIdEmail, 
  loadAvatarsByOwner, 
  getPresignedUrlRedis, 
  setPresignedUrlRedis, 
  loadAvatar as loadAvatarFromDb, 
  updateAvatarData as updateAvatarDataFromDb,
  loadPublicAvatars as loadPublicAvatarsFromDb,
  Avatar 
} from './data';

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
  llmUserNickname = null,
  llmUserBio = null,
  llmAssistantNickname = null,
  llmAssistantBio = null,
  llmAssistantAdditionalCharacteristics = null,
  llmConversationContext = null,
  ttsVoiceIdCartesia = null,
}: {
  instruction: string;
  seconds: number;
  room?: string;
  avatarSource?: string;
  llmUserNickname?: string | null;
  llmUserBio?: string | null;
  llmAssistantNickname?: string | null;
  llmAssistantBio?: string | null;
  llmAssistantAdditionalCharacteristics?: string | null;
  llmConversationContext?: string | null;
  ttsVoiceIdCartesia?: string | null;
}) {
  try {
    const input: Record<string, any> = {
      instruction,
      seconds,
      room,
      avatarSource,
    };

    // Only add fields that are not null
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
    
    // Limit to only 10 avatars
    const limitedAvatars = avatars.slice(0, 10);
    
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
      message: 'An error occurred while loading avatars' 
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

