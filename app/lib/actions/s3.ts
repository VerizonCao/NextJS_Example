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

// NEW: Batch presigned URL generation for performance optimization
export async function getBatchPresignedUrls(keys: string[]): Promise<{ [key: string]: string }> {
  try {
    const results: { [key: string]: string } = {};
    const keysToGenerate: string[] = [];
    
    // First, check Redis cache for all keys in parallel
    const cachePromises = keys.map(async (key) => {
      try {
        const cachedUrl = await getPresignedUrlRedis(key);
        if (cachedUrl) {
          results[key] = cachedUrl;
          return { key, cached: true };
        } else {
          keysToGenerate.push(key);
          return { key, cached: false };
        }
      } catch (error) {
        keysToGenerate.push(key);
        return { key, cached: false };
      }
    });
    
    await Promise.all(cachePromises);
    
    // Generate presigned URLs for keys not in cache, in parallel
    if (keysToGenerate.length > 0) {
      const generatePromises = keysToGenerate.map(async (key) => {
        try {
          const presignedUrl = await getPresignedGetUrl(key);
          results[key] = presignedUrl;
          
          // Cache the result (don't await, fire-and-forget)
          setPresignedUrlRedis(key, presignedUrl).catch(() => {});
          
          return { key, presignedUrl };
        } catch (error) {
          console.error(`Failed to generate presigned URL for ${key}:`, error);
          return { key, presignedUrl: null };
        }
      });
      
      await Promise.all(generatePromises);
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch presigned URL generation:', error);
    throw new Error('Failed to generate batch presigned URLs');
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