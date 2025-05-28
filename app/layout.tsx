import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';

import '@/app/ui/global.css';
import { montserrat } from '@/app/ui/fonts';
import { Providers } from './providers';
import { VersionCheck } from './components/version-check';

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
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}