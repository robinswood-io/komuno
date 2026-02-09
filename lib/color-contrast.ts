/**
 * Utilitaires pour gérer automatiquement le contraste des couleurs
 * Calcule si une couleur est claire ou foncée et retourne la couleur de texte appropriée
 */

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Supprimer le # si présent
  hex = hex.replace(/^#/, '');

  // Format court (#RGB)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calcule la luminance relative d'une couleur RGB (WCAG 2.0)
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
  // Normaliser les valeurs RGB (0-1)
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  // Calculer la luminance relative
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Détermine si une couleur est claire ou foncée
 * Retourne true si la couleur est claire (luminance > 0.5)
 */
export function isColorLight(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return true; // Par défaut, considérer comme clair en cas d'erreur

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5;
}

/**
 * Retourne une couleur de texte qui contraste bien avec la couleur de fond donnée
 * @param backgroundColor - Couleur de fond en format hex (#RRGGBB ou #RGB)
 * @param lightColor - Couleur à utiliser si le fond est foncé (défaut: blanc)
 * @param darkColor - Couleur à utiliser si le fond est clair (défaut: noir)
 * @returns La couleur de texte appropriée
 */
export function getContrastColor(
  backgroundColor: string,
  lightColor: string = '#FFFFFF',
  darkColor: string = '#000000'
): string {
  return isColorLight(backgroundColor) ? darkColor : lightColor;
}

/**
 * Calcule le ratio de contraste entre deux couleurs (WCAG 2.0)
 * Un ratio de 4.5:1 est requis pour le texte normal
 * Un ratio de 3:1 est requis pour le texte large
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Vérifie si deux couleurs ont un contraste suffisant selon les WCAG 2.0
 * @param textColor - Couleur du texte
 * @param backgroundColor - Couleur du fond
 * @param level - 'AA' (4.5:1 normal, 3:1 large) ou 'AAA' (7:1 normal, 4.5:1 large)
 * @param isLargeText - Si le texte est considéré comme "large" (>18pt ou >14pt gras)
 */
export function meetsContrastRequirements(
  textColor: string,
  backgroundColor: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(textColor, backgroundColor);

  const requirements = {
    AA: isLargeText ? 3 : 4.5,
    AAA: isLargeText ? 4.5 : 7,
  };

  return ratio >= requirements[level];
}

/**
 * Récupère la couleur calculée d'une variable CSS
 * Utile pour obtenir les couleurs définies via Tailwind/CSS variables
 */
export function getCSSVariableColor(variableName: string): string | null {
  if (typeof window === 'undefined') return null;

  // Essayer de récupérer depuis :root
  const rootStyles = getComputedStyle(document.documentElement);
  const value = rootStyles.getPropertyValue(variableName).trim();

  if (!value) return null;

  // Si c'est une couleur HSL (format Tailwind), convertir en hex
  if (value.includes('hsl')) {
    // Pour l'instant, retourner null - on pourrait implémenter une conversion HSL->hex
    return null;
  }

  return value;
}
