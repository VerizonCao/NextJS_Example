import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { 
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
});

// Chat session types
export type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  sender_id: string;
  sender_name: string;
  created_at: string;
  model?: string;
  prompt_tokens?: number;
  out_tokens?: number;
  deleted?: boolean;
  filtered?: boolean;
  context?: any;
};

export type ChatSession = {
  chat_session_id: string;
  user_id: string;
  avatar_id: string;
  created_time: Date;
  updated_time: Date;
  messages: ChatMessage[];
};

/**
 * Get the latest chat session for a user and avatar
 * @param userId The user ID to search for
 * @param avatarId The avatar ID to search for
 * @returns Promise<ChatSession | null> The latest chat session or null if none exists
 */
export async function getLatestChatSession(userId: string, avatarId: string): Promise<ChatSession | null> {
  try {
    const result = await sql<ChatSession[]>`
      SELECT 
        chat_session_id,
        user_id,
        avatar_id,
        created_time,
        updated_time,
        messages
      FROM chat_sessions
      WHERE user_id = ${userId} AND avatar_id = ${avatarId}
      ORDER BY updated_time DESC
      LIMIT 1
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    const session = result[0];
    // Parse JSONB messages if they exist
    if (session.messages && typeof session.messages === 'string') {
      session.messages = JSON.parse(session.messages);
    }
    
    return session;
  } catch (error) {
    console.error('Error getting latest chat session:', error);
    return null;
  }
}

/**
 * Get all chat sessions for a user and avatar
 * @param userId The user ID to search for
 * @param avatarId The avatar ID to search for
 * @param limit Optional limit on number of sessions to return (default: 10)
 * @returns Promise<ChatSession[]> Array of chat sessions, ordered by most recent first
 */
export async function getChatSessions(userId: string, avatarId: string, limit: number = 10): Promise<ChatSession[]> {
  try {
    const result = await sql<ChatSession[]>`
      SELECT 
        chat_session_id,
        user_id,
        avatar_id,
        created_time,
        updated_time,
        messages
      FROM chat_sessions
      WHERE user_id = ${userId} AND avatar_id = ${avatarId}
      ORDER BY updated_time DESC
      LIMIT ${limit}
    `;
    
    // Parse JSONB messages for each session
    return result.map(session => ({
      ...session,
      messages: session.messages && typeof session.messages === 'string' 
        ? JSON.parse(session.messages) 
        : session.messages || []
    }));
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return [];
  }
}

/**
 * Get chat messages from the latest session for display
 * @param userId The user ID to search for
 * @param avatarId The avatar ID to search for
 * @returns Promise<ChatMessage[]> Array of chat messages from the latest session
 */
export async function getLatestChatMessages(userId: string, avatarId: string): Promise<ChatMessage[]> {
  try {
    const session = await getLatestChatSession(userId, avatarId);
    if (!session || !session.messages) {
      return [];
    }
    
    // Filter out deleted messages and return only valid messages
    return session.messages.filter(msg => !msg.deleted && msg.content?.trim());
  } catch (error) {
    console.error('Error getting latest chat messages:', error);
    return [];
  }
}

/**
 * Check if a user has any chat history with an avatar
 * @param userId The user ID to check
 * @param avatarId The avatar ID to check
 * @returns Promise<boolean> True if chat history exists, false otherwise
 */
export async function hasChatHistory(userId: string, avatarId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE user_id = ${userId} 
        AND avatar_id = ${avatarId}
        AND jsonb_array_length(messages) > 0
      ) as has_history
    `;
    return result[0].has_history;
  } catch (error) {
    console.error('Error checking chat history:', error);
    return false;
  }
}

export type RecentChatAvatar = {
  avatar_id: string;
  avatar_name: string;
  image_uri: string | null;
  updated_time: Date;
};

/**
 * Get the most recent avatars from chat_sessions with their profiles
 * @param userId The user ID to get recent chats for
 * @param limit Optional limit on number of avatars to return (default: 10)
 * @returns Promise<RecentChatAvatar[]> Array of recent chat avatars with profiles
 */
export async function getRecentChatAvatars(userId: string, limit: number = 10): Promise<RecentChatAvatar[]> {
  try {
    const result = await sql<RecentChatAvatar[]>`
      WITH latest_chats AS (
        SELECT DISTINCT ON (avatar_id)
          avatar_id,
          updated_time
        FROM chat_sessions
        WHERE user_id = ${userId}
        ORDER BY avatar_id, updated_time DESC
      )
      SELECT 
        lc.avatar_id,
        a.avatar_name,
        a.image_uri,
        lc.updated_time
      FROM latest_chats lc
      JOIN avatars a ON lc.avatar_id = a.avatar_id
      ORDER BY lc.updated_time DESC
      LIMIT ${limit}
    `;
    
    return result;
  } catch (error) {
    console.error('Error getting recent chat avatars:', error);
    return [];
  }
} 