'use client';

import { useState } from 'react';
import LoginPopup from '@/app/ui/rita/login-popup';

type NavButton = {
  label: string;
  className: string;
  icon?: React.ReactNode;
};

export default function AuthButton({ button }: { button: NavButton }) {
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowLoginPopup(true)}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${button.className}`}
      >
        {button.icon && <span className="mr-2">{button.icon}</span>}
        {button.label}
      </button>

      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
      />
    </>
  );
}
