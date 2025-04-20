import postgres from 'postgres';
import { z } from 'zod';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

import { Redis } from '@upstash/redis'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue[]>`SELECT * FROM revenue`;

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {

    console.log('Fetching latest invoices data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));


    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    console.log('Data fetch completed after 3 seconds.');

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));
    // console.log(invoice); // Invoice is an empty array []
    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

// user dbs

const UserFormSchema = z.object({
  user_id: z.string(),
  email: z.string(),
});
 
const CreateUser = UserFormSchema;

export async function createUser(formData: FormData) {
  const { user_id, email } = CreateUser.parse({
      user_id: formData.get('user_id'),
      email: formData.get('email'),
    });

  // save into db
  try{
      await sql`
      INSERT INTO users (user_id, email)
      VALUES (${user_id}, ${email})
  `;
  } catch(error){
      console.log(error);
  }

}

/**
 * Check if a user exists in the database by email
 * @param email The email to check
 * @returns Promise<boolean> True if user exists, false otherwise
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM users WHERE email = ${email}
      ) as exists
    `;
    return result[0].exists;
  } catch (error) {
    console.error('Error checking if user exists by email:', error);
    return false;
  }
}

/**
 * Check if a user exists in the database by user_id
 * @param userId The user_id to check
 * @returns Promise<boolean> True if user exists, false otherwise
 */
export async function userExistsById(userId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM users WHERE user_id = ${userId}
      ) as exists
    `;
    return result[0].exists;
  } catch (error) {
    console.error('Error checking if user exists by user_id:', error);
    return false;
  }
}

/**
 * Get a user's ID by their email address
 * @param email The email to look up
 * @returns Promise<string | null> The user ID if found, null otherwise
 */
export async function getUserByIdEmail(email: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT user_id FROM users WHERE email = ${email}
    `;
    return result.length > 0 ? result[0].user_id : null;
  } catch (error) {
    console.error('Error getting user ID by email:', error);
    return null;
  }
}

// avatar dbs

/**
 * Save a new avatar to the database
 * @param avatarData Object containing avatar information
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function saveAvatar(avatarData: {
  avatar_id: string;
  avatar_name: string;
  prompt?: string;
  scene_prompt?: string;
  agent_bio?: string;
  voice_id?: string;
  owner_id: string;
  image_uri?: string;
}): Promise<boolean> {
  try {
    const result = await sql`
      INSERT INTO avatars (
        avatar_id, 
        avatar_name, 
        prompt, 
        scene_prompt,
        agent_bio,
        voice_id,
        owner_id, 
        image_uri
      )
      VALUES (
        ${avatarData.avatar_id}, 
        ${avatarData.avatar_name}, 
        ${avatarData.prompt || null}, 
        ${avatarData.scene_prompt || null},
        ${avatarData.agent_bio || null},
        ${avatarData.voice_id || null},
        ${avatarData.owner_id}, 
        ${avatarData.image_uri || null}
      )
    `;
    return true;
  } catch (error) {
    console.error('Error saving avatar:', error);
    return false;
  }
}

// Define the Avatar type
type Avatar = {
  avatar_id: string;
  avatar_name: string;
  prompt: string | null;
  scene_prompt: string | null;
  agent_bio: string | null;
  voice_id: string | null;
  owner_id: string;
  image_uri: string | null;
  create_time: Date;
  update_time: Date;
};

/**
 * Load an avatar from the database by its ID
 * @param avatarId The avatar_id to retrieve
 * @returns Promise<Avatar | null> The avatar data or null if not found
 */
export async function loadAvatar(avatarId: string): Promise<Avatar | null> {
  try {
    const result = await sql<Avatar[]>`
      SELECT 
        avatar_id, 
        avatar_name, 
        prompt,
        scene_prompt,
        agent_bio,
        voice_id,
        owner_id, 
        image_uri, 
        create_time, 
        update_time
      FROM avatars 
      WHERE avatar_id = ${avatarId}
    `;
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error loading avatar:', error);
    return null;
  }
}

/**
 * Load all avatars for a specific owner
 * @param ownerId The owner_id to retrieve avatars for
 * @returns Promise<Avatar[]> Array of avatar objects
 */
export async function loadAvatarsByOwner(ownerId: string): Promise<Avatar[]> {
  try {
    const result = await sql<Avatar[]>`
      SELECT 
        avatar_id, 
        avatar_name, 
        prompt,
        scene_prompt,
        agent_bio,
        voice_id,
        owner_id, 
        image_uri, 
        create_time, 
        update_time
      FROM avatars 
      WHERE owner_id = ${ownerId}
      ORDER BY create_time DESC
    `;
    
    return result;
  } catch (error) {
    console.error('Error loading avatars by owner:', error);
    return [];
  }
}

/**
 * Get a presigned URL from Redis using a URI key
 * @param uri The URI key to look up
 * @returns Promise<string | null> The presigned URL if found, null otherwise
 */
export async function getPresignedUrlRedis(uri: string): Promise<string | null> {
  try {
    const key = `uri:${uri}`;
    const presignedUrl = await redis.get(key);
    return presignedUrl as string | null;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    return null;
  }
}

/**
 * Set a presigned URL in Redis with a URI key
 * @param uri The URI key to store
 * @param presignedUrl The presigned URL to store
 * @param ttlSeconds Optional time-to-live in seconds (default: 1 hour)
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function setPresignedUrlRedis(
  uri: string,
  presignedUrl: string,
  ttlSeconds: number = 3600
): Promise<boolean> {
  try {
    const key = `uri:${uri}`;
    await redis.set(key, presignedUrl, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error('Error setting presigned URL:', error);
    return false;
  }
}


