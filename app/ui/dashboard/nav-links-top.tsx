'use client';

import {
  HomeIcon,
  HeartIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Map of links to display in the navigation
const navigationItems = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Favorites', href: '#', icon: HeartIcon },
  { name: 'History', href: '#', icon: ClockIcon },
  { name: 'My Avatar', href: '/dashboard/my-avatars', icon: UserIcon },
  { name: 'Profile', href: '#', icon: UserIcon },
  { name: 'Subscription', href: '#', icon: CreditCardIcon },
  { name: 'Setting', href: '#', icon: Cog6ToothIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  
  return (
    <div className="flex items-center gap-6">
      {navigationItems.map((item) => {
        const LinkIcon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-200',
              {
                'text-white': pathname === item.href,
                'text-[#818b91] hover:text-white': pathname !== item.href,
              }
            )}
          >
            <LinkIcon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
