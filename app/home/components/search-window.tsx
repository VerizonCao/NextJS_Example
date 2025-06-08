'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadPaginatedPublicAvatarsAction } from '@/app/lib/actions';
import CharacterSearchTile from './character-search-tile';
import { getPresignedUrl } from '@/app/lib/actions';

interface SearchWindowProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  submittedSearchTerm: string;
  setLastClickedTag: (tag: string) => void;
}

export default function SearchWindow({ 
  isOpen, 
  onClose, 
  searchTerm,
  setSearchTerm,
  handleSearch,
  submittedSearchTerm,
  setLastClickedTag
}: SearchWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if clicking on the search bar (which has class 'search-input')
      if (windowRef.current && !windowRef.current.contains(event.target as Node) && 
          !(event.target as Element).closest('.search-input')) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Load search results when submittedSearchTerm changes
  useEffect(() => {
    async function loadSearchResults() {
      if (!submittedSearchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const result = await loadPaginatedPublicAvatarsAction(0, 10, submittedSearchTerm);
        
        if (result.success && result.avatars) {
          // Process avatars to add presigned URLs
          const processedAvatars = await Promise.all(
            result.avatars.map(async (avatar) => {
              if (!avatar.image_uri) return avatar;
              try {
                const { presignedUrl } = await getPresignedUrl(avatar.image_uri);
                return { ...avatar, presignedUrl };
              } catch (e) {
                console.error(`Failed to get presigned URL for ${avatar.avatar_id}`, e);
                return avatar;
              }
            })
          );
          
          // Deduplicate avatars by avatar_id to prevent duplicate keys
          const uniqueAvatars = processedAvatars.filter((avatar, index, array) => 
            array.findIndex(a => a.avatar_id === avatar.avatar_id) === index
          );
          
          setSearchResults(uniqueAvatars);
        }
      } catch (error) {
        console.error('Error loading search results:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadSearchResults();
  }, [submittedSearchTerm]);

  // Popular search tags
  const popularTags = [
    'Warrior', 'Monster', 'Magical', 'Cyberpunk', 'Fashion',
    'Travel', 'Guardian', 'Historical', 'Art', 'Music',
    'Beauty', 'Silence', 'Magic', 'Famous', 'Cool'
  ];

  if (!isOpen) return null;

  return (
    <div ref={windowRef} className="fixed right-[42px] top-[calc(24px+48px+24px+8px)] w-[600px] z-50">
      {/* Results Window */}
      <div className="rounded-[10px] bg-secondary-bg relative" style={{ background: 'rgba(37, 44, 52, 0.75)', overflow: 'hidden' }}>
        <div className="max-h-[min(668px,60vh)] min-h-[125px] overflow-y-auto bg-black/90 py-2 [scrollbar-gutter:stable]">
          <div className="m-2 pl-2">
            <div className="mb-4 text-left text-sm text-white">Popular Search</div>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchTerm(tag);
                    setLastClickedTag(tag);
                  }}
                  className="flex items-center border border-transparent transition duration-500 rounded-full border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.2)] px-3 py-1 text-xs text-[rgba(255,255,255,0.7)] text-[#847379]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {submittedSearchTerm && (
            <>
              <div className="scrollbar-none mb-1 mt-3 flex flex-none flex-row gap-4 overflow-x-auto border-b border-white/10 px-2.5">
                <div className="flex flex-1 flex-row gap-4">
                  <div className="min-w-[48px] flex-shrink-0">
                    <button className="flex items-center border border-transparent transition duration-500 mb-2.5 w-full justify-center p-0 text-[15px] text-white">
                      Characters
                    </button>
                    <div className="mx-auto h-[1.5px] w-[48px] bg-white"></div>
                  </div>
                  <div className="min-w-[48px] flex-shrink-0">
                    <button className="flex items-center border border-transparent transition duration-500 mb-2.5 w-full justify-center p-0 text-[15px] text-[#847379]">
                      Creators
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Search Results */}
              <div className="px-2">
                {isLoading ? (
                  <div className="text-white text-center p-4">Loading results...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((avatar) => (
                      <CharacterSearchTile
                        key={`search-${avatar.avatar_id}`}
                        avatar={avatar}
                        onClick={() => {
                          // Handle avatar selection
                          console.log('Selected avatar:', avatar);
                          onClose(); // Close the search window after selection
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-white text-center p-4">
                    No results found for: {submittedSearchTerm}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Top fade overlay */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/30 to-transparent pointer-events-none rounded-t-[10px]"></div>
        
        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none rounded-b-[10px]"></div>
      </div>
    </div>
  );
}
