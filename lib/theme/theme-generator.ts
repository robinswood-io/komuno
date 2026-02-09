/**
 * Générateur de thème CSS unifié
 * Convertit la configuration brandingCore en variables CSS HSL
 * Compatible avec Tailwind CSS et système de design shadcn/ui
 */

import { brandingCore } from '../config/branding-core';

/**
 * Convertit une couleur HEX en HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Retire le # si présent
  hex = hex.replace('#', '');

  // Convertit hex en RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Formate une couleur HSL pour CSS
 */
function formatHSL(hex: string): string {
  const { h, s, l } = hexToHSL(hex);
  return `${h} ${s}% ${l}%`;
}

/**
 * Calcule une couleur de texte qui contraste avec le fond
 * Retourne blanc ou noir selon la luminosité du fond
 */
function getContrastingTextColor(bgHex: string): string {
  const { l } = hexToHSL(bgHex);
  // Si la luminosité est > 50%, le fond est clair -> texte foncé
  // Sinon, le fond est foncé -> texte clair
  return l > 50 ? '0 0% 0%' : '0 0% 100%';
}

/**
 * Calcule le contraste pour une couleur HSL directe (sans hex)
 */
function getContrastingTextColorFromHSL(h: number, s: number, l: number): string {
  return l > 50 ? '0 0% 0%' : '0 0% 100%';
}

/**
 * Génère les variables CSS du thème light
 */
export function generateLightThemeVars(): Record<string, string> {
  const { colors } = brandingCore;

  return {
    // Couleurs de base
    '--background': 'hsl(0 0% 100%)',
    '--foreground': 'hsl(210 25% 7.8431%)',

    // Cartes et conteneurs
    '--card': 'hsl(180 6.6667% 97.0588%)',
    '--card-foreground': 'hsl(210 25% 7.8431%)',

    // Popovers
    '--popover': 'hsl(0 0% 100%)',
    '--popover-foreground': 'hsl(210 25% 7.8431%)',

    // Couleurs principales (depuis brandingCore)
    '--primary': `hsl(${formatHSL(colors.primary)})`,
    '--primary-foreground': 'hsl(0 0% 100%)',

    // Couleurs secondaires
    '--secondary': `hsl(${formatHSL(colors.secondary)})`,
    '--secondary-foreground': 'hsl(0 0% 100%)',

    // États discrets
    '--muted': 'hsl(240 1.9608% 90%)',
    '--muted-foreground': 'hsl(210 25% 7.8431%)',

    // Accents
    '--accent': 'hsl(211.5789 51.3514% 92.7451%)',
    '--accent-foreground': `hsl(${formatHSL(colors.primary)})`,

    // Destructif
    '--destructive': `hsl(${formatHSL(colors.error)})`,
    '--destructive-foreground': 'hsl(0 0% 100%)',

    // Bordures et inputs
    '--border': 'hsl(201.4286 30.4348% 90.9804%)',
    '--input': 'hsl(200 23.0769% 97.4510%)',
    '--ring': `hsl(${formatHSL(colors.primary)})`,

    // Charts (depuis brandingCore)
    '--chart-1': `hsl(${formatHSL(colors.chart1)})`,
    '--chart-2': `hsl(${formatHSL(colors.chart2)})`,
    '--chart-3': `hsl(${formatHSL(colors.chart3)})`,
    '--chart-4': `hsl(${formatHSL(colors.chart4)})`,
    '--chart-5': `hsl(${formatHSL(colors.chart5)})`,

    // Sidebar
    '--sidebar-background': 'hsl(180 6.6667% 97.0588%)',
    '--sidebar-foreground': 'hsl(210 25% 7.8431%)',
    '--sidebar-primary': `hsl(${formatHSL(colors.primary)})`,
    '--sidebar-primary-foreground': 'hsl(0 0% 100%)',
    '--sidebar-accent': 'hsl(211.5789 51.3514% 92.7451%)',
    // Calculer automatiquement la couleur de texte qui contraste avec sidebar-accent
    '--sidebar-accent-foreground': `hsl(${getContrastingTextColorFromHSL(211.5789, 51.3514, 92.7451)})`,
    '--sidebar-border': 'hsl(205.0000 25.0000% 90.5882%)',
    '--sidebar-ring': `hsl(${formatHSL(colors.primary)})`,

    // Couleurs de statut (depuis brandingCore)
    '--success': `hsl(${formatHSL(colors.success)})`,
    '--success-foreground': 'hsl(0 0% 100%)',
    '--success-dark': `hsl(${formatHSL(colors.successDark)})`,
    '--success-light': `hsl(${formatHSL(colors.successLight)})`,

    '--warning': `hsl(${formatHSL(colors.warning)})`,
    '--warning-foreground': 'hsl(0 0% 0%)',
    '--warning-dark': `hsl(${formatHSL(colors.warningDark)})`,
    '--warning-light': `hsl(${formatHSL(colors.warningLight)})`,

    '--error': `hsl(${formatHSL(colors.error)})`,
    '--error-foreground': 'hsl(0 0% 100%)',
    '--error-dark': `hsl(${formatHSL(colors.errorDark)})`,
    '--error-light': `hsl(${formatHSL(colors.errorLight)})`,

    '--info': `hsl(${formatHSL(colors.info)})`,
    '--info-foreground': 'hsl(0 0% 100%)',
    '--info-dark': `hsl(${formatHSL(colors.infoDark)})`,
    '--info-light': `hsl(${formatHSL(colors.infoLight)})`,

    // Alias de marque (compatibilité)
    '--cjd-green': `hsl(${formatHSL(colors.primary)})`,
    '--cjd-green-dark': `hsl(${formatHSL(colors.primaryDark)})`,
    '--cjd-green-light': `hsl(${formatHSL(colors.primaryLight)})`,
  };
}

/**
 * Génère les variables CSS du thème dark
 */
export function generateDarkThemeVars(): Record<string, string> {
  const { colors } = brandingCore;

  return {
    // Couleurs de base (inversées pour dark mode)
    '--background': 'hsl(0 0% 0%)',
    '--foreground': 'hsl(200 6.6667% 91.1765%)',

    // Cartes et conteneurs
    '--card': 'hsl(228 9.8039% 10%)',
    '--card-foreground': 'hsl(0 0% 85.0980%)',

    // Popovers
    '--popover': 'hsl(0 0% 0%)',
    '--popover-foreground': 'hsl(200 6.6667% 91.1765%)',

    // Couleurs principales (restent identiques en dark)
    '--primary': `hsl(${formatHSL(colors.primary)})`,
    '--primary-foreground': 'hsl(0 0% 100%)',

    // Couleurs secondaires
    '--secondary': 'hsl(195.0000 15.3846% 94.9020%)',
    '--secondary-foreground': 'hsl(210 25% 7.8431%)',

    // États discrets
    '--muted': 'hsl(0 0% 9.4118%)',
    '--muted-foreground': 'hsl(210 3.3898% 46.2745%)',

    // Accents
    '--accent': 'hsl(205.7143 70% 7.8431%)',
    '--accent-foreground': `hsl(${formatHSL(colors.primary)})`,

    // Destructif
    '--destructive': `hsl(${formatHSL(colors.error)})`,
    '--destructive-foreground': 'hsl(0 0% 100%)',

    // Bordures et inputs
    '--border': 'hsl(210 5.2632% 14.9020%)',
    '--input': 'hsl(207.6923 27.6596% 18.4314%)',
    '--ring': `hsl(${formatHSL(colors.primary)})`,

    // Charts (restent identiques)
    '--chart-1': `hsl(${formatHSL(colors.chart1)})`,
    '--chart-2': `hsl(${formatHSL(colors.chart2)})`,
    '--chart-3': `hsl(${formatHSL(colors.chart3)})`,
    '--chart-4': `hsl(${formatHSL(colors.chart4)})`,
    '--chart-5': `hsl(${formatHSL(colors.chart5)})`,

    // Sidebar
    '--sidebar-background': 'hsl(228 9.8039% 10%)',
    '--sidebar-foreground': 'hsl(0 0% 85.0980%)',
    '--sidebar-primary': `hsl(${formatHSL(colors.primary)})`,
    '--sidebar-primary-foreground': 'hsl(0 0% 100%)',
    '--sidebar-accent': 'hsl(205.7143 70% 7.8431%)',
    // Calculer automatiquement la couleur de texte qui contraste avec sidebar-accent (dark)
    '--sidebar-accent-foreground': `hsl(${getContrastingTextColorFromHSL(205.7143, 70, 7.8431)})`,
    '--sidebar-border': 'hsl(205.7143 15.7895% 26.0784%)',
    '--sidebar-ring': `hsl(${formatHSL(colors.primary)})`,

    // Couleurs de statut (adaptées pour dark mode)
    '--success': `hsl(${formatHSL(colors.success)})`,
    '--success-foreground': 'hsl(0 0% 100%)',
    '--success-dark': `hsl(${formatHSL(colors.successDark)})`,
    '--success-light': 'hsl(120 30% 20%)',

    '--warning': `hsl(${formatHSL(colors.warning)})`,
    '--warning-foreground': 'hsl(0 0% 0%)',
    '--warning-dark': `hsl(${formatHSL(colors.warningDark)})`,
    '--warning-light': 'hsl(36 50% 25%)',

    '--error': `hsl(${formatHSL(colors.error)})`,
    '--error-foreground': 'hsl(0 0% 100%)',
    '--error-dark': `hsl(${formatHSL(colors.errorDark)})`,
    '--error-light': 'hsl(0 50% 20%)',

    '--info': `hsl(${formatHSL(colors.info)})`,
    '--info-foreground': 'hsl(0 0% 100%)',
    '--info-dark': `hsl(${formatHSL(colors.infoDark)})`,
    '--info-light': 'hsl(207 50% 25%)',

    // Alias de marque (compatibilité)
    '--cjd-green': `hsl(${formatHSL(colors.primary)})`,
    '--cjd-green-dark': `hsl(${formatHSL(colors.primaryDark)})`,
    '--cjd-green-light': `hsl(${formatHSL(colors.primaryLight)})`,
  };
}

/**
 * Génère les variables CSS communes (indépendantes du thème)
 */
export function generateCommonVars(): Record<string, string> {
  const { fonts, colors } = brandingCore;

  return {
    // Typographie
    '--font-sans': `'${fonts.primary}', sans-serif`,
    '--font-serif': 'Georgia, serif',
    '--font-mono': 'Menlo, monospace',

    // Border radius
    '--radius': '1.3rem',

    // Shadows
    '--shadow-2xs': '0px 1px 2px 0px hsl(0 0% 0% / 0.05)',
    '--shadow-xs': '0px 1px 3px 0px hsl(0 0% 0% / 0.10), 0px 1px 2px -1px hsl(0 0% 0% / 0.10)',
    '--shadow-sm': '0px 2px 4px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -1px hsl(0 0% 0% / 0.10)',
    '--shadow': '0px 4px 6px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10)',
    '--shadow-md': '0px 6px 10px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10)',
    '--shadow-lg': '0px 10px 15px -3px hsl(0 0% 0% / 0.10), 0px 4px 6px -4px hsl(0 0% 0% / 0.10)',
    '--shadow-xl': '0px 20px 25px -5px hsl(0 0% 0% / 0.10), 0px 8px 10px -6px hsl(0 0% 0% / 0.10)',
    '--shadow-2xl': '0px 25px 50px -12px hsl(0 0% 0% / 0.25)',

    // Spacing
    '--spacing': '0.25rem',
    '--tracking-normal': '0em',

    // Couleurs utilitaires
    '--white': colors.white,
    '--chart-grid': colors.chartGrid,
  };
}

/**
 * Génère le CSS complet du thème
 */
export function generateThemeCSS(): string {
  const lightVars = generateLightThemeVars();
  const darkVars = generateDarkThemeVars();
  const commonVars = generateCommonVars();

  const formatVars = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

  return `
/* ============================================
   THÈME GÉNÉRÉ AUTOMATIQUEMENT
   Source: lib/config/branding-core.ts
   Générateur: lib/theme/theme-generator.ts
   ============================================ */

:root {
${formatVars({ ...lightVars, ...commonVars })}
}

.dark {
${formatVars({ ...darkVars, ...commonVars })}
}
`.trim();
}

/**
 * Hook React pour accéder aux couleurs du thème
 */
export function useThemeColors() {
  return brandingCore.colors;
}

/**
 * Récupère une variable CSS du thème
 */
export function getCSSVar(varName: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}
