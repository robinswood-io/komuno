import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { brandingCore } from '@/lib/config/branding-core';
import type { BrandingCore } from '@/lib/config/branding-core';
import { branding as defaultBranding } from '@/lib/config/branding';

interface BrandingContextType {
  branding: BrandingCore & { assets?: typeof defaultBranding.assets };
  isLoading: boolean;
  isCustomized: boolean;
  reloadBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Deep merge utility function
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue) as any;
      } else {
        result[key] = sourceValue as any;
      }
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any;
    }
  }
  
  return result;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [brandingState, setBrandingState] = useState<BrandingCore & { assets?: typeof defaultBranding.assets }>({
    ...brandingCore,
    assets: defaultBranding.assets
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomized, setIsCustomized] = useState(false);

  const loadBranding = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/branding');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        if (result.data.isDefault) {
          // Using default values
          setBrandingState({
            ...brandingCore,
            assets: defaultBranding.assets
          });
          setIsCustomized(false);
        } else {
          // Using customized values from DB
          const customConfig = JSON.parse(result.data.config);
          // Deep merge with defaults to preserve nested default values
          const mergedConfig = deepMerge(brandingCore, customConfig);
          
          // Si un logo a été uploadé, utiliser celui-ci
          let logoUrl: string = defaultBranding.assets.logo;
          if (customConfig.logoFilename) {
            // Le logo uploadé est accessible via MinIO
            // URL MinIO: http://localhost:9000/assets/{filename}
            const minioEndpoint = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MINIO_ENDPOINT) || 'localhost:9000';
            const minioProtocol = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true') ? 'https' : 'http';
            logoUrl = `${minioProtocol}://${minioEndpoint}/assets/${customConfig.logoFilename}`;
          }

          setBrandingState({
            ...mergedConfig,
            assets: {
              ...defaultBranding.assets,
              logo: logoUrl as any // Allow dynamic MinIO URLs
            }
          });
          setIsCustomized(true);
        }
      }
    } catch (error) {
      console.error('Failed to load branding config:', error);
      // Fallback to default values
      setBrandingState({
        ...brandingCore,
        assets: defaultBranding.assets
      });
      setIsCustomized(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranding();
  }, []);

  // Appliquer les couleurs au CSS quand le branding change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const colors = brandingState.colors;

    console.log('[BrandingContext] Application des couleurs:', colors);

    // Fonction pour convertir hex en HSL
    const hexToHSL = (hex: string): string => {
      // Enlever le # si présent
      hex = hex.replace(/^#/, '');

      // Convertir en RGB
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);

      return `${h} ${s}% ${l}%`;
    };

    // Appliquer les couleurs aux variables CSS
    if (colors.primary) {
      try {
        const primaryHSL = colors.primary.startsWith('#') ? hexToHSL(colors.primary) : colors.primary;
        console.log('[BrandingContext] Application primary:', colors.primary, '->', primaryHSL);
        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--ring', primaryHSL);
        root.style.setProperty('--sidebar-primary', primaryHSL);
        root.style.setProperty('--chart-1', primaryHSL);
        // Variables CJD custom
        root.style.setProperty('--cjd-green', primaryHSL);
      } catch (error) {
        console.error('[BrandingContext] Erreur conversion primary:', error);
      }
    }

    if (colors.primaryDark) {
      try {
        const darkHSL = colors.primaryDark.startsWith('#') ? hexToHSL(colors.primaryDark) : colors.primaryDark;
        console.log('[BrandingContext] Application primaryDark:', colors.primaryDark, '->', darkHSL);
        root.style.setProperty('--accent-foreground', darkHSL);
        root.style.setProperty('--sidebar-accent-foreground', darkHSL);
        // Variables CJD custom
        root.style.setProperty('--cjd-green-dark', darkHSL);
      } catch (error) {
        console.error('[BrandingContext] Erreur conversion primaryDark:', error);
      }
    }

    if (colors.primaryLight) {
      try {
        const lightHSL = colors.primaryLight.startsWith('#') ? hexToHSL(colors.primaryLight) : colors.primaryLight;
        console.log('[BrandingContext] Application primaryLight:', colors.primaryLight, '->', lightHSL);
        root.style.setProperty('--accent', lightHSL);
        root.style.setProperty('--sidebar-accent', lightHSL);
        // Variables CJD custom
        root.style.setProperty('--cjd-green-light', lightHSL);
      } catch (error) {
        console.error('[BrandingContext] Erreur conversion primaryLight:', error);
      }
    }

    if (colors.secondary) {
      try {
        const secondaryHSL = colors.secondary.startsWith('#') ? hexToHSL(colors.secondary) : colors.secondary;
        console.log('[BrandingContext] Application secondary:', colors.secondary, '->', secondaryHSL);
        root.style.setProperty('--secondary', secondaryHSL);
      } catch (error) {
        console.error('[BrandingContext] Erreur conversion secondary:', error);
      }
    }
  }, [brandingState.colors]);

  return (
    <BrandingContext.Provider value={{ 
      branding: brandingState, 
      isLoading, 
      isCustomized,
      reloadBranding: loadBranding 
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}
