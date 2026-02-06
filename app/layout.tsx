import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { brandingCore } from '@/lib/config/branding-core';
import { DynamicTitle } from '@/components/dynamic-title';

const inter = Inter({ subsets: ['latin'] });

// Next.js 16: viewport is now separate from metadata
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: brandingCore.colors.primary,
};

// Métadonnées par défaut - seront mises à jour dynamiquement par DynamicTitle
export const metadata: Metadata = {
  title: brandingCore.app.name,
  description: brandingCore.app.description,
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-cjd.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <DynamicTitle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
