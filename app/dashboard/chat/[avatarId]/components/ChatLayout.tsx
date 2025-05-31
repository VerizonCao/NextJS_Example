import React from 'react';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatLayout({ children, className = '' }: ChatLayoutProps) {
  return (
    <div className={`flex flex-row justify-center w-full ${className}`}>
      <div className="w-full relative">
        <main className="flex flex-col w-full h-full items-center justify-center px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] h-[calc(100vh-80px)] gap-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 