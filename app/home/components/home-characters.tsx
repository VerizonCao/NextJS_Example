'use client';

import React, { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  startStreamingSession, 
  incrementAvatarRequestCounter, 
  storeUserRoomAction, 
  deleteUserPreviousRoomAction, 
  hasUserThumbedAvatarAction, 
  removeAvatarThumbAction, 
  addAvatarThumbAction,
  loadPaginatedPublicAvatarsAction ,
  getPresignedUrl
} from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import AvatarPopup from '@/app/ui/rita/avatar-popup';
import LoginPopup from '@/app/ui/rita/login-popup';
import { Card } from '@/app/components/card';
import { X, AlertCircle, ThumbsUp, Loader2, SearchIcon, BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchWindow from './search-window';

type UserAvatar = {
  avatar_id: string;
  avatar_name: string;
  image_uri: string;
  create_time: Date;
  prompt: string;
  presignedUrl?: string;
  scene_prompt?: string;
  voice_id?: string;
  agent_bio?: string;
  thumb_count?: number;
  serve_time?: number;
};

interface HomeCharactersProps {
  initialAvatars: {
    success: boolean;
    avatars: UserAvatar[] | null;
    message: string;
  };
}

function WarningPopup({ 
  isOpen, 
  onClose, 
  currentCount, 
  maxCount 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentCount: number;
  maxCount: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1e] p-8 rounded-xl relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2 text-white"
          onClick={onClose}
        >
          <X size={24} />
        </Button>
        <h2 className="text-white text-2xl font-semibold mb-4 flex items-center">
          <AlertCircle className="text-yellow-500 mr-2" size={28} />
          Daily Limit Reached
        </h2>
        <p className="text-white text-lg mb-2">
          You have reached your daily limit of {maxCount} streaming sessions.
        </p>
        <p className="text-gray-400 text-sm">
          Your limit will reset tomorrow. Thank you for using our service!
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-4 gap-[5px]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamic grid calculation function
function calculateOptimalGrid(containerWidth: number, spacing: number = 5) {
  // Card aspect ratio (width/height) - based on original design
  const cardAspectRatio = 0.625;
  
  // Responsive base card width based on container size
  let baseCardWidth: number;
  if (containerWidth <= 1300) {
    baseCardWidth = 120;
  } else if (containerWidth <= 1700) {
    baseCardWidth = 160;
  } else if (containerWidth <= 2100) {
    baseCardWidth = 200;
  } else if (containerWidth <= 2700) {
    baseCardWidth = 240;
  } else {
    baseCardWidth = 300;
  }
  
  // Calculate rough number of cards that can fit using baseCardWidth + 15px margin
  const cardWithMargin = baseCardWidth + 15;
  const roughCardCount = containerWidth / cardWithMargin;
  const remainder = roughCardCount - Math.floor(roughCardCount);
  
  // Determine final card count based on remainder logic
  let finalCardCount: number;
  if (remainder < 0.9) {
    // Round down - accommodate fewer cards with larger size
    finalCardCount = Math.floor(roughCardCount);
  } else {
    // Round up - accommodate more cards with smaller size  
    finalCardCount = Math.ceil(roughCardCount);
  }
  
  // Ensure at least 1 card
  finalCardCount = Math.max(1, finalCardCount);
  
  // Calculate actual card width to fit exactly
  const availableWidth = containerWidth - (finalCardCount + 1) * spacing;
  const actualCardWidth = Math.floor(availableWidth / finalCardCount);
  const actualCardHeight = Math.round(actualCardWidth / cardAspectRatio);
  
  return {
    cardCount: finalCardCount,
    cardWidth: actualCardWidth,
    cardHeight: actualCardHeight
  };
}

export default function HomeCharacters({ initialAvatars }: HomeCharactersProps) {
  // ===== SPACING CONFIGURATION - MODIFY THESE VALUES =====
  const HORIZONTAL_SPACING = 15; // px - spacing between cards horizontally
  const VERTICAL_SPACING = 15;  // px - spacing between rows
  // ========================================================

  const router = useRouter();
  const [globalSelectedAvatar, setGlobalSelectedAvatar] = useState<{id: string | number, type: 'rita' | 'my'} | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [streamCount, setStreamCount] = useState({ current: 0, max: 6 });
  const { data: session } = useSession();
  const [avatarThumbCounts, setAvatarThumbCounts] = useState<Record<string, number>>({});
  
  // Navbar collapse state
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);
  
  // Tag system state
  const [activeMainTab, setActiveMainTab] = useState("recommend");
  const [activeCategoryTag, setActiveCategoryTag] = useState("Original Characters");
  
  // New state for pagination
  const [avatars, setAvatars] = useState<UserAvatar[]>(initialAvatars.avatars || []);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(initialAvatars.avatars?.length || 0);
  
  // Dynamic grid state
  const [gridConfig, setGridConfig] = useState({ cardCount: 1, cardWidth: 180, cardHeight: 320 });
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // Observer for infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null);
  const lastAvatarElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreAvatars();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);
  
  // Resize observer for dynamic grid calculation
  useEffect(() => {
    const updateGridConfig = () => {
      let containerWidth = 0;
      
      // Method 1: Try to get actual container width
      if (gridContainerRef.current) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        containerWidth = rect.width;
      }
      
      // Method 2: Fallback to calculated width based on window size
      if (containerWidth < 200) { // If container width is unreasonably small
        const navbarWidth = navbarCollapsed ? 64 : 256; // w-16 vs w-64 in Tailwind
        const padding = 24; // px-6 = 24px on each side
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        containerWidth = Math.max(300, windowWidth - navbarWidth - (padding * 2));
      }
      
      // Method 3: Absolute fallback
      if (containerWidth < 200) {
        containerWidth = 800; // Reasonable default
      }
      
      const newConfig = calculateOptimalGrid(containerWidth, HORIZONTAL_SPACING);
      setGridConfig(newConfig);
    };
    
    // Initial calculation with retry mechanism
    const initialUpdate = () => {
      updateGridConfig();
      
      // Retry after a short delay if container width seems incorrect
      setTimeout(() => {
        if (gridContainerRef.current) {
          const rect = gridContainerRef.current.getBoundingClientRect();
          if (rect.width > 200) { // If we now have a proper width
            updateGridConfig();
          }
        }
      }, 100);
    };
    
    // Run initial calculation
    initialUpdate();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure layout is stable
      requestAnimationFrame(updateGridConfig);
    });
    
    if (gridContainerRef.current) {
      resizeObserver.observe(gridContainerRef.current);
    }
    
    // Also listen to window resize as backup
    const handleWindowResize = () => {
      setTimeout(updateGridConfig, 50);
    };
    
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [HORIZONTAL_SPACING, navbarCollapsed]);
  
  // Function to load more avatars
  const loadMoreAvatars = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const result = await loadPaginatedPublicAvatarsAction(offset);
      
      if (result.success && result.avatars && result.avatars.length > 0) {
        // Process the new avatars to add presigned URLs
        const processedAvatars = await Promise.all(
          result.avatars.map(async (avatar) => {
            if (!avatar.image_uri) return avatar;
            try {
              const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
              return { 
                ...avatar,
                create_time: new Date(avatar.create_time),
                presignedUrl 
              };
            } catch (e) {
              console.error(`Failed to get presigned URL for ${avatar.avatar_id}`, e);
              return avatar;
            }
          })
        );
        
        // Update avatars state with new avatars
        setAvatars(prev => [...prev, ...processedAvatars]);
        
        // Update thumb counts
        const newThumbCounts = { ...avatarThumbCounts };
        processedAvatars.forEach(avatar => {
          newThumbCounts[avatar.avatar_id] = avatar.thumb_count || 0;
        });
        setAvatarThumbCounts(newThumbCounts);
        
        // Update offset for next load
        setOffset(prev => prev + processedAvatars.length);
        
        // Check if there are more avatars to load
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more avatars:', error);
    } finally {
      setIsLoading(false);
    }
  };
 
  // Initialize thumb counts from initialAvatars
  useEffect(() => {
    if (initialAvatars.avatars) {
      const thumbs: Record<string, number> = {};
      initialAvatars.avatars.forEach(avatar => {
        thumbs[avatar.avatar_id] = avatar.thumb_count || 0;
      });
      setAvatarThumbCounts(thumbs);
    }
  }, [initialAvatars.avatars]);

  const handleStream = async (avatarId: string) => {
    if (!session) {
      setShowLoginPopup(true);
      return;
    }

    const roomName = generateRoomId();
    const avatar = initialAvatars.avatars?.find(a => a.avatar_id === avatarId);
    
    if (!avatar) return;
    
    // Delete any previous room for this user
    if (session?.user?.email) {
      deleteUserPreviousRoomAction(session.user.email, roomName);
    }

    try {
      const response = await startStreamingSession({
        instruction: "test",
        seconds: 600,
        room: roomName,
        avatarSource: avatar.image_uri,
        avatar_id: avatar.avatar_id,
        llmUserNickname: session?.user?.name || 'Friend',
        llmUserBio: 'a friend',
        llmAssistantNickname: avatar.avatar_name,
        llmAssistantBio: avatar.prompt,
        llmAssistantAdditionalCharacteristics: avatar.prompt,
        llmConversationContext: avatar.scene_prompt,
        ttsVoiceIdCartesia: avatar.voice_id,
        userEmail: session?.user?.email || '',
      });

      // Store the room ID for this user
      if (session?.user?.email) {
        storeUserRoomAction(session.user.email, roomName);
      }

      if (!response.success && response.error === 'LIMIT_REACHED') {
        setStreamCount({ current: response.currentCount, max: response.maxCount });
        setShowWarningPopup(true);
        return;
      }

      await incrementAvatarRequestCounter(avatarId);
      const returnPath = '/';
      const presignedUrl = avatar.presignedUrl || '';

      const query = new URLSearchParams({
        returnPath,
        presignedUrl,
        prompt: avatar.prompt || '',
        scene: avatar.scene_prompt || '',
        bio: avatar.agent_bio || '',
        avatar_name: avatar.avatar_name || '',
        avatar_id: avatar.avatar_id || '',
      }).toString();

      router.push(`/rooms/${roomName}?${query}`);
    } catch (error) {
      console.error('Failed to start streaming session:', error);
    }
  };

  const selectedAvatar = avatars.find(avatar => 
    globalSelectedAvatar?.id === avatar.avatar_id && 
    globalSelectedAvatar?.type === 'rita'
  );

  // Listen for navbar collapse state changes
  useEffect(() => {
    const checkNavbarState = () => {
      // Check if navbar is collapsed by measuring its width
      const navbar = document.querySelector('nav');
      if (navbar) {
        const isCollapsed = navbar.offsetWidth <= 80; // 16 * 4 + padding = ~64-80px
        setNavbarCollapsed(isCollapsed);
      }
    };
    
    // Initial check
    checkNavbarState();
    
    // Set up observer to watch for navbar width changes
    const observer = new MutationObserver(checkNavbarState);
    const navbar = document.querySelector('nav');
    if (navbar) {
      observer.observe(navbar, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Also listen for transition end events
    const handleTransition = () => setTimeout(checkNavbarState, 50);
    navbar?.addEventListener('transitionend', handleTransition);
    
    return () => {
      observer.disconnect();
      navbar?.removeEventListener('transitionend', handleTransition);
    };
  }, []);

  const [showSearchWindow, setShowSearchWindow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const [lastClickedTag, setLastClickedTag] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search is opened
  useEffect(() => {
    if (showSearchWindow && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchWindow]);

  // Effect to handle immediate search when tag is clicked
  useEffect(() => {
    if (lastClickedTag) {
      setSubmittedSearchTerm(lastClickedTag);
      setLastClickedTag(''); // Reset after handling
    }
  }, [lastClickedTag]);

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm.trim()) return;
    // Don't trigger debounce if the search term was just set by a tag click
    if (searchTerm === submittedSearchTerm) {
      return;
    }

    const timer = setTimeout(() => {
      setSubmittedSearchTerm(searchTerm);
      handleSearch();
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm, submittedSearchTerm]);

  // Handle search logic
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setSubmittedSearchTerm(searchTerm);
    }
  };

  // Handle input changes with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      handleSearch();
    }
  };

  // Handle search window close
  const handleSearchClose = () => {
    setShowSearchWindow(false);
    // Only reset search term if clicking outside both search bar and window
    if (!(document.activeElement as HTMLElement)?.closest('.search-input')) {
      setSearchTerm('');
      setSubmittedSearchTerm('');
      setLastClickedTag('');
    }
  };

  if (!initialAvatars.success || !initialAvatars.avatars) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Explore Rita Avatars</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {initialAvatars.message}
        </div>
      </div>
    );
  }

  // Define category data
  const categories = [
    { name: "Original Characters", active: activeCategoryTag === "Original Characters" },
    { name: "Fan Made", active: activeCategoryTag === "Fan Made" },
    { name: "Fictional", active: activeCategoryTag === "Fictional" },
    { name: "Realistic", active: activeCategoryTag === "Realistic" },
    { name: "Anime", active: activeCategoryTag === "Anime" },
    { name: "Film", active: activeCategoryTag === "Film" },
    { name: "Game", active: activeCategoryTag === "Game" },
    { name: "Historical", active: activeCategoryTag === "Historical" },
  ];

  return (
    <Suspense fallback={<LoadingState />}>
      <div className="bg-[#111C28] min-h-screen w-full">
        {/* Main Content Wrapper with dynamic left padding */}
        <div className={`transition-all duration-300 ${navbarCollapsed ? 'pl-16' : 'pl-64'}`}>
          {/* Header Section with Tags */}
          <header className="relative bg-[#111C28] py-6 px-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {/* Main Tab Group */}
              <div className="flex items-center gap-2">
                {["recommend", "trending", "latest"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMainTab(tab)}
                    className={`px-6 py-3.5 rounded-[100px] font-medium text-white text-base transition-all duration-200 ${
                      activeMainTab === tab
                        ? "bg-[#00000033] shadow-[0px_0px_10px_#ffffff40]"
                        : "hover:bg-[#ffffff1a]"
                    }`}
                  >
                    <span className="font-['Montserrat',Helvetica] capitalize">
                      {tab}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search and Notification Buttons */}
              <div className="flex items-center gap-[18px]">
                <div className="relative ml-3 flex w-[552px] justify-end">
                  <div className={`flex h-12 min-w-[48px] cursor-pointer justify-end rounded-full bg-[#00000033] transition-all duration-300 ${showSearchWindow ? 'flex-1 border-white' : 'hover:border-hover-border'}`}>
                    <div className="pointer-events-auto flex h-full items-center justify-center text-2xl w-12">
                      <SearchIcon 
                        className={`w-5 h-5 ${showSearchWindow ? 'text-[rgba(255,255,255,0.3)]' : 'text-white'}`}
                        onClick={() => setShowSearchWindow(true)}
                      />
                    </div>
                    {showSearchWindow && (
                      <div className="pointer-events-auto flex-1">
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchTerm}
                          onChange={handleInputChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSearch();
                            }
                          }}
                          placeholder="Search characters"
                          className="search-input h-full w-full pl-1.5 text-sm text-white bg-transparent outline-none placeholder:text-[rgba(255,255,255,0.3)]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 bg-[#00000033] rounded-3xl text-white hover:bg-[#ffffff1a]"
                  aria-label="Notifications"
                >
                  <BellIcon className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Category Tags */}
            <div className="flex items-center gap-2 px-2 py-2 overflow-x-auto">
              {categories.map((category, index) => (
                <button
                  key={`${category.name}-${index}`}
                  onClick={() => setActiveCategoryTag(category.name)}
                  className={`px-6 py-2 rounded-[100px] cursor-pointer hover:bg-[#ffffff33] transition-colors flex-shrink-0 ${
                    category.active
                      ? "bg-[#ffffff1a] shadow-[0px_0px_10px_#ffffff40]"
                      : "bg-[#00000033] border-transparent"
                  }`}
                >
                  <span className="[font-family:'Montserrat',Helvetica] font-medium text-white text-base">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </header>

          {/* Character Grid Section */}
          <div className="pb-6">
            <div className="flex flex-col gap-6">
              {/* Character Grid */}
              <div className="px-6">
                <div 
                  ref={gridContainerRef}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: `${VERTICAL_SPACING}px` 
                  }}
                >
                  {/* Render avatars in rows */}
                  {Array.from({ length: Math.ceil(avatars.length / gridConfig.cardCount) }, (_, rowIndex) => {
                    const startIndex = rowIndex * gridConfig.cardCount;
                    const endIndex = Math.min(startIndex + gridConfig.cardCount, avatars.length);
                    const rowAvatars = avatars.slice(startIndex, endIndex);
                    
                    return (
                      <div 
                        key={rowIndex}
                        className="flex"
                        style={{
                          gap: `${HORIZONTAL_SPACING}px`,
                          paddingLeft: `${HORIZONTAL_SPACING}px`,
                          paddingRight: `${HORIZONTAL_SPACING}px`
                        }}
                      >
                        {rowAvatars.map((avatar, colIndex) => {
                          const avatarIndex = startIndex + colIndex;
                          const isLastElement = avatarIndex === avatars.length - 1;
                          
                          return (
                            <Card
                              key={avatar.avatar_id}
                              ref={isLastElement ? lastAvatarElementRef : undefined}
                              className="relative rounded-[13.79px] overflow-hidden shadow-[0px_0px_9.5px_#ffffff40] border-0 transition-transform duration-300 ease-in-out cursor-pointer"
                              style={{ 
                                width: `${gridConfig.cardWidth}px`,
                                height: `${gridConfig.cardHeight}px`,
                                flexShrink: 0
                              }}
                              onClick={() => setGlobalSelectedAvatar(globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita' ? null : {id: avatar.avatar_id, type: 'rita'})}
                              showThumbCount={false}
                            >
                              {avatar.presignedUrl && (
                                <>
                                  <img
                                    src={avatar.presignedUrl}
                                    alt={avatar.avatar_name}
                                    className="object-cover w-full h-full"
                                    loading={globalSelectedAvatar?.id === avatar.avatar_id && globalSelectedAvatar?.type === 'rita' ? 'eager' : 'lazy'}
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
                                      <p className="w-full font-['Montserrat',Helvetica] font-normal text-white/70 text-[9.2px] leading-normal truncate mb-1">
                                        by Creator
                                      </p>
                                      <p className="w-full font-['Montserrat',Helvetica] font-normal text-white text-[9.2px] leading-normal overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                        {avatar.agent_bio || avatar.prompt}
                                      </p>
                                      
                                      {/* Thumb count positioned on the right */}
                                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-1">
                                        <ThumbsUp size={12} className="text-gray-300" />
                                        <span className="text-xs text-white font-medium">
                                          {avatarThumbCounts[avatar.avatar_id] || '0'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="w-full flex justify-center py-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                    <span className="text-white">Loading more characters...</span>
                  </div>
                </div>
              )}
              
              {/* End of results message */}
              {!hasMore && !isLoading && avatars.length > 0 && (
                <div className="w-full text-center py-4 text-gray-400">
                  No more characters to load
                </div>
              )}
            </div>
          </div>
        </div>

        <AvatarPopup
          avatar={selectedAvatar ? {
            avatar_id: selectedAvatar.avatar_id,
            avatar_name: selectedAvatar.avatar_name,
            image_uri: selectedAvatar.image_uri,
            create_time: selectedAvatar.create_time,
            prompt: selectedAvatar.prompt,
            agent_bio: selectedAvatar.agent_bio,
            presignedUrl: selectedAvatar.presignedUrl,
            scene_prompt: selectedAvatar.scene_prompt,
            voice_id: selectedAvatar.voice_id,
            thumb_count: avatarThumbCounts[selectedAvatar.avatar_id] || selectedAvatar.thumb_count || 0,
          } : null}
          onStream={() => selectedAvatar && handleStream(selectedAvatar.avatar_id)}
          onClose={() => setGlobalSelectedAvatar(null)}
        />

        <LoginPopup 
          isOpen={showLoginPopup} 
          onClose={() => setShowLoginPopup(false)} 
        />

        <WarningPopup
          isOpen={showWarningPopup}
          onClose={() => setShowWarningPopup(false)}
          currentCount={streamCount.current}
          maxCount={streamCount.max}
        />

        <SearchWindow 
          isOpen={showSearchWindow}
          onClose={handleSearchClose}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleSearch={handleSearch}
          submittedSearchTerm={submittedSearchTerm}
          setLastClickedTag={setLastClickedTag}
        />
      </div>
    </Suspense>
  );
} 