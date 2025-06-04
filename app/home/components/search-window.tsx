'use client';

import React, { useEffect, useRef } from 'react';

interface SearchWindowProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
}

export default function SearchWindow({ 
  isOpen, 
  onClose, 
  searchTerm,
  setSearchTerm,
  handleSearch
}: SearchWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (windowRef.current && !windowRef.current.contains(event.target as Node)) {
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

  // Popular search tags
  const popularTags = [
    'Sex', 'Mom', '18+', 'horny', 'Femboy', 'Rape', 'Bully', 'Sister',
    'Milf', 'Daddy', 'Yandere', 'Furry', 'Gay', 'Femdom', 'Babysitter'
  ];

  if (!isOpen) return null;

  return (
    <div ref={windowRef} className="absolute right-4 top-[calc(60px+36px)] w-[600px] z-50">
      {/* Results Window */}
      <div className="rounded-[10px] border border-secondary-border bg-secondary-bg" style={{ background: 'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(87, 47, 102, 0.6) 50%, rgba(29, 21, 21, 0.6) 100%)', overflow: 'hidden' }}>
        <div className="max-h-[min(668px,60vh)] min-h-[125px] overflow-y-auto bg-black/30 py-2 [scrollbar-gutter:stable]">
          <div className="m-2 pl-2">
            <div className="mb-4 text-left text-sm">Popular Search</div>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchTerm(tag);
                    handleSearch();
                  }}
                  className="flex items-center border border-transparent transition duration-500 rounded-full border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.2)] px-3 py-1 text-xs text-[rgba(255,255,255,0.7)] text-[#847379]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {searchTerm && (
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
              <div className="text-white text-center p-4">
                Search results for: {searchTerm}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
