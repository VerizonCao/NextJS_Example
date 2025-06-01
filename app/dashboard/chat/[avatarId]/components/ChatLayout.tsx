import React from 'react';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
}

export function ChatLayout({ children, className = '', backgroundImage }: ChatLayoutProps) {
  return (
    <div className={`flex flex-row justify-center w-full min-h-screen relative ${className}`}>
      {/* Blurred background image */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(20px) brightness(0.8)',
            transform: 'scale(1.1)', // Slightly scale to avoid blur edge artifacts
            zIndex: -1
          }}
        />
      )}
      
      {/* Content overlay */}
      <div className="w-full relative z-10">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-174px)] gap-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 