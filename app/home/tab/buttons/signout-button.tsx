'use client';

import { signOut } from 'next-auth/react';
import { LogOutIcon } from 'lucide-react';

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
      className={className}
    >
      <LogOutIcon className="mr-2 h-4 w-4 text-red-400" />
      <span className="text-red-400">Logout</span>
    </button>
  );
}