'use client';

import {
  HomeIcon,
  HeartIcon,
  ClockIcon,
  PlusIcon,
  UserIcon,
  CreditCardIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Map of links to display in the side navigation.
const navigationSections = [
  {
    title: "EXPLORE",
    items: [
      { name: 'Home', href: '/dashboard', icon: HomeIcon },
      { name: 'Favorites', href: '#', icon: HeartIcon },
      { name: 'History', href: '#', icon: ClockIcon },
    ],
  },
  {
    title: "CREATE",
    items: [
      { name: 'New', href: '/dashboard/image-upload', icon: PlusIcon },
      { name: 'My Avatar', href: '/dashboard/my-avatars', icon: UserIcon },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { name: 'Profile', href: '#', icon: UserIcon },
      { name: 'Subscription', href: '#', icon: CreditCardIcon },
      { name: 'Setting', href: '#', icon: Cog6ToothIcon },
    ],
  },
];

export default function NavLinks() {
  const pathname = usePathname();
  
  return (
    <nav className="flex flex-col h-screen justify-between py-10 bg-white w-[260px] fixed left-0 top-0 overflow-y-auto">
      {/* Top section with navigation */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Logo */}
        <div className="flex flex-col w-full items-start pl-10 gap-2.5">
          <div className="font-['Montserrat',Helvetica] font-bold text-2xl text-[#5856d6]">
            Rita
          </div>
        </div>

        {/* Navigation sections */}
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="flex flex-col items-start w-full">
            {/* Section title */}
            <div className="h-[46px] w-full">
              <div className="flex h-[46px] items-center pl-10">
                <div className="font-['Montserrat',Helvetica] font-normal text-[#24242e] text-lg leading-[22px]">
                  {section.title}
                </div>
              </div>
            </div>

            {/* Section items */}
            {section.items.map((item) => {
              const LinkIcon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center justify-between w-full h-[46px] pl-10 bg-white hover:bg-[#F0F0F5] transition-colors duration-200',
                    {
                      'relative': pathname === item.href,
                    }
                  )}
                >
                  <div className="flex items-center gap-5 w-full">
                    <div className={clsx(
                      'w-6 h-6',
                      {
                        'text-[#5856d6]': pathname === item.href,
                        'text-[#020202]': pathname !== item.href,
                      }
                    )}>
                      <LinkIcon />
                    </div>
                    <div className={clsx(
                      "font-['Montserrat',Helvetica] text-base leading-[22px]",
                      {
                        'font-semibold text-[#5856d6]': pathname === item.href,
                        'font-normal text-[#020202]': pathname !== item.href,
                      }
                    )}>
                      {item.name}
                    </div>
                  </div>
                  {pathname === item.href && (
                    <div className="absolute right-0 w-1.5 h-[46px] bg-[#5856d6]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom section with sign in/up buttons */}
      <div className="flex flex-col w-[166px] mx-auto items-center gap-6">
        <button className="w-full rounded-[15px] border border-[#5856d6] text-[#5856d6] font-['Montserrat',Helvetica] font-semibold py-2">
          Sign In
        </button>

        <button className="w-full rounded-[15px] bg-[#5856d6] text-white font-['Montserrat',Helvetica] font-semibold py-2">
          Sign Up
        </button>

        <div className="font-['Montserrat',Helvetica] font-semibold text-[#818b91] text-xs text-center">
          Terms & Policies
        </div>
      </div>
    </nav>
  );
}
