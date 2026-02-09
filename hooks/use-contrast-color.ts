import { useEffect, useState } from 'react';
import { getContrastColor } from '@/lib/color-contrast';

/**
 * Hook pour obtenir automatiquement une couleur de texte qui contraste avec le fond
 * Lit la couleur de fond depuis une variable CSS et retourne blanc ou noir selon la luminosité
 */
export function useContrastColor(
  cssVariable: string,
  defaultColor: string = '#000000'
): string {
  const [contrastColor, setContrastColor] = useState(defaultColor);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Récupérer la couleur de la variable CSS
    const rootStyles = getComputedStyle(document.documentElement);
    const bgColor = rootStyles.getPropertyValue(cssVariable).trim();

    if (!bgColor) {
      setContrastColor(defaultColor);
      return;
    }

    // Si c'est une couleur HSL (format Tailwind), extraire les valeurs
    if (bgColor.includes('hsl')) {
      // Pour HSL, on peut convertir en hex ou utiliser une heuristique basée sur la luminosité
      const match = bgColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (match) {
        const lightness = parseInt(match[3]);
        // Si la luminosité est > 50%, c'est clair, donc texte foncé
        setContrastColor(lightness > 50 ? '#000000' : '#FFFFFF');
      }
    } else if (bgColor.startsWith('#')) {
      // Couleur hex directe
      setContrastColor(getContrastColor(bgColor));
    } else if (bgColor.startsWith('rgb')) {
      // Convertir RGB en hex puis calculer
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const hex = `#${parseInt(match[1]).toString(16).padStart(2, '0')}${parseInt(match[2]).toString(16).padStart(2, '0')}${parseInt(match[3]).toString(16).padStart(2, '0')}`;
        setContrastColor(getContrastColor(hex));
      }
    }
  }, [cssVariable, defaultColor]);

  return contrastColor;
}
