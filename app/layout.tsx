import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';

import '@/app/ui/global.css';
import { montserrat } from '@/app/ui/fonts';
import { Providers } from './providers';


 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* <body>{children}</body> */}
      <body className={`${montserrat.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}