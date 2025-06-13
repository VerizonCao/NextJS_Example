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
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sql = postgres(process.env.POSTGRES_URL!, { 
  ssl: 'require',
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout for establishing a connection
  max_lifetime: 60 * 30, // Maximum lifetime of a connection (30 minutes)
});

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
  opening_prompt?: string;
  agent_bio?: string;
  voice_id?: string;
  owner_id: string;
  image_uri?: string;
  is_public?: boolean;
  gender?: string;
}): Promise<boolean> {
  try {
    const result = await sql`
      INSERT INTO avatars (
        avatar_id, 
        avatar_name, 
        prompt, 
        scene_prompt,
        opening_prompt,
        agent_bio,
        voice_id,
        owner_id, 
        image_uri,
        is_public,
        gender
      )
      VALUES (
        ${avatarData.avatar_id}, 
        ${avatarData.avatar_name}, 
        ${avatarData.prompt || null}, 
        ${avatarData.scene_prompt || null},
        ${avatarData.opening_prompt || null},
        ${avatarData.agent_bio || null},
        ${avatarData.voice_id || null},
        ${avatarData.owner_id}, 
        ${avatarData.image_uri || null},
        ${avatarData.is_public || false},
        ${avatarData.gender || null}
      )
    `;
    return true;
  } catch (error) {
    console.error('Error saving avatar:', error);
    return false;
  }
}

export type Avatar = {
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
  thumb_count: number;
  is_public: boolean;
  serve_time: number | null;
  v1_score: number | null;
  gender: string | null;
  style: string | null;
  opening_prompt: string | null;
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
        update_time,
        is_public,
        opening_prompt,
        gender,
        style,
        thumb_count,
        serve_time,
        v1_score
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
        update_time,
        opening_prompt
      FROM avatars 
      WHERE owner_id = ${ownerId}
      ORDER BY create_time DESC
    `;
    
    return result;
  } catch (error) {
    console.error('Error loading Characters by owner:', error);
    return [];
  }
}

/**
 * Load all public avatars
 * @returns Promise<Avatar[]> Array of public avatar objects, limited to 20
 */
export async function loadPublicAvatars(): Promise<Avatar[]> {
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
        update_time,
        thumb_count,
        opening_prompt,
        is_public,
        serve_time,
        v1_score,
        gender,
        style
      FROM avatars 
      WHERE is_public = true
      ORDER BY create_time DESC
      LIMIT 40
    `;
    
    return result;
  } catch (error) {
    console.error('Error loading public avatars:', error);
    return [];
  }
}

/**
 * Load paginated public avatars sorted by creation time
 * @param offset Number of avatars to skip (for pagination)
 * @param limit Maximum number of avatars to return (default: 20)
 * @param searchTerm Optional search term to filter avatars (default: '')
 * @param styleFilter Optional style filter ('all', 'stylized', 'realistic')
 * @param genderFilter Optional gender filter ('all', 'male', 'female', 'non-binary')
 * @returns Promise<Avatar[]> Array of public avatar objects with pagination, sorted by creation time
 */
export async function loadPaginatedPublicAvatarsByCreationTime(
  offset: number = 0,
  limit: number = 20,
  searchTerm: string = '',
  styleFilter: string = 'all',
  genderFilter: string = 'all'
): Promise<Avatar[]> {
  try {
    // Check cache first (only for non-search queries to keep results fresh)
    if (!searchTerm) {
      const cached = await getCachedAvatarResults('time', offset, limit, searchTerm, styleFilter, genderFilter);
      if (cached) {
        console.log(`Cache hit for time-sorted avatars: offset=${offset}, limit=${limit}, style=${styleFilter}, gender=${genderFilter}`);
        return cached;
      }
    }
    
    // Build WHERE conditions for filters
    const whereConditions = ['is_public = true'];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    // Add style filter
    if (styleFilter !== 'all') {
      whereConditions.push(`style = $${paramIndex}`);
      queryParams.push(styleFilter);
      paramIndex++;
    }
    
    // Add gender filter
    if (genderFilter !== 'all') {
      whereConditions.push(`gender = $${paramIndex}`);
      queryParams.push(genderFilter);
      paramIndex++;
    }
  
    // If search term is provided, use the full-text search index
    if (searchTerm && searchTerm.trim() !== '') {
      whereConditions.push(`(
        search_vector @@ plainto_tsquery('english', $${paramIndex}) OR
        avatar_name ILIKE $${paramIndex + 1} OR
        agent_bio ILIKE $${paramIndex + 1}
      )`);
      queryParams.push(searchTerm, `%${searchTerm}%`);
      paramIndex += 2;
      
      // Add LIMIT and OFFSET parameters
      queryParams.push(limit, offset);
      
      const query = `
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
          update_time,
          thumb_count,
          is_public,
          serve_time,
          v1_score,
          gender,
          style
        FROM avatars 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC, create_time DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        /* Force new plan - updated schema */
      `;
      
      const result = await sql.unsafe(query, queryParams);
      return result as unknown as Avatar[];
    }
    
    // Add LIMIT and OFFSET parameters
    queryParams.push(limit, offset);
    
    // If no search term, use the original query sorted by creation time
    const query = `
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
        update_time,
        thumb_count,
        is_public,
        serve_time,
        v1_score,
        gender,
        style
      FROM avatars 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY create_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      /* Force new plan - updated schema */
    `;
    
    const result = await sql.unsafe(query, queryParams);
    
    // Cache the results (only for home page queries)
    if (!searchTerm) {
      await cacheAvatarResults('time', offset, limit, searchTerm, styleFilter, genderFilter, result as unknown as Avatar[]);
    }
    
    return result as unknown as Avatar[];
  } catch (error) {
    console.error('Error loading paginated public avatars by creation time:', error);
    return [];
  }
}

/**
 * Load paginated public avatars sorted by v1_score
 * @param offset Number of avatars to skip (for pagination)
 * @param limit Maximum number of avatars to return (default: 20)
 * @param searchTerm Optional search term to filter avatars (default: '')
 * @param styleFilter Optional style filter ('all', 'stylized', 'realistic')
 * @param genderFilter Optional gender filter ('all', 'male', 'female', 'non-binary')
 * @returns Promise<Avatar[]> Array of public avatar objects with pagination, sorted by v1_score
 */
export async function loadPaginatedPublicAvatarsByScore(
  offset: number = 0,
  limit: number = 20,
  searchTerm: string = '',
  styleFilter: string = 'all',
  genderFilter: string = 'all'
): Promise<Avatar[]> {
  try {
    // Check cache first (only for non-search queries to keep results fresh)
    if (!searchTerm) {
      const cached = await getCachedAvatarResults('score', offset, limit, searchTerm, styleFilter, genderFilter);
      if (cached) {
        console.log(`Cache hit for score-sorted avatars: offset=${offset}, limit=${limit}, style=${styleFilter}, gender=${genderFilter}`);
        return cached;
      }
    }
    
    // Build WHERE conditions for filters
    const whereConditions = ['is_public = true'];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    // Add style filter
    if (styleFilter !== 'all') {
      whereConditions.push(`style = $${paramIndex}`);
      queryParams.push(styleFilter);
      paramIndex++;
    }
    
    // Add gender filter
    if (genderFilter !== 'all') {
      whereConditions.push(`gender = $${paramIndex}`);
      queryParams.push(genderFilter);
      paramIndex++;
    }
  
    // If search term is provided, use the full-text search index
    if (searchTerm && searchTerm.trim() !== '') {
      whereConditions.push(`(
        search_vector @@ plainto_tsquery('english', $${paramIndex}) OR
        avatar_name ILIKE $${paramIndex + 1} OR
        agent_bio ILIKE $${paramIndex + 1}
      )`);
      queryParams.push(searchTerm, `%${searchTerm}%`);
      paramIndex += 2;
      
      // Add LIMIT and OFFSET parameters
      queryParams.push(limit, offset);
      
      const query = `
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
          update_time,
          thumb_count,
          is_public,
          serve_time,
          v1_score,
          gender,
          style
        FROM avatars 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC, v1_score DESC NULLS LAST, create_time DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        /* Force new plan - updated schema */
      `;
      
      const result = await sql.unsafe(query, queryParams);
      return result as unknown as Avatar[];
    }
    
    // Add LIMIT and OFFSET parameters
    queryParams.push(limit, offset);
    
    // If no search term, sort by v1_score with fallback to creation time
    const query = `
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
        update_time,
        thumb_count,
        is_public,
        serve_time,
        v1_score,
        gender,
        style
      FROM avatars 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY v1_score DESC NULLS LAST, create_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      /* Force new plan - updated schema */
    `;
    
    const result = await sql.unsafe(query, queryParams);
    
    // Cache the results (only for home page queries)
    if (!searchTerm) {
      await cacheAvatarResults('score', offset, limit, searchTerm, styleFilter, genderFilter, result as unknown as Avatar[]);
    }
    
    return result as unknown as Avatar[];
  } catch (error) {
    console.error('Error loading paginated public avatars by score:', error);
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
    // Gracefully handle Redis errors (rate limits, connection issues, etc.)
    if (error instanceof Error && error.message.includes('max requests limit exceeded')) {
      console.warn('Redis rate limit exceeded for presigned URL cache. Skipping cache.');
    } else {
      console.error('Error getting presigned URL from Redis:', error);
    }
    return null; // Return null to indicate cache miss, fallback to generating new URL
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
    // Gracefully handle Redis errors without breaking the flow
    if (error instanceof Error && error.message.includes('max requests limit exceeded')) {
      console.warn('Redis rate limit exceeded for presigned URL storage. Skipping cache.');
    } else {
      console.error('Error setting presigned URL in Redis:', error);
    }
    return false; // Return false but don't throw - the app can continue without caching
  }
}

/**
 * Update an existing avatar's data
 * @param avatarId The ID of the avatar to update
 * @param updateData Partial avatar data containing only the fields to update
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function updateAvatarData(
  avatarId: string,
  updateData: Partial<Omit<Avatar, 'avatar_id' | 'create_time' | 'update_time'>>
): Promise<boolean> {
  try {
    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.avatar_name) {
      updateFields.push(`avatar_name = $${paramIndex}`);
      values.push(updateData.avatar_name);
      paramIndex++;
    }
    if (updateData.prompt !== undefined) {
      updateFields.push(`prompt = $${paramIndex}`);
      values.push(updateData.prompt);
      paramIndex++;
    }
    if (updateData.scene_prompt !== undefined) {
      updateFields.push(`scene_prompt = $${paramIndex}`);
      values.push(updateData.scene_prompt);
      paramIndex++;
    }
    if (updateData.opening_prompt !== undefined) {
      updateFields.push(`opening_prompt = $${paramIndex}`);
      values.push(updateData.opening_prompt);
      paramIndex++;
    }
    if (updateData.agent_bio !== undefined) {
      updateFields.push(`agent_bio = $${paramIndex}`);
      values.push(updateData.agent_bio);
      paramIndex++;
    }
    if (updateData.voice_id !== undefined) {
      updateFields.push(`voice_id = $${paramIndex}`);
      values.push(updateData.voice_id);
      paramIndex++;
    }
    if (updateData.image_uri !== undefined) {
      updateFields.push(`image_uri = $${paramIndex}`);
      values.push(updateData.image_uri);
      paramIndex++;
    }
    if (updateData.thumb_count !== undefined) {
      updateFields.push(`thumb_count = $${paramIndex}`);
      values.push(updateData.thumb_count);
      paramIndex++;
    }
    if (updateData.is_public !== undefined) {
      updateFields.push(`is_public = $${paramIndex}`);
      values.push(updateData.is_public);
      paramIndex++;
    }
    if (updateData.gender !== undefined) {
      updateFields.push(`gender = $${paramIndex}`);
      values.push(updateData.gender);
      paramIndex++;
    }

    // Always update the update_time
    updateFields.push(`update_time = NOW()`);

    if (updateFields.length === 1) { // Only update_time was added
      return false; // No actual fields to update
    }

    const query = `
      UPDATE avatars
      SET ${updateFields.join(', ')}
      WHERE avatar_id = $${paramIndex}
      RETURNING avatar_id
    `;
    values.push(avatarId);

    const result = await sql.unsafe(query, values);
    return result.length > 0;
  } catch (error) {
    console.error('Error updating avatar:', error);
    return false;
  }
}

/**
 * Delete an avatar from the database by its ID
 * @param avatarId The ID of the avatar to delete
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function deleteAvatar(avatarId: string): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM avatars
      WHERE avatar_id = ${avatarId}
      RETURNING avatar_id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return false;
  }
}

/**
 * Get the serve count for a user from Redis
 * @param userId The user ID to get the serve count for
 * @returns Promise<number> The serve count, or 0 if no record exists
 */
export async function getUserServeCount(userId: string): Promise<number> {
  try {
    const today = new Date();
    const dateKey = `${today.getMonth() + 1}.${today.getDate()}`;
    const key = `${userId}_serve_count_${dateKey}`;
    const count = await redis.get(key);
    return count ? Number(count) : 0;
  } catch (error) {
    console.error('Error getting user serve count:', error);
    return 0;
  }
}

/**
 * Increment the serve count for a user by 1
 * @param userId The user ID to increment the serve count for
 * @returns Promise<number> The new serve count after incrementing
 */
export async function incrementUserServeCount(userId: string): Promise<number> {
  try {
    const today = new Date();
    const dateKey = `${today.getMonth() + 1}.${today.getDate()}`;
    const key = `${userId}_serve_count_${dateKey}`;
    
    // First check if the key exists
    const exists = await redis.exists(key);
    
    if (!exists) {
      // If key doesn't exist, set it with TTL
      const multi = redis.multi();
      multi.set(key, 1);
      multi.expire(key, 24 * 60 * 60); // Set TTL to 24 hours in seconds
      await multi.exec();
      return 1;
    } else {
      // If key exists, just increment it
      return await redis.incr(key);
    }
  } catch (error) {
    console.error('Error incrementing user serve count:', error);
    return 0;
  }
}

/**
 * Update a user's preferred name
 * @param userId The user_id to update
 * @param preferredName The new preferred name to set
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function updateUserPreferredName(userId: string, preferredName: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE users
      SET preferred_name = ${preferredName}
      WHERE user_id = ${userId}
      RETURNING user_id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error updating user preferred name:', error);
    return false;
  }
}

/**
 * Get a user's preferred name by their user ID
 * @param userId The user ID to look up
 * @returns Promise<string | null> The preferred name if found, null otherwise
 */
export async function getUserPreferredName(userId: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT preferred_name FROM users WHERE user_id = ${userId}
    `;
    return result.length > 0 ? result[0].preferred_name : null;
  } catch (error) {
    console.error('Error getting user preferred name:', error);
    return null;
  }
}

/**
 * Check if a user is the owner of an avatar
 * @param userId The user ID to check
 * @param avatarId The avatar ID to check ownership for
 * @returns Promise<boolean> True if user is the owner, false otherwise
 */
export async function isUserAvatarOwner(userId: string, avatarId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM avatars 
        WHERE avatar_id = ${avatarId} 
        AND owner_id = ${userId}
      ) as is_owner
    `;
    return result[0].is_owner;
  } catch (error) {
    console.error('Error checking avatar ownership:', error);
    return false;
  }
}

/**
 * Find and remove a user's previous room ID if it exists
 * @param userId The user ID to check for previous rooms
 * @returns Promise<string | null> The room ID if found, null otherwise
 */
export async function findUserPreviousRoom(userId: string): Promise<string | null> {
  try {
    // Search for any room keys for this user
    const pattern = `${userId}_room_*`;
    const keys = await redis.keys(pattern);
    
    // Filter keys that belong to this user
    const userRoomKeys = keys.filter(key => {
      const roomId = key.split('_')[2]; // Get room ID from key
      return key.startsWith(`${userId}_room_${roomId}`);
    });

    if (userRoomKeys.length === 0) {
      return null;
    }

    // Get the room ID from the first key found
    const roomId = userRoomKeys[0].split('_')[2];

    // Delete the room key from Redis
    await redis.del(userRoomKeys[0]);

    return roomId;
  } catch (error) {
    console.error('Error finding user previous room:', error);
    return null;
  }
}

/**
 * Store a room ID in Redis for a user
 * @param userId The user ID to store the room for
 * @param roomId The room ID to store
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function storeUserRoom(userId: string, roomId: string): Promise<boolean> {
  try {
    const key = `${userId}_room_${roomId}`;
    await redis.set(key, userId, { ex: 2 * 60 * 60 }); // Set TTL to 2 hours
    return true;
  } catch (error) {
    console.error('Error storing user room:', error);
    return false;
  }
}

/**
 * Add a thumb (like) to an avatar by a user
 * @param userId The ID of the user giving the thumb
 * @param avatarId The ID of the avatar receiving the thumb
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function addAvatarThumb(userId: string, avatarId: string): Promise<boolean> {
  try {
    // Use ON CONFLICT DO NOTHING to handle the case where the user has already thumbed this avatar
    const result = await sql`
      INSERT INTO avatar_thumbs (user_id, avatar_id)
      VALUES (${userId}, ${avatarId})
      ON CONFLICT (user_id, avatar_id) DO NOTHING
      RETURNING user_id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error adding avatar thumb:', error);
    return false;
  }
}

/**
 * Get the number of thumbs (likes) for an avatar
 * @param avatarId The ID of the avatar to count thumbs for
 * @returns Promise<number> The number of thumbs
 */
export async function getAvatarThumbCount(avatarId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as thumb_count
      FROM avatar_thumbs
      WHERE avatar_id = ${avatarId}
    `;
    return Number(result[0].thumb_count);
  } catch (error) {
    console.error('Error counting avatar thumbs:', error);
    return 0;
  }
}

/**
 * Check if a user has thumbed (liked) a specific avatar
 * @param userId The ID of the user to check
 * @param avatarId The ID of the avatar to check
 * @returns Promise<boolean> True if the user has thumbed the avatar, false otherwise
 */
export async function hasUserThumbedAvatar(userId: string, avatarId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM avatar_thumbs 
        WHERE user_id = ${userId} AND avatar_id = ${avatarId}
      ) as has_thumbed
    `;
    return result[0].has_thumbed;
  } catch (error) {
    console.error('Error checking if user has thumbed avatar:', error);
    return false;
  }
}

/**
 * Remove a thumb (unlike) from an avatar by a user
 * @param userId The ID of the user removing the thumb
 * @param avatarId The ID of the avatar to remove the thumb from
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function removeAvatarThumb(userId: string, avatarId: string): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM avatar_thumbs
      WHERE user_id = ${userId} AND avatar_id = ${avatarId}
      RETURNING user_id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error removing avatar thumb:', error);
    return false;
  }
}

/**
 * Cache the thumb count for an avatar in Redis
 * @param avatarId The ID of the avatar
 * @param count The thumb count to cache
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function cacheAvatarThumbCount(avatarId: string, count: number): Promise<boolean> {
  // console.log("caching avatar thumb count", avatarId, count);
  try {
    const key = `thumb_${avatarId}`;
    await redis.set(key, count, { ex: 60 }); // Set TTL to 1 minute (60 seconds)
    return true;
  } catch (error) {
    console.error('Error caching avatar thumb count:', error);
    return false;
  }
}

/**
 * Get the cached thumb count for an avatar from Redis
 * @param avatarId The ID of the avatar
 * @returns Promise<number> The cached thumb count, or 0 if no cache exists
 */
export async function getCachedAvatarThumbCount(avatarId: string): Promise<number> {
  try {
    const key = `thumb_${avatarId}`;
    const count = await redis.get(key);
    return count ? Number(count) : 0;
  } catch (error) {
    console.error('Error getting cached avatar thumb count:', error);
    return 0;
  }
}

/**
 * Check if a cached thumb count exists for an avatar in Redis
 * @param avatarId The ID of the avatar to check
 * @returns Promise<boolean> True if a cached count exists, false otherwise
 */
export async function hasCachedAvatarThumbCount(avatarId: string): Promise<boolean> {
  try {
    const key = `thumb_${avatarId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Error checking cached avatar thumb count:', error);
    return false;
  }
}

/**
 * Push a list of avatar IDs to a Redis queue for thumbnail processing
 * @param avatarIds Array of avatar IDs to be processed
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function queueAvatarThumbnailJobs(avatarIds: string[]): Promise<boolean> {
  try {
    const queueName = 'avatar_thumb_job_queue';
    
    // Use Redis pipeline to push all IDs in a single operation
    const pipeline = redis.pipeline();
    
    for (const avatarId of avatarIds) {
      pipeline.rpush(queueName, avatarId);
    }
    
    // Check if queue exists and set TTL if it's a new queue
    const exists = await redis.exists(queueName);
    if (!exists) {
      pipeline.expire(queueName, 600); // 10 mins TTL
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('Error queuing avatar thumbnail jobs:', error);
    return false;
  }
}

/**
 * Get the next avatar ID from the thumbnail processing queue
 * @returns Promise<string | null> The next avatar ID to process, or null if queue is empty
 */
export async function getNextAvatarThumbnailJob(): Promise<string | null> {
  try {
    const queueName = 'avatar_thumb_job_queue';
    
    // Get the current queue size for debugging
    const queueSize = await redis.llen(queueName);
    console.log(`Current thumbnail queue size before pop: ${queueSize}`);
    
    // Use LPOP to get and remove the leftmost element from the list
    // This maintains FIFO (First In, First Out) order
    const avatarId = await redis.lpop(queueName);
    
    // Log the result
    if (avatarId) {
      const remainingSize = await redis.llen(queueName);
      console.log(`Popped avatar ${avatarId} from queue. Remaining items: ${remainingSize}`);
    } else {
      console.log('Queue is empty, no avatar ID to process');
    }
    
    // If the queue is empty, avatarId will be null
    return avatarId as string | null;
  } catch (error) {
    console.error('Error getting next avatar thumbnail job:', error);
    return null;
  }
}

/**
 * Check if a cached thumb request exists for an avatar in Redis
 * @param avatarId The ID of the avatar to check
 * @returns Promise<boolean> True if a cached request exists, false otherwise
 */
export async function hasCachedRequestAvatarThumbCount(avatarId: string): Promise<boolean> {
  try {
    const key = `thumb_request_${avatarId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Error checking cached avatar thumb request:', error);
    return false;
  }
}

/**
 * Cache a thumb request for an avatar in Redis
 * @param avatarId The ID of the avatar
 * @param ttlSeconds Optional time-to-live in seconds (default: 60 seconds)
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function cacheAvatarThumbRequest(avatarId: string, ttlSeconds: number = 300): Promise<boolean> {
  try {
    const key = `thumb_request_${avatarId}`;
    await redis.set(key, 1, { ex: ttlSeconds }); // Set TTL (default: 1 minute)
    return true;
  } catch (error) {
    console.error('Error caching avatar thumb request:', error);
    return false;
  }
}

/**
 * Increment the serve count for an avatar by a specified value
 * @param avatarId The avatar ID to increment the serve count for
 * @param value The value to increment by (or set if key doesn't exist)
 * @returns Promise<number> The new serve count after incrementing
 */
export async function incrementAvatarServeCount(avatarId: string, value: number): Promise<number> {
  try {
    const key = `avatar_serve_${avatarId}`;
    
    // First check if the key exists
    const exists = await redis.exists(key);
    
    if (!exists) {
      // If key doesn't exist, set it with the initial value
      await redis.set(key, value);
      return value;
    } else {
      // If key exists, increment it by the specified value
      return await redis.incrby(key, value);
    }
  } catch (error) {
    console.error('Error incrementing avatar serve count:', error);
    return 0;
  }
}

/**
 * Get and remove the serve count for an avatar from Redis
 * @param avatarId The avatar ID to get and remove the serve count for
 * @returns Promise<number> The serve count value before removal, or 0 if key doesn't exist
 */
export async function getAndRemoveAvatarServeCount(avatarId: string): Promise<number> {
  try {
    const key = `avatar_serve_${avatarId}`;
    
    // Get the current value and delete the key atomically using GETDEL
    const value = await redis.getdel(key);
    
    // Return the value as a number, or 0 if the key didn't exist
    return value ? Number(value) : 0;
  } catch (error) {
    console.error('Error getting and removing avatar serve count:', error);
    return 0;
  }
}

/**
 * Add to the serve_time count for an avatar in the database
 * @param avatarId The avatar ID to update the serve_time for
 * @param additionalServeTime The value to add to the current serve_time
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function addAvatarServeTime(avatarId: string, additionalServeTime: number): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE avatars
      SET serve_time = serve_time + ${additionalServeTime}
      WHERE avatar_id = ${avatarId}
      RETURNING avatar_id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error adding avatar serve time:', error);
    return false;
  }
}

/**
 * Get all avatar serve count keys from Redis (up to 100)
 * @returns Promise<string[]> Array of avatar serve count keys, limited to 100
 */
export async function getAllAvatarServeCountKeys(): Promise<string[]> {
  try {
    const pattern = 'avatar_serve_*';
    const keys = await redis.keys(pattern);
    
    // Limit to 100 keys to prevent memory issues
    return keys.slice(0, 100);
  } catch (error) {
    console.error('Error getting avatar serve count keys:', error);
    return [];
  }
}

/**
 * Get the serve_time for an avatar from the database with Redis caching
 * @param avatarId The avatar ID to get the serve_time for
 * @returns Promise<number> The serve_time value, or 0 if avatar not found
 */
export async function getAvatarServeTime(avatarId: string): Promise<number> {
  try {
    const cacheKey = `avatar_total_serve_${avatarId}`;
    
    // Try to get from cache first
    const cachedValue = await redis.get(cacheKey);
    if (cachedValue !== null) {
      return Number(cachedValue);
    }
    
    // If not in cache, get from database
    const result = await sql`
      SELECT serve_time
      FROM avatars
      WHERE avatar_id = ${avatarId}
    `;
    
    const serveTime = result.length > 0 ? Number(result[0].serve_time || 0) : 0;
    
    // Cache the result with 10 minute TTL
    await redis.set(cacheKey, serveTime, { ex: 600 }); // 600 seconds = 10 minutes
    
    return serveTime;
  } catch (error) {
    console.error('Error getting avatar serve time:', error);
    return 0;
  }
}

/**
 * Send a message to the image moderation SQS queue
 * @param imgPath The path of the image to be moderated
 * @param avatarId The ID of the avatar associated with the image
 * @returns Promise<boolean> True if message was sent successfully, false otherwise
 */
export async function sendImageModerationTask(imgPath: string, avatarId: string): Promise<boolean> {
  try {
    const sqsClient = new SQSClient({
      region: 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const messageBody = {
      img_path: imgPath,
      avatar_id: avatarId,
    };

    const command = new SendMessageCommand({
      QueueUrl: process.env.AWS_SQS_IMAGE_MODERATION_URL!,
      MessageBody: JSON.stringify(messageBody),
    });

    await sqsClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending message to SQS:', error);
    return false;
  }
}

// Chat session database functions - Re-exported from dedicated chat module
export type { ChatMessage, ChatSession } from './data/chat';
export {
  getLatestChatSession,
  getChatSessions,
  getLatestChatMessages,
  hasChatHistory
} from './data/chat';

/**
 * Check if an avatar's moderation check has passed
 * @param avatarId The ID of the avatar to check
 * @returns Promise<{isModerated: boolean, message: string}> Object containing moderation status and message
 */
export async function checkAvatarModerationPass(avatarId: string): Promise<{isModerated: boolean, message: string}> {
  try {
    const result = await sql`
      SELECT check_pass
      FROM avatar_moderation
      WHERE avatar_id = ${avatarId}
    `;
    
    if (result.length === 0) {
      return {
        isModerated: false,
        message: 'Avatar is still in moderation queue'
      };
    }
    
    return {
      isModerated: result[0].check_pass,
      message: result[0].check_pass ? 'Avatar has passed moderation' : 'Avatar has not passed moderation'
    };
  } catch (error) {
    console.error('Error checking avatar moderation status:', error);
    return {
      isModerated: false,
      message: 'Error checking moderation status'
    };
  }
}

/**
 * Cache avatar results for pagination queries
 * @param sortBy The sort method ('score' or 'time')
 * @param offset The pagination offset
 * @param limit The page limit
 * @param searchTerm The search term (empty string for home page)
 * @param styleFilter Optional style filter ('all', 'stylized', 'realistic')
 * @param genderFilter Optional gender filter ('all', 'male', 'female', 'non-binary')
 * @param avatars The avatar results to cache
 * @returns Promise<boolean> True if cached successfully
 */
export async function cacheAvatarResults(
  sortBy: 'score' | 'time',
  offset: number,
  limit: number,
  searchTerm: string,
  styleFilter: string,
  genderFilter: string,
  avatars: Avatar[]
): Promise<boolean> {
  try {
    const key = `avatars_${sortBy}_${offset}_${limit}_${searchTerm || 'home'}_${styleFilter}_${genderFilter}`;
    // Cache for 5 minutes (300 seconds) to balance freshness with performance
    await redis.set(key, JSON.stringify(avatars), { ex: 300 });
    return true;
  } catch (error) {
    // Gracefully handle Redis errors
    if (error instanceof Error && error.message.includes('max requests limit exceeded')) {
      console.warn('Redis rate limit exceeded for avatar caching. Skipping cache.');
    } else {
      console.error('Error caching avatar results:', error);
    }
    return false;
  }
}

/**
 * Get cached avatar results for pagination queries
 * @param sortBy The sort method ('score' or 'time')
 * @param offset The pagination offset
 * @param limit The page limit
 * @param searchTerm The search term (empty string for home page)
 * @param styleFilter Optional style filter ('all', 'stylized', 'realistic')
 * @param genderFilter Optional gender filter ('all', 'male', 'female', 'non-binary')
 * @returns Promise<Avatar[] | null> Cached avatars or null if not found/error
 */
export async function getCachedAvatarResults(
  sortBy: 'score' | 'time',
  offset: number,
  limit: number,
  searchTerm: string,
  styleFilter: string,
  genderFilter: string
): Promise<Avatar[] | null> {
  try {
    const key = `avatars_${sortBy}_${offset}_${limit}_${searchTerm || 'home'}_${styleFilter}_${genderFilter}`;
    const cached = await redis.get(key);
    
    if (cached) {
      // Handle both string and object responses from Redis
      if (typeof cached === 'string') {
        try {
          return JSON.parse(cached) as Avatar[];
        } catch (parseError) {
          console.error('Error parsing cached avatar JSON:', parseError);
          return null;
        }
      } else if (typeof cached === 'object' && cached !== null) {
        // Redis sometimes returns objects directly
        return cached as Avatar[];
      } else {
        console.warn('Unexpected cached avatar format:', typeof cached);
        return null;
      }
    }
    return null;
  } catch (error) {
    // Gracefully handle Redis errors
    if (error instanceof Error && error.message.includes('max requests limit exceeded')) {
      console.warn('Redis rate limit exceeded for avatar cache lookup. Skipping cache.');
    } else {
      console.error('Error getting cached avatar results:', error);
    }
    return null;
  }
}

/**
 * Load paginated user avatars with optional public/private filtering
 * @param ownerId The owner_id to retrieve avatars for
 * @param offset Number of avatars to skip (for pagination)
 * @param limit Maximum number of avatars to return (default: 30)
 * @param isPublic Optional filter for public/private avatars (undefined = all, true = public only, false = private only)
 * @returns Promise<Avatar[]> Array of avatar objects with pagination
 */
export async function loadPaginatedUserAvatars(
  ownerId: string,
  offset: number = 0,
  limit: number = 30,
  isPublic?: boolean
): Promise<Avatar[]> {
  try {
    // Build WHERE conditions
    const whereConditions = [`owner_id = $1`];
    const queryParams: any[] = [ownerId];
    let paramIndex = 2;
    
    // Add public/private filter if specified
    if (isPublic !== undefined) {
      whereConditions.push(`is_public = $${paramIndex}`);
      queryParams.push(isPublic);
      paramIndex++;
    }
    
    // Add LIMIT and OFFSET parameters
    queryParams.push(limit, offset);
    
    const query = `
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
        update_time,
        thumb_count,
        is_public,
        serve_time,
        v1_score,
        gender,
        style
      FROM avatars 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY create_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await sql.unsafe(query, queryParams);
    return result as unknown as Avatar[];
  } catch (error) {
    console.error('Error loading paginated user avatars:', error);
    return [];
  }
}


