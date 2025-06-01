import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';

import '@/app/ui/global.css';
import { montserrat } from '@/app/ui/fonts';
import { Providers } from './providers';
import { VersionCheck } from './components/version-check';
import LandscapeSideNav from '@/app/home/tab/landscape-side-nav';

import { Analytics } from "@vercel/analytics/next"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${montserrat.className} antialiased`}>
        <Providers>
          <VersionCheck />
          <LandscapeSideNav />
          <main>
            {children}
          </main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}