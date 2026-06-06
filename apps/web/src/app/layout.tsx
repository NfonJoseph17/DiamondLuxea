import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/query-client';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistrar } from '@/components/app/service-worker-registrar';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Diamond Luxea',
  description: 'Diamond Luxea management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Diamond Luxea',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#7B2E8E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegistrar />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
