import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorker } from './components/ServiceWorker';
import { SessionProvider } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Dembel Performance Hub',
  description: 'Reporting, verification and analytics for Temer Dembel Branch',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Dembel Hub', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#7A9E2C', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Noto+Sans+Ethiopic:wght@400;600&display=swap" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
