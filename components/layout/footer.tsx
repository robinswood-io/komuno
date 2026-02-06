'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

export default function Footer() {
  const { branding } = useBranding();

  return (
    <footer className="bg-gray-100 border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left text-gray-600 text-sm">
            <p>© {new Date().getFullYear()} {branding?.app?.name || 'Komuno'}</p>
            <p className="mt-1">
              Application collaborative pour {branding?.organization?.name || 'votre organisation'}
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary bg-white border border-gray-300 rounded-lg hover:border-primary transition-colors duration-200"
          >
            <LogIn className="w-4 h-4" />
            Espace Administration
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>
            Propulsé par{' '}
            <a
              href="https://robinswood.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Robinswood
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
