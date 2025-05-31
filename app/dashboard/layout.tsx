import SideNav from '@/app/ui/dashboard/sidenav-top';
import NavLinks from '@/app/ui/dashboard/nav-links-top';

// export const experimental_ppr = true;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex-col bg-[#121214]">
      <SideNav />
      <div className="pt-[78px]">
        <div className="px-[110px]">
          {children}
        </div>
      </div>
    </div>
  );
}