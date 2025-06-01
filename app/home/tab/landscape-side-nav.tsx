'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HomeIcon, PlusSquareIcon, MessageSquareIcon, WalletIcon, UserIcon, MoreVerticalIcon, LogOutIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import AuthButton from '@/app/home/tab/buttons/auth-button';
import SignOutButton from '@/app/home/tab/buttons/signout-button';
import { useSession } from 'next-auth/react';
import { getUserPreferredNameAction } from '@/app/lib/actions';

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  fontFamily?: string;
};

type NavButton = {
  label: string;
  href: string;
  className: string;
  icon?: React.ReactNode;
};

export default function LandscapeSideNav() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  const userName = session?.user?.name || session?.user?.email || '';
  const userEmail = session?.user?.email || '';

  // Fetch preferred name
  useEffect(() => {
    const fetchPreferredName = async () => {
      if (!userEmail) {
        setDisplayName(userName);
        return;
      }
      
      const { success, preferredName } = await getUserPreferredNameAction(userEmail);
      if (success && preferredName) {
        setDisplayName(preferredName);
      } else {
        setDisplayName(userName);
      }
    };

    fetchPreferredName();
  }, [userEmail, userName]);

  const mainNavItems: NavItem[] = [
    {
      icon: HomeIcon,
      label: "Home",
      href: "/",
      fontFamily: "Montserrat"
    },
    {
      icon: PlusSquareIcon,
      label: "Create",
      href: "/new-character",
      fontFamily: "Inter"
    },
    {
      icon: MessageSquareIcon,
      label: "Chat",
      href: "/my-chats",
      fontFamily: "Montserrat"
    },
    {
      icon: WalletIcon,
      label: "Subscription",
      href: "/subscription",
      fontFamily: "Montserrat"
    },
    {
      icon: UserIcon,
      label: "Profile",
      href: "/profile",
      fontFamily: "Inter"
    },
  ];

  const handleNavClick = (href: string, label: string) => {
    if (label === "Create") {
      if (!session) {
        // Handle create without login - could show login popup
        return;
      }
    }
    if (label === "Chat") {
      if (!session) {
        // Redirect to login for chat history
        router.push('/api/auth/signin');
        return;
      }
    }
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="flex flex-col w-64 h-screen items-start bg-[#121214] fixed left-0 top-0 z-50">
      {/* Header with logo */}
      <div className="flex items-center justify-between px-6 py-10 w-full">
        <Link href="/" className="flex items-center">
          <div className="w-40">
            <Image
              src="/logo2.png"
              alt="Logo"
              width={160}
              height={30}
              priority
            />
          </div>
        </Link>
        <div className="w-4 h-4"></div>
      </div>

      {/* Separator */}
      <div className="w-full h-[1px] bg-[#8f909240]" />

      {/* Navigation menu */}
      <div className="flex flex-col items-start gap-2 p-6 w-full flex-grow overflow-y-auto">
        {mainNavItems.map((item, index) => {
          const IconComponent = item.icon;
          const active = isActive(item.href);
          
          // Hide Profile when not logged in
          if (item.label === "Profile" && !session) {
            return null;
          }
          
          // Hide Chat when not logged in
          if (item.label === "Chat" && !session) {
            return null;
          }
          
          return (
            <div key={item.label} className="w-full">
              <button
                onClick={() => handleNavClick(item.href, item.label)}
                className={`flex items-center gap-3 px-3 py-3.5 w-full justify-start rounded-lg h-auto ${active ? "bg-[#ffffff1a]" : ""} hover:bg-[#ffffff1a] transition-colors duration-200 group`}
              >
                <IconComponent className={`w-6 h-6 ${active ? "text-white" : "text-[#8f9092] group-hover:text-white"}`} />
                <span
                  className={`font-medium text-base tracking-[-0.32px] leading-5 text-left flex-1 ${active ? "text-white" : "text-[#8f9092] group-hover:text-white"} ${item.fontFamily === "Montserrat" ? "[font-family:'Montserrat',Helvetica]" : "[font-family:'Inter',Helvetica]"}`}
                >
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* User profile section at bottom */}
      <div className="flex flex-col items-center justify-end gap-2 p-6 w-full">
        {session ? (
          <div className="relative w-full">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full h-[54px] items-center justify-center gap-3 px-3 py-3.5 bg-[#ffffff1a] rounded-lg hover:bg-[#ffffff20] transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 border border-solid border-[#d9d9d9] rounded-full bg-[#2a2a2e] flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {getUserInitial(displayName)}
                </span>
              </div>

              {/* User name */}
              <div className="flex flex-col items-start gap-1 flex-1">
                <span className="font-normal text-xs leading-4 text-white [font-family:'Montserrat',Helvetica] truncate max-w-[120px]">
                  {displayName}
                </span>
              </div>

              {/* Menu button */}
              <MoreVerticalIcon className="w-6 h-6 text-white" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[220px] bg-[#222433] rounded-md shadow-lg border border-[#3a3a4a] z-[9999]">
                <div className="p-2">
                  <SignOutButton className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-[#ffffff1a] rounded-md cursor-pointer w-full justify-start transition-colors" />
                </div>
              </div>
            )}
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

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
}