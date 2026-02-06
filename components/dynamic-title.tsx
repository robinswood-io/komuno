'use client';

import { useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

/**
 * Composant qui met à jour dynamiquement le titre de la page
 * en fonction de la configuration branding
 */
export function DynamicTitle() {
  const { branding } = useBranding();

  useEffect(() => {
    if (typeof document !== 'undefined' && branding?.app?.name) {
      document.title = branding.app.name;
    }
  }, [branding]);

  return null; // Ce composant n'affiche rien, il met juste à jour le title
}
