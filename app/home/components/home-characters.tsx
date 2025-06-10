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
  loadPaginatedPublicAvatarsActionOptimized
} from '@/app/lib/actions';
import { generateRoomId } from '@/lib/client-utils';
import { useSession } from 'next-auth/react';
import LoginPopup from '@/app/ui/rita/login-popup';
import { Card } from '@/app/components/card';
import { X, AlertCircle, ThumbsUp, Loader2, SearchIcon, BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchWindow from './search-window';
import { useHomePageRefresh } from '@/app/lib/hooks/useHomePageRefresh';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import CharacterSearchTile from './character-search-tile';

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
  v1_score?: number;
  gender?: string;
  style?: string;
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
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [streamCount, setStreamCount] = useState({ current: 0, max: 6 });
  const { data: session } = useSession();
  const [avatarThumbCounts, setAvatarThumbCounts] = useState<Record<string, number>>({});
  
  // Trigger chat history refresh when home page is visited
  useHomePageRefresh();
  
  // Navbar collapse state
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);
  
  // Tag system state - Updated to Trending / Latest
  const [activeMainTab, setActiveMainTab] = useState("trending");
  
  // New state for sorting
  const [currentSortBy, setCurrentSortBy] = useState<'score' | 'time'>('score');
  
  // Filter states
  const [styleFilter, setStyleFilter] = useState<'all' | 'stylized' | 'realistic'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'non-binary'>('all');
  
  // Search states
  const [showSearchWindow, setShowSearchWindow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const [lastClickedTag, setLastClickedTag] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Function to load more avatars - Updated to use current sort and filters with performance tracking
  const loadMoreAvatars = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const result = await loadPaginatedPublicAvatarsActionOptimized(offset, 20, '', currentSortBy, styleFilter, genderFilter);
      
      if (result.success && result.avatars && result.avatars.length > 0) {
        // No need to process presigned URLs - they're already included in the optimized action
        const processedAvatars = result.avatars.map(avatar => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        
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

  const handleCardClick = (avatar: UserAvatar) => {
    if (!session) {
      setShowLoginPopup(true);
      return;
    }
    // Navigate directly to chat page
    router.push(`/chat/${avatar.avatar_id}`);
  };

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

  // Function to handle tab changes and reload data
  const handleTabChange = async (tab: string) => {
    setActiveMainTab(tab);
    const newSortBy: 'score' | 'time' = tab === 'trending' ? 'score' : 'time';
    setCurrentSortBy(newSortBy);
    
    // Reset pagination state
    setOffset(0);
    setHasMore(true);
    setIsLoading(true);
    
    try {
      const result = await loadPaginatedPublicAvatarsActionOptimized(0, 20, '', newSortBy, styleFilter, genderFilter);
      
      if (result.success && result.avatars) {
        // No need to process presigned URLs - they're already included in the optimized action
        const processedAvatars = result.avatars.map(avatar => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        
        // Replace avatars with new sorted list
        setAvatars(processedAvatars);
        
        // Update thumb counts
        const newThumbCounts: Record<string, number> = {};
        processedAvatars.forEach(avatar => {
          newThumbCounts[avatar.avatar_id] = avatar.thumb_count || 0;
        });
        setAvatarThumbCounts(newThumbCounts);
        
        // Update offset for next load
        setOffset(processedAvatars.length);
        
        // Check if there are more avatars to load
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Error loading avatars with new sort:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle style filter change - reload data with new filter
  const handleStyleFilterChange = async (newStyle: typeof styleFilter) => {
    setStyleFilter(newStyle);
    
    // Reset pagination and reload data
    setOffset(0);
    setHasMore(true);
    setIsLoading(true);
    
    try {
      const result = await loadPaginatedPublicAvatarsActionOptimized(0, 20, '', currentSortBy, newStyle, genderFilter);
      
      if (result.success && result.avatars) {
        // No need to process presigned URLs - they're already included in the optimized action
        const processedAvatars = result.avatars.map((avatar: any) => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        
        // Replace avatars with filtered list
        setAvatars(processedAvatars);
        
        // Update thumb counts
        const newThumbCounts: Record<string, number> = {};
        processedAvatars.forEach(avatar => {
          newThumbCounts[avatar.avatar_id] = avatar.thumb_count || 0;
        });
        setAvatarThumbCounts(newThumbCounts);
        
        // Update offset for next load
        setOffset(processedAvatars.length);
        
        // Check if there are more avatars to load
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Error loading avatars with new style filter:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle gender filter change - reload data with new filter
  const handleGenderFilterChange = async (newGender: typeof genderFilter) => {
    setGenderFilter(newGender);
    
    // Reset pagination and reload data
    setOffset(0);
    setHasMore(true);
    setIsLoading(true);
    
    try {
      const result = await loadPaginatedPublicAvatarsActionOptimized(0, 20, '', currentSortBy, styleFilter, newGender);
      
      if (result.success && result.avatars) {
        // No need to process presigned URLs - they're already included in the optimized action
        const processedAvatars = result.avatars.map((avatar: any) => ({
          ...avatar,
          create_time: new Date(avatar.create_time)
        }));
        
        // Replace avatars with filtered list
        setAvatars(processedAvatars);
        
        // Update thumb counts
        const newThumbCounts: Record<string, number> = {};
        processedAvatars.forEach(avatar => {
          newThumbCounts[avatar.avatar_id] = avatar.thumb_count || 0;
        });
        setAvatarThumbCounts(newThumbCounts);
        
        // Update offset for next load
        setOffset(processedAvatars.length);
        
        // Check if there are more avatars to load
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Error loading avatars with new gender filter:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <Suspense fallback={<LoadingState />}>
      <div className="bg-[#121214] min-h-screen w-full">
        {/* Main Content Wrapper with dynamic left padding */}
        <div className={`transition-all duration-300 ${navbarCollapsed ? 'pl-16' : 'pl-64'}`}>
          {/* Header Section with Tags */}
          <header className="relative bg-[#121214] py-6 px-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {/* Main Tab Group */}
              <div className="flex items-center gap-2">
                {["trending", "latest"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-6 py-3.5 rounded-[100px] font-medium text-white text-base transition-all duration-200 ${
                      activeMainTab === tab
                        ? "bg-[#00000033] shadow-[0px_0px_10px_#ffffff40]"
                        : "hover:bg-[#ffffff1a]"
                    }`}
                  >
                    <span className="font-['Montserrat',Helvetica]">
                      {tab === 'latest' ? 'Latest' : 'Trending'}
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
            
            {/* Filter Section */}
            <div className="flex items-center gap-3 mt-2">
              {/* Style Filter */}
              <div className="flex items-center gap-2">
                {["all", "stylized", "realistic"].map((style) => (
                  <button
                    key={style}
                    onClick={() => handleStyleFilterChange(style as typeof styleFilter)}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                      styleFilter === style
                        ? "bg-[#ffffff1a] text-white shadow-[0px_0px_5px_#ffffff20]"
                        : "text-gray-400 hover:text-white hover:bg-[#ffffff0a]"
                    }`}
                  >
                    <span className="font-['Montserrat',Helvetica] capitalize">
                      {style}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Gender Filter Dropdown */}
              <div className="relative">
                <select
                  value={genderFilter}
                  onChange={(e) => handleGenderFilterChange(e.target.value as typeof genderFilter)}
                  className="px-4 py-2 rounded-full bg-[#ffffff1a] text-white text-sm font-medium border-0 outline-none cursor-pointer font-['Montserrat',Helvetica] hover:bg-[#ffffff2a] focus:bg-[#ffffff2a] transition-all duration-200"
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px',
                    paddingRight: '32px'
                  }}
                >
                  <option value="all" className="bg-[#1a1a1e] text-white">All</option>
                  <option value="male" className="bg-[#1a1a1e] text-white">Male</option>
                  <option value="female" className="bg-[#1a1a1e] text-white">Female</option>
                  <option value="non-binary" className="bg-[#1a1a1e] text-white">Non-binary</option>
                </select>
              </div>
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