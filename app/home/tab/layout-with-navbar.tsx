'use client';

import React from 'react';
import { useNavbar } from '@/app/lib/contexts/NavbarContext';

interface LayoutWithNavBarProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function LayoutWithNavBar({ children, className = '', contentClassName = '' }: LayoutWithNavBarProps) {
  const { isCollapsed: navbarCollapsed } = useNavbar();

  return (
    <div className={`w-full min-h-screen ${className}`}>
      {/* Main Content Container with dynamic left margin and smooth animation */}
      <div 
        className={`
          transition-all duration-300 ease-in-out transform
          ${navbarCollapsed ? 'ml-16' : 'ml-64'}
          ${contentClassName}
        `}
        style={{
          // Additional CSS custom properties for smoother animation
          transitionProperty: 'margin-left, transform',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Export hook for backward compatibility - now just uses the context
export function useNavbarState() {
  const { isCollapsed } = useNavbar();
  return isCollapsed;
} 