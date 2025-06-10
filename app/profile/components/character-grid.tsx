'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { loadPaginatedUserAvatarsActionOptimized } from '@/app/lib/actions';
import { Card } from '@/app/components/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

type UserAvatar = {
  avatar_id: string;
  avatar_name: string;
  image_uri: string | null;
  create_time: Date;
  prompt: string;
  presignedUrl?: string;
  scene_prompt?: string;
  voice_id?: string;
  agent_bio?: string;
  thumb_count?: number;
  serve_time?: number;
  is_public?: boolean;
};

interface CharacterGridProps {
  userEmail: string;
}

// Modified grid calculation for 6 cards per row
function calculateOptimalGrid(containerWidth: number, spacing: number = 15) {
  const cardAspectRatio = 0.625;
  const targetColumns = 6; // Fixed at 6 columns
  
  const cardWithMargin = (containerWidth - (targetColumns + 1) * spacing) / targetColumns;
  const actualCardWidth = Math.floor(cardWithMargin);
  const actualCardHeight = Math.round(actualCardWidth / cardAspectRatio);
  
  return {
    cardCount: targetColumns,
    cardWidth: actualCardWidth,
    cardHeight: actualCardHeight
  };
}

export default function CharacterGrid({ userEmail }: CharacterGridProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'private' | 'public'>('private');
  
  // Avatar states
  const [privateAvatars, setPrivateAvatars] = useState<UserAvatar[]>([]);
  const [publicAvatars, setPublicAvatars] = useState<UserAvatar[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [hasMorePrivate, setHasMorePrivate] = useState(true);
  const [hasMorePublic, setHasMorePublic] = useState(true);
  
  // Pagination offsets
  const [privateOffset, setPrivateOffset] = useState(0);
  const [publicOffset, setPublicOffset] = useState(0);
  
  // Dynamic grid state
  const [gridConfig, setGridConfig] = useState({ cardCount: 6, cardWidth: 180, cardHeight: 320 });
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver>();
  
  // Grid sizing
  const HORIZONTAL_SPACING = 15;
  const VERTICAL_SPACING = 15;

  // Calculate and update grid configuration
  const updateGridConfig = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newConfig = calculateOptimalGrid(containerWidth, HORIZONTAL_SPACING);
      setGridConfig(newConfig);
    }
  };

  const loadInitialAvatars = useCallback(async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    try {
      // Load both private and public avatars initially
      const [privateResult, publicResult] = await Promise.all([
        loadPaginatedUserAvatarsActionOptimized(userEmail, 0, 30, false),
        loadPaginatedUserAvatarsActionOptimized(userEmail, 0, 30, true)
      ]);
      
      if (privateResult.success && privateResult.avatars) {
        const processedPrivate = privateResult.avatars.map((avatar: any) => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        setPrivateAvatars(processedPrivate);
        setHasMorePrivate(privateResult.hasMore);
        setPrivateOffset(processedPrivate.length);
      }
      
      if (publicResult.success && publicResult.avatars) {
        const processedPublic = publicResult.avatars.map((avatar: any) => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        setPublicAvatars(processedPublic);
        setHasMorePublic(publicResult.hasMore);
        setPublicOffset(processedPublic.length);
      }
    } catch (error) {
      console.error('Error loading initial avatars:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // Initialize grid config
  useEffect(() => {
    const initialUpdate = () => {
      if (containerRef.current) {
        updateGridConfig();
      } else {
        // Retry after a short delay if container isn't ready
        setTimeout(initialUpdate, 100);
      }
    };
    initialUpdate();
    
    const handleWindowResize = () => {
      updateGridConfig();
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Load initial avatars
  useEffect(() => {
    loadInitialAvatars();
  }, [loadInitialAvatars]);

  const loadMoreAvatars = async () => {
    if (isLoading) return;
    
    const isPrivateTab = activeTab === 'private';
    const hasMore = isPrivateTab ? hasMorePrivate : hasMorePublic;
    const offset = isPrivateTab ? privateOffset : publicOffset;
    
    if (!hasMore) return;
    
    setIsLoading(true);
    try {
      const result = await loadPaginatedUserAvatarsActionOptimized(
        userEmail, 
        offset, 
        30, 
        !isPrivateTab
      );
      
      if (result.success && result.avatars && result.avatars.length > 0) {
        const processedAvatars = result.avatars.map((avatar: any) => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        
        if (isPrivateTab) {
          setPrivateAvatars(prev => [...prev, ...processedAvatars]);
          setPrivateOffset(prev => prev + processedAvatars.length);
          setHasMorePrivate(result.hasMore);
        } else {
          setPublicAvatars(prev => [...prev, ...processedAvatars]);
          setPublicOffset(prev => prev + processedAvatars.length);
          setHasMorePublic(result.hasMore);
        }
      } else {
        if (isPrivateTab) {
          setHasMorePrivate(false);
        } else {
          setHasMorePublic(false);
        }
      }
    } catch (error) {
      console.error('Error loading more avatars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Infinite scroll
  const lastAvatarElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMoreAvatars();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, activeTab, hasMorePrivate, hasMorePublic, loadMoreAvatars]);

  const handleCardClick = (avatar: UserAvatar) => {
    if (!session) return;
    router.push(`/chat/${avatar.avatar_id}`);
  };

  const currentAvatars = activeTab === 'private' ? privateAvatars : publicAvatars;
  const hasMore = activeTab === 'private' ? hasMorePrivate : hasMorePublic;

  return (
    <div className="w-full">
      {/* Compact Tab Headers - Left Aligned */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('private')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'private'
              ? 'bg-[#5856d6] text-white'
              : 'bg-[#2a2a2e] text-gray-400 hover:text-gray-300 hover:bg-[#3a3a3e]'
          }`}
          title="Only visible to you"
        >
          <EyeOff size={14} />
          <span>Private</span>
        </button>
        <button
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'public'
              ? 'bg-[#5856d6] text-white'
              : 'bg-[#2a2a2e] text-gray-400 hover:text-gray-300 hover:bg-[#3a3a3e]'
          }`}
          title="Everyone can see it"
        >
          <Eye size={14} />
          <span>Public</span>
        </button>
      </div>

      {/* Grid Container */}
      <div 
        ref={containerRef}
        className="w-full"
      >
        {currentAvatars.length > 0 ? (
          <div 
            className="grid gap-[15px]"
            style={{
              gridTemplateColumns: `repeat(${gridConfig.cardCount}, 1fr)`
            }}
          >
            {currentAvatars.map((avatar, index) => {
              const isLast = index === currentAvatars.length - 1;
              return (
                <Card
                  key={avatar.avatar_id}
                  ref={isLast && hasMore ? lastAvatarElementRef : null}
                  className="relative rounded-[13.79px] overflow-hidden shadow-[0px_0px_9.5px_#ffffff40] border-0 transition-transform duration-300 ease-in-out cursor-pointer hover:scale-[1.02]"
                  style={{ 
                    width: `${gridConfig.cardWidth}px`,
                    height: `${gridConfig.cardHeight}px`,
                    flexShrink: 0
                  }}
                  onClick={() => handleCardClick(avatar)}
                  showThumbCount={false}
                >
                  {avatar.presignedUrl && (
                    <>
                      <img
                        src={avatar.presignedUrl}
                        alt={avatar.avatar_name}
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                      {/* Character info overlay - positioned at the bottom */}
                      <div className="absolute bottom-0 w-full">
                        {/* Fade to black gradient overlay */}
                        <div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"></div>
                        
                        {/* Character text with proper padding */}
                        <div className="relative p-3 z-20">
                          <h3 className="w-full font-['Montserrat',Helvetica] font-semibold text-white text-[13.8px] leading-normal truncate mb-1">
                            {avatar.avatar_name}
                          </h3>
                          <p className="self-stretch font-['Montserrat',Helvetica] font-normal text-neutral-300 text-xs leading-snug overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                            {avatar.agent_bio || avatar.prompt}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        ) : isLoading ? (
          <div className="grid gap-[15px]" style={{ gridTemplateColumns: `repeat(${gridConfig.cardCount}, 1fr)` }}>
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="bg-gray-700 rounded-[13.79px] animate-pulse"
                style={{
                  width: gridConfig.cardWidth,
                  height: gridConfig.cardHeight
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="text-gray-400 text-center">
              <p className="text-lg mb-2">
                No {activeTab} characters found
              </p>
              <p className="text-sm">
                {activeTab === 'private' 
                  ? 'Create your first private character to get started!' 
                  : 'Make some of your characters public to share them with others!'}
              </p>
            </div>
          </div>
        )}
        
        {/* Loading indicator for pagination */}
        {isLoading && currentAvatars.length > 0 && (
          <div className="flex justify-center mt-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
} 