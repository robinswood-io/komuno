'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

interface VersionPayload {
  version: string;
  summary?: string;
  changelogUrl?: string;
}

export default function Footer() {
  const { branding } = useBranding();
  const [versionInfo, setVersionInfo] = useState<VersionPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch('/version.json', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as VersionPayload;
        if (mounted && data.version) {
          setVersionInfo(data);
        }
      })
      .catch(async () => {
        try {
          const response = await fetch('/api/version', { cache: 'no-store' });
          if (!response.ok) return;
          const fallback = (await response.json()) as { version?: string };
          if (mounted && fallback.version) {
            setVersionInfo({
              version: fallback.version,
              changelogUrl: '/changelog',
            });
          }
        } catch {
          // Sans impact: footer garde son affichage standard.
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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

        <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-500 space-y-2">
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
          {versionInfo?.version && (
            <p className="text-gray-600">
              Version {versionInfo.version}
              {' · '}
              <Link
                href={versionInfo.changelogUrl || '/changelog'}
                className="text-primary hover:underline"
              >
                Notes de version
              </Link>
              {versionInfo.summary ? ` · ${versionInfo.summary}` : ''}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
