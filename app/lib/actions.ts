'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { getPresignedGetUrl, getPresignedPutUrl } from './s3';
import { saveAvatar, getUserByIdEmail, loadAvatarsByOwner } from './data';

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
export async function startStreamingSession(instruction: string, seconds: number, room: string = "my-room", avatarSource: string = "") {
  try {
    const response = await fetch('https://api.runpod.ai/v2/ig6zqibcn2nc8b/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.RUNPOD_API_KEY || '',
      },
      body: JSON.stringify({
        input: {
          instruction,
          seconds,
          room,
          avatarSource,
        },
      }),
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
    const presignedUrl = await getPresignedGetUrl(key);
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
  owner_email: string;
  image_uri?: string;
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

