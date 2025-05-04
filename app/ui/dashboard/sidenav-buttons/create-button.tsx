'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoginPopup from '@/app/ui/rita/login-popup';

type NavButton = {
  label: string;
  href: string;
  className: string;
  icon?: React.ReactNode;
};

export default function CreateButton({ button }: { button: NavButton }) {
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.refresh();
    }
  }, [status, router]);

  const handleClick = () => {
    if (!session) {
      setShowLoginPopup(true);
      return;
    }
    router.push(button.href);
  };

  return (
    <>
      <button
        onClick={handleClick}
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