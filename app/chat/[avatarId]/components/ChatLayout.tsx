import React, { useState, useEffect } from 'react';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
}

export function ChatLayout({ children, className = '', backgroundImage }: ChatLayoutProps) {
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);

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

  return (
    <div className={`flex flex-row justify-center w-full min-h-screen relative ${className}`}>
      {/* Blurred background image - contained within window */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(20px) brightness(0.6)',
            zIndex: -1
          }}
        />
      )}
      
      {/* Content overlay with dynamic navbar spacing and centering adjustment */}
      <div className="w-full relative z-10">
        <main className={`flex flex-col w-full h-full items-center justify-center px-4 lg:px-0 transition-all duration-300 ${navbarCollapsed ? 'pl-8' : 'pl-32'}`}>
          <div className="flex flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-30px)] gap-0 py-[15px]" style={{ backgroundColor: 'transparent' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 