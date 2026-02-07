/**
 * Script inline pour appliquer le thème AVANT l'hydration React
 * Évite le flash de thème (FOUC - Flash of Unstyled Content)
 */
export function ThemeScript() {
  // Script qui s'exécute avant React pour appliquer le thème sauvegardé
  const themeScript = `
    (function() {
      try {
        // Lire le thème depuis localStorage (clé utilisée par next-themes)
        const theme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

        // Appliquer le thème ou le thème système si pas de préférence
        const activeTheme = theme || systemTheme;

        if (activeTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        // En cas d'erreur, ne rien faire (garder light par défaut)
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
