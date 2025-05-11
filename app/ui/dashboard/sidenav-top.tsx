import Link from 'next/link';
import Image from 'next/image';
import { PlusSquareIcon } from 'lucide-react';
import { auth } from '@/auth';
import CreateButton from '@/app/ui/dashboard/sidenav-buttons/create-button';
import AuthButton from '@/app/ui/dashboard/sidenav-buttons/auth-button';
import SignOutButton from '@/app/ui/dashboard/sidenav-buttons/signout-button';
import StatusBar from '@/app/ui/dashboard/runpod-health';

type NavButton = {
  label: string;
  href: string;
  className: string;
  icon?: React.ReactNode;
  isForm?: boolean;
  formAction?: () => Promise<void>;
};

export default async function SideNav() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email;

  const navButtons: NavButton[] = [
    {
      label: "Create",
      icon: <PlusSquareIcon className="w-6 h-6" />,
      href: "/dashboard/image-upload",
      className: "hover:bg-[#1d1d1e] text-white hover:text-white",
    },
    ...(session ? [
      { 
        label: userName || "Profile", 
        href: "/dashboard",
        className: "hover:bg-[#1d1d1e] text-white hover:text-white" 
      },
      { 
        label: "Sign Out", 
        href: "#",
        className: "bg-[#4f46e5] hover:bg-[#3c34b5] text-white hover:text-white",
        isForm: true
      }
    ] : [
      { 
        label: "Login", 
        href: "#",
        className: "hover:bg-[#1d1d1e] text-white hover:text-white" 
      },
      { 
        label: "Sign Up", 
        href: "#",
        className: "bg-[#4f46e5] hover:bg-[#3c34b5] text-white hover:text-white" 
      }
    ])
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex w-full h-[78px] items-center justify-between px-10 py-3 bg-[#121214]">
      <div className="flex items-center gap-6">
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
        <div className="ml-12">
          <StatusBar />
        </div>
      </div>

      <div className="flex items-center">
        {navButtons.map((button, index) => (
          <div key={button.label} className="flex items-center">
            {button.label === "Sign Out" ? (
              <SignOutButton className={button.className} />
            ) : button.label === "Create" ? (
              <CreateButton button={button} />
            ) : !session && (button.label === "Login" || button.label === "Sign Up") ? (
              <AuthButton button={button} />
            ) : (
              <Link
                href={button.href}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${button.className}`}
              >
                {button.icon && <span className="mr-2">{button.icon}</span>}
                {button.label}
              </Link>
            )}

            {index < navButtons.length - 1 && (
              <div className="h-6 w-[1px] mx-2 bg-[#1d1d1e]" />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
