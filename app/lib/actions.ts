'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });


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
export async function startStreamingSession(instruction: string, seconds: number) {
  // Start the process but don't await it
  Promise.resolve().then(async () => {
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
          },
        }),
      });

      const data = await response.json();
      console.log('Streaming session completed:', data);
    } catch (error) {
      console.error('Error in streaming session:', error);
    }
  });

  // Return immediately
  return { status: 'started' };
}

