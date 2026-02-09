/**
 * Script inline pour appliquer le thème AVANT l'hydration React
 * Évite le flash de thème (FOUC - Flash of Unstyled Content)
 * Charge aussi les variables CSS critiques pour éviter le flash de couleurs
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

        // Appliquer les variables CSS critiques immédiatement pour éviter le flash
        // Ces valeurs correspondent aux variables définies dans globals.css
        const root = document.documentElement;
        root.style.setProperty('--primary', '140 69% 33%');

        // Fonction pour calculer si le texte doit être noir ou blanc selon la luminosité du fond
        function getContrastTextColor(h, s, l) {
          // Si luminosité > 50%, fond clair -> texte noir
          // Sinon, fond foncé -> texte blanc
          return l > 50 ? '0 0% 0%' : '0 0% 100%';
        }

        // Appliquer les bonnes valeurs selon le thème
        if (activeTheme === 'dark') {
          // Thème dark: fond foncé (L=7.8%), texte blanc
          root.style.setProperty('--sidebar-accent', '205.7143 70% 7.8431%');
          root.style.setProperty('--sidebar-accent-foreground', getContrastTextColor(205.7143, 70, 7.8431));
        } else {
          // Thème light: fond clair (L=92%), texte noir
          root.style.setProperty('--sidebar-accent', '211.5789 51.3514% 92.7451%');
          root.style.setProperty('--sidebar-accent-foreground', getContrastTextColor(211.5789, 51.3514, 92.7451));
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
