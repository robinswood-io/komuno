import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { brandingCore } from '@/lib/config/branding-core';
import { DynamicTitle } from '@/components/dynamic-title';
import { ThemeScript } from '@/components/theme-script';

const inter = Inter({ subsets: ['latin'] });

// Next.js 16: viewport is now separate from metadata
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: brandingCore.colors.primary,
};

// Métadonnées dynamiques — fetchées server-side depuis l'API branding (public)
// cache: 'no-store' indispensable : NestJS ne tourne pas au build time,
// donc la valeur ne peut pas être pré-générée statiquement.
export async function generateMetadata(): Promise<Metadata> {
  const backendUrl = `http://localhost:${process.env.BACKEND_PORT || '5000'}`;

  try {
    const response = await fetch(`${backendUrl}/api/admin/branding`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const result = await response.json();
      if (result.data && !result.data.isDefault && result.data.config) {
        const config = JSON.parse(result.data.config);
        const appName = config.app?.name || config.organization?.shortName;
        if (appName) {
          return {
            title: appName,
            description: config.app?.description || brandingCore.app.description,
            manifest: '/manifest.json',
            icons: { icon: '/logo-cjd.png', apple: '/apple-touch-icon.png' },
          };
        }
      }
    }
  } catch {
    // Fallback silencieux vers les valeurs par défaut
  }

  return {
    title: brandingCore.app.name,
    description: brandingCore.app.description,
    manifest: '/manifest.json',
    icons: { icon: '/logo-cjd.png', apple: '/apple-touch-icon.png' },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeScript />
        <Providers>
          <DynamicTitle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
