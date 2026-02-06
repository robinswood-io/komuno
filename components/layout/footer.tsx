'use client';

import { useBranding } from '@/contexts/BrandingContext';

export default function Footer() {
  const { branding } = useBranding();

  return (
    <footer className="bg-gray-100 border-t mt-auto">
      <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} {branding?.app?.name || 'CJD Amiens - Boîte à Kiffs'}</p>
        <p className="mt-2">
          Application collaborative pour le {branding?.organization?.name || 'Centre des Jeunes Dirigeants'}
        </p>
      </div>
    </footer>
  );
}
