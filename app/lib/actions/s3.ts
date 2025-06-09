'use server';

import { getPresignedGetUrl, getPresignedPutUrl } from '../s3';
import { getPresignedUrlRedis, setPresignedUrlRedis } from '../data';

export async function getPresignedUrl(key: string) {
  try {
    // First check if we have the presigned URL in Redis (gracefully handle Redis issues)
    let cachedUrl: string | null = null;
    try {
      cachedUrl = await getPresignedUrlRedis(key);
    } catch (redisError) {
      // Log but don't fail - we can still generate a new URL
      console.warn('Redis lookup failed for presigned URL, proceeding with generation:', redisError);
    }
    
    if (cachedUrl) {
      return { presignedUrl: cachedUrl };
    }

    // If not in Redis or Redis failed, generate a new one
    const presignedUrl = await getPresignedGetUrl(key);
    
    // Try to store the new presigned URL in Redis (don't fail if this doesn't work)
    try {
      await setPresignedUrlRedis(key, presignedUrl);
    } catch (redisError) {
      // Log but don't fail - the URL is still valid even if we can't cache it
      console.warn('Failed to cache presigned URL in Redis, but URL is still valid:', redisError);
    }
    
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