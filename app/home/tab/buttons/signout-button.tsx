'use client';

import { signOut } from 'next-auth/react';
import { PowerIcon } from 'lucide-react';

type SignOutButtonProps = {
  className: string;
};

export default function SignOutButton({ className }: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/'
    });
  };

  return (
    <button
      onClick={handleSignOut}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${className}`}
    >
      <PowerIcon className="w-6" />
      Sign Out
    </button>
  );
}