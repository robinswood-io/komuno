import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';

type ModuleKey = 'events' | 'ideas' | 'loans' | 'tools';

/**
 * Hook pour protéger une page selon l'état d'activation d'un module
 * Redirige vers la home si le module est désactivé
 */
export function useModuleGuard(moduleKey: ModuleKey) {
  const router = useRouter();
  const { branding } = useBranding();

  useEffect(() => {
    if (branding?.modules?.[moduleKey]) {
      const moduleConfig = branding.modules[moduleKey] as { enabled: boolean };

      if (!moduleConfig.enabled) {
        console.warn(`Module ${moduleKey} is disabled, redirecting to home`);
        router.push('/');
      }
    }
  }, [branding, moduleKey, router]);

  return {
    isEnabled: branding?.modules?.[moduleKey]?.enabled ?? true,
    isLoading: !branding,
  };
}

/**
 * Hook pour vérifier si un module est activé sans redirection
 * Utile pour conditionner l'affichage d'éléments UI
 */
export function useModuleStatus(moduleKey: ModuleKey) {
  const { branding } = useBranding();

  return {
    isEnabled: branding?.modules?.[moduleKey]?.enabled ?? true,
    isLoading: !branding,
  };
}
