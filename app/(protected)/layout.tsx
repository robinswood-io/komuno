'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Layout pour les pages protégées (admin, onboarding)
 * Vérifie l'authentification avant d'afficher le contenu
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const devLoginEnabled = useMemo(
    () => process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true',
    []
  );
  const [devUser, setDevUser] = useState<{ role: string } | null>(null);
  const [devAuthReady, setDevAuthReady] = useState(!devLoginEnabled);

  useEffect(() => {
    if (!devLoginEnabled) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem('admin-user');
    if (!stored) {
      setDevUser(null);
      setDevAuthReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'role' in parsed &&
        typeof (parsed as { role?: unknown }).role === 'string'
      ) {
        setDevUser({ role: (parsed as { role: string }).role });
      } else {
        setDevUser(null);
      }
    } catch {
      setDevUser(null);
    } finally {
      setDevAuthReady(true);
    }
  }, [devLoginEnabled]);

  useEffect(() => {
    if (!isLoading && devAuthReady && !user && !devUser) {
      router.push('/login');
    }
  }, [user, isLoading, router, devAuthReady, devUser]);

  if (isLoading && !devUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user && devAuthReady && !devUser) {
    return null;
  }

  return <>{children}</>;
}
