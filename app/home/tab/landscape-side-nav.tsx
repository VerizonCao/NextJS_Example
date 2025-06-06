'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HomeIcon, PlusSquareIcon, MessageSquareIcon, WalletIcon, UserIcon, MoreVerticalIcon, LogOutIcon, MenuIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const moreIconRef = useRef<SVGSVGElement>(null);
  
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
    if (label === "Chat" && !session) {
      // Redirect to login for chat history
      router.push('/api/auth/signin');
      return;
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

  const calculateMenuPosition = () => {
    if (moreIconRef.current) {
      const iconRect = moreIconRef.current.getBoundingClientRect();
      
      // Calculate position so dropdown's left corner aligns with the icon's left edge
      const left = iconRect.left + 30;
      const top = iconRect.top - 60; // Small gap above icon
      
      setMenuPosition({ top, left });
    }
  };

  const handleUserMenuToggle = () => {
    if (!showUserMenu) {
      calculateMenuPosition();
    }
    setShowUserMenu(!showUserMenu);
  };

  return (
    <nav className={`flex flex-col h-screen items-start bg-black/25 fixed left-0 top-0 z-50 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header with logo/menu button */}
      <div className={`flex items-center justify-between w-full transition-all duration-300 ${isCollapsed ? 'px-2 py-4 2xl:py-10' : 'px-4 py-6 2xl:px-6 2xl:py-10'}`}>
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center w-12 h-12 text-white hover:bg-[#ffffff1a] rounded-xl transition-colors mx-auto"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center">
              <div className="w-40 h-10 overflow-hidden">
                <Image
                  src="/logo2.png"
                  alt="Logo"
                  width={160}
                  height={24}
                  priority
                  className="object-cover object-center w-full h-full"
                />
              </div>
            </Link>
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex items-center justify-center w-8 h-8 text-white hover:bg-[#ffffff1a] rounded-xl transition-colors"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="w-full h-[1px] bg-[#8f909240]" />

      {/* Navigation menu */}
      <div className={`flex flex-col items-start gap-2 w-full flex-grow overflow-y-auto transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4 2xl:px-6'} py-2 2xl:py-6`}>
        {mainNavItems.map((item, index) => {
          const IconComponent = item.icon;
          const active = isActive(item.href);
          
          // Hide Profile when not logged in
          if (item.label === "Profile" && !session) {
            return null;
          }
          
          // Hide Chat button (temporarily hidden)
          if (item.label === "Chat") {
            return null;
          }
          
          return (
            <div key={item.label} className="w-full">
              <button
                onClick={() => handleNavClick(item.href, item.label)}
                className={`flex items-center gap-3 w-full rounded-[12px] h-auto transition-colors duration-200 group ${active ? "bg-[#ffffff1a]" : ""} hover:bg-[#ffffff1a] ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-start px-3 py-2.5 2xl:py-3.5'}`}
                title={isCollapsed ? item.label : undefined}
              >
                <IconComponent className={`w-6 h-6 ${active ? "text-white" : "text-[#8f9092] group-hover:text-white"} ${isCollapsed ? '' : ''}`} />
                {!isCollapsed && (
                  <span
                    className={`font-medium text-base tracking-[-0.32px] leading-5 text-left flex-1 ${active ? "text-white" : "text-[#8f9092] group-hover:text-white"} ${item.fontFamily === "Montserrat" ? "[font-family:'Montserrat',Helvetica]" : "[font-family:'Inter',Helvetica]"}`}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* User profile section at bottom */}
      <div className={`flex flex-col items-center justify-end gap-2 w-full transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-6'} py-6`}>
        {session ? (
          <div className="relative w-full">
            <button
              onClick={handleUserMenuToggle}
              className={`flex w-full items-center justify-center gap-3 bg-[#ffffff1a] rounded-xl hover:bg-[#ffffff20] transition-colors ${isCollapsed ? 'h-12 px-2 py-2' : 'h-[54px] px-3 py-3.5'}`}
              ref={userButtonRef}
              title={isCollapsed ? displayName : undefined}
            >
              {/* Avatar */}
              <div className="w-8 h-8 border border-solid border-[#d9d9d9] rounded-full bg-[#2a2a2e] flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {getUserInitial(displayName)}
                </span>
              </div>

              {!isCollapsed && (
                <>
                  {/* User name */}
                  <div className="flex flex-col items-start gap-1 flex-1">
                    <span className="font-normal text-xs leading-4 text-white [font-family:'Montserrat',Helvetica] truncate max-w-[120px]">
                      {displayName}
                    </span>
                  </div>

                  {/* Menu button */}
                  <MoreVerticalIcon className="w-6 h-6 text-white" ref={moreIconRef} />
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div 
                className="fixed min-w-[220px] bg-[#2f363e] rounded-xl shadow-2xl z-[9999]"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`
                }}
              >
                <div>
                  <SignOutButton className="flex items-center px-4 py-4 font-medium text-base tracking-[-0.32px] leading-5 text-red-400 hover:bg-[#ffffff1a] rounded-xl cursor-pointer w-full justify-start transition-colors [font-family:'Montserrat',Helvetica]" />
                </div>
              </div>
            )}
          </div>
        ) : (
          !isCollapsed && (
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
          )
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