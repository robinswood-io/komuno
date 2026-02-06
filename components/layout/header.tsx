'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
// import { useRouter } from 'next/navigation'; // For future navigation
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';

/**
 * Header principal de l'application Next.js
 * Version migrée depuis client/src/components/header.tsx
 */
export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { branding } = useBranding();
  // const router = useRouter(); // For future navigation

  // Map routes to section names
  const getActiveSection = (): 'ideas' | 'propose' | 'events' | 'tools' | 'loan' => {
    if (pathname === '/propose') return 'propose';
    if (pathname === '/events') return 'events';
    if (pathname === '/tools') return 'tools';
    if (pathname === '/loan') return 'loan';
    return 'ideas';
  };

  const activeSection = getActiveSection();

  const menuItems = [
    { id: 'ideas' as const, label: 'Voter pour des idées', route: '/' },
    { id: 'propose' as const, label: 'Proposer une idée', route: '/propose' },
    { id: 'events' as const, label: 'Événements', route: '/events' },
    { id: 'loan' as const, label: 'Prêt', route: '/loan' },
    { id: 'tools' as const, label: 'Les outils du dirigeants', route: '/tools' },
  ];

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            <Link
              href="/"
              className="hover:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded flex items-center space-x-3"
              aria-label="Retour à la page d'accueil - Voter pour des idées"
            >
              {(branding?.app?.showLogo ?? true) && (
                <img
                  src={branding.assets?.logo || '/icon-192.jpg'}
                  alt="Logo CJD Amiens"
                  className="h-8 sm:h-10 lg:h-12 w-auto rounded-[60px]"
                />
              )}
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                {branding?.app?.ideaBoxName || 'Boîte à Kiffs'}
              </h1>
            </Link>
          </div>

          <nav className="hidden lg:flex space-x-4 xl:space-x-6 items-center">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                href={item.route}
                className={`hover:text-white/90 transition-colors duration-200 font-medium text-sm xl:text-base whitespace-nowrap ${
                  activeSection === item.id ? 'border-b-2 border-white pb-1' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="lg:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white/90 hover:bg-primary flex-shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-primary border-t border-primary/80">
          <div className="container mx-auto px-3 sm:px-4 py-3 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                href={item.route}
                onClick={() => setMobileMenuOpen(false)}
                className={`block w-full text-left py-3 px-2 rounded hover:bg-primary/80 transition-colors duration-200 ${
                  activeSection === item.id ? 'bg-primary/80 font-medium' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
