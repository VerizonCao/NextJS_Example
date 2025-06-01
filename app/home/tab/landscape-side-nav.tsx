'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HomeIcon, PlusSquareIcon, UserIcon } from 'lucide-react';
import { auth } from '@/auth';
import CreateButton from '@/app/home/tab/buttons/create-button';
import AuthButton from '@/app/home/tab/buttons/auth-button';
import SignOutButton from '@/app/home/tab/buttons/signout-button';
import StatusBar from '@/app/home/tab/runpod-status';
import ProfileButton from '@/app/home/tab/buttons/profile-button';
import { useSession } from 'next-auth/react';

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
};

type NavButton = {
  label: string;
  href: string;
  className: string;
  icon?: React.ReactNode;
};

export default function LandscapeSideNav() {
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email;
  const userEmail = session?.user?.email;

  const mainNavItems: NavItem[] = [
    {
      icon: HomeIcon,
      label: "Home",
      href: "/",
    },
    {
      icon: PlusSquareIcon,
      label: "Create",
      href: "/new-character",
    },
    {
      icon: UserIcon,
      label: "Profile",
      href: "/profile",
    },
  ];

  return (
    <nav className="flex flex-col w-64 h-screen items-start bg-[#121214] fixed left-0 top-0 z-50">
      {/* Header with logo */}
      <div className="flex items-center justify-center px-6 py-8 w-full">
        <Link href="/" className="flex items-center">
          <div className="w-32">
            <Image
              src="/logo2.png"
              alt="Logo"
              width={128}
              height={32}
              priority
            />
          </div>
        </Link>
      </div>

      {/* Separator */}
      <div className="w-full h-[1px] bg-[#1d1d1e]" />

      {/* Status Bar */}
      <div className="px-6 py-4 w-full">
        <StatusBar />
      </div>

      {/* Navigation menu */}
      <div className="flex flex-col items-start gap-2 px-6 py-4 w-full flex-grow">
        {mainNavItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={item.label} className="w-full">
              {item.label === "Create" ? (
                <div className="w-full">
                  <CreateButton 
                    button={{
                      label: item.label,
                      href: item.href,
                      className: "flex items-center gap-3 px-3 py-3.5 w-full justify-start rounded-lg hover:bg-[#ffffff1a] transition-colors duration-200 group text-[#8f9092] hover:text-white",
                      icon: <IconComponent className="w-6 h-6" />
                    } as NavButton}
                  />
                </div>
              ) : item.label === "Profile" && session ? (
                <div className="w-full">
                  <ProfileButton 
                    userName={userName || ''} 
                    className="flex items-center gap-3 px-3 py-3.5 w-full justify-start rounded-lg hover:bg-[#ffffff1a] transition-colors duration-200 group text-[#8f9092] hover:text-white"
                    userEmail={userEmail || ''}
                  />
                </div>
              ) : item.label === "Profile" && !session ? (
                null
              ) : (
                <div className="w-full">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3.5 w-full justify-start rounded-lg hover:bg-[#ffffff1a] transition-colors duration-200 group text-[#8f9092] hover:text-white"
                  >
                    <IconComponent className="w-6 h-6 group-hover:text-white" />
                    <span className="font-medium text-base tracking-[-0.32px] leading-5 text-left flex-1 group-hover:text-white [font-family:'Inter',Helvetica]">
                      {item.label}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auth section at bottom */}
      <div className="flex flex-col items-center gap-2 p-6 w-full">
        {session ? (
          <div className="w-full">
            <SignOutButton className="flex items-center gap-3 px-3 py-3.5 w-full justify-start rounded-lg bg-[#4f46e5] hover:bg-[#3c34b5] text-white hover:text-white transition-colors duration-200" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <AuthButton 
              button={{
                label: "Login",
                href: "#",
                className: "flex items-center gap-3 px-3 py-3.5 w-full justify-center rounded-lg hover:bg-[#1d1d1e] text-white hover:text-white transition-colors duration-200"
              } as NavButton}
            />
            <AuthButton 
              button={{
                label: "Sign Up",
                href: "#",
                className: "flex items-center gap-3 px-3 py-3.5 w-full justify-center rounded-lg bg-[#4f46e5] hover:bg-[#3c34b5] text-white hover:text-white transition-colors duration-200"
              } as NavButton}
            />
          </div>
        )}
      </div>
    </nav>
  );
}