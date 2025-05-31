import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { loadAvatar, getPresignedUrl } from '@/app/lib/actions';
import { Avatar, AvatarData, PageParams } from '../types/chat.types';

export function useAvatarData(params: Promise<PageParams>): AvatarData {
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAvatarData() {
      try {
        const resolvedParams = await params;
        
        const avatarResult = await loadAvatar(resolvedParams.avatarId);
        
        if (!avatarResult.success || !avatarResult.avatar) {
          notFound();
        }

        setAvatar(avatarResult.avatar);

        let url = '';
        if (avatarResult.avatar.image_uri) {
          try {
            const urlResult = await getPresignedUrl(avatarResult.avatar.image_uri);
            url = urlResult.presignedUrl;
          } catch (error) {
            console.error('Failed to get presigned URL:', error);
          }
        }
        setPresignedUrl(url);
      } catch (error) {
        console.error('Error loading avatar:', error);
        setError('Failed to load avatar');
      } finally {
        setIsLoading(false);
      }
    }

    loadAvatarData();
  }, [params]);

  return {
    avatar,
    presignedUrl,
    isLoading,
    error
  };
} 