import Link from 'next/link';
import { PlusSquareIcon } from 'lucide-react';
import AcmeLogo from '@/app/ui/acme-logo';

export default function SideNav() {
  const navButtons = [
    {
      label: "Create",
      icon: <PlusSquareIcon className="w-6 h-6" />,
      href: "/dashboard/image-upload",
      className: "hover:bg-[#1d1d1e] text-white hover:text-white",
    },
    { 
      label: "Login", 
      href: "#",
      className: "hover:bg-[#1d1d1e] text-white hover:text-white" 
    },
    { 
      label: "Sign Up", 
      href: "#",
      className: "bg-[#4f46e5] hover:bg-[#3c34b5] text-white hover:text-white" 
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex w-full h-[78px] items-center justify-between px-10 py-3 bg-[#121214]">
      <Link href="/" className="flex items-center">
        <div className="w-32 text-white">
          <AcmeLogo />
        </div>
      </Link>

      <div className="flex items-center">
        {navButtons.map((button, index) => (
          <div key={button.label} className="flex items-center">
            <Link
              href={button.href}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${button.className}`}
            >
              {button.icon && <span className="mr-2">{button.icon}</span>}
              {button.label}
            </Link>

            {index < 2 && (
              <div className="h-6 w-[1px] mx-2 bg-[#1d1d1e]" />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
