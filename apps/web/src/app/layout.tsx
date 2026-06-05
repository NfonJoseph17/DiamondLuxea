import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-client';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Bar Depot Management',
  description: 'Manage bar and depot operations in Cameroon',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Bar Depot',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
