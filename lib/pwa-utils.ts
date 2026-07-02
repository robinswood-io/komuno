// Utilitaires PWA pour améliorer l'expérience utilisateur
import { getShortAppName } from '@/config/branding';

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

export const PWAUtils = {
  // Vérifier si l'app est installée
  isAppInstalled(): boolean {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInWebAppiOS = (window.navigator as IOSNavigator).standalone === true;
    
    return isStandalone || (isIOS && isInWebAppiOS);
  },

  // Vérifier si l'installation est supportée
  isInstallSupported(): boolean {
    return 'serviceWorker' in navigator && 'beforeinstallprompt' in window;
  },

  // Vérifier le statut de la connexion
  isOnline(): boolean {
    return navigator.onLine;
  },

  // Obtenir les informations de cache du Service Worker
  async getCacheInfo(): Promise<Record<string, number>> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data || {});
        };
        
        navigator.serviceWorker.controller!.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
      });
    }
    return {};
  },

  // Forcer la mise à jour du Service Worker
  async updateServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  },

  // Nettoyer les anciens caches
  async clearOldCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const currentVersion = 'v1.0.0';
      
      await Promise.all(
        cacheNames
          .filter(name => !name.includes(currentVersion))
          .map(name => caches.delete(name))
      );
    }
  },

  // Précharger des ressources critiques
  async preloadCriticalResources(urls: string[]): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const cache = await caches.open('cjd-amiens-v1.0.0');
      
      const preloadPromises = urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          // Silencieux en production, debug seulement en développement
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[PWA] Échec préchargement de ${url}:`, error);
          }
        }
      });
      
      await Promise.allSettled(preloadPromises);
    }
  },

  // Enregistrer les métriques de performance PWA
  logPerformanceMetrics(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Navigation Timing - logs seulement en développement
      if (process.env.NODE_ENV === 'development') {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const navigation = navigationEntries[0];
          console.log('[PWA] Métriques de navigation:', {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            ttfb: navigation.responseStart - navigation.requestStart
          });
        }

        // Resource Timing pour les assets PWA
        const resourceEntries = performance.getEntriesByType('resource');
        const pwaResources = resourceEntries.filter(entry => 
          entry.name.includes('/sw.js') || 
          entry.name.includes('/manifest.json') ||
          entry.name.includes('/icon-')
        );
        
        if (pwaResources.length > 0) {
          console.log('[PWA] Ressources PWA chargées:', pwaResources.length);
        }
      }
    }
  },

  // Détecter les capacités de l'appareil
  getDeviceCapabilities(): {
    hasCamera: boolean;
    hasGeolocation: boolean;
    hasNotifications: boolean;
    hasVibration: boolean;
    isOnline: boolean;
    storage: string;
  } {
    return {
      hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      hasGeolocation: 'geolocation' in navigator,
      hasNotifications: 'Notification' in window,
      hasVibration: 'vibrate' in navigator,
      isOnline: navigator.onLine,
      storage: 'storage' in navigator && typeof navigator.storage?.estimate === 'function' ? 'Disponible' : 'Inconnu'
    };
  },

  // Gestion intelligente des notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  },

  // Afficher une notification PWA
  showNotification(title: string, options: NotificationOptions = {}): void {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          tag: 'cjd-amiens-notification',
          ...options
        });
      });
    }
  },

  // Détecter le système d'exploitation
  getOperatingSystem(): 'ios' | 'android' | 'desktop' | 'other' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/ipad|iphone|ipod/.test(userAgent)) {
      return 'ios';
    }
    
    if (/android/.test(userAgent)) {
      return 'android';
    }
    
    if (/windows|mac|linux/.test(userAgent) && !/android|iphone|ipad|ipod/.test(userAgent)) {
      return 'desktop';
    }
    
    return 'other';
  },

  // Vérifier si l'installation PWA est possible
  canInstallPWA(): boolean {
    const os = this.getOperatingSystem();
    
    // iOS : toujours possible (instructions manuelles)
    if (os === 'ios') {
      return !this.isAppInstalled();
    }
    
    // Android/Desktop : vérifier le support beforeinstallprompt
    if (os === 'android' || os === 'desktop') {
      return 'serviceWorker' in navigator && !this.isAppInstalled();
    }
    
    return false;
  },

  // Obtenir les instructions d'installation selon l'OS
  getInstallInstructions(): {
    title: string;
    steps: string[];
    icon: string;
  } {
    const os = this.getOperatingSystem();
    
    if (os === 'ios') {
      return {
        title: `Installer ${getShortAppName()} sur votre iPhone/iPad`,
        steps: [
          'Appuyez sur le bouton "Partager" en bas de Safari',
          'Sélectionnez "Sur l\'écran d\'accueil"',
          'Appuyez sur "Ajouter" pour confirmer'
        ],
        icon: '📱'
      };
    }
    
    if (os === 'android') {
      return {
        title: `Installer ${getShortAppName()} sur votre appareil Android`,
        steps: [
          'Appuyez sur "Installer l\'application" ci-dessous',
          'Confirmez l\'installation dans la pop-up',
          'L\'application apparaîtra sur votre écran d\'accueil'
        ],
        icon: '🤖'
      };
    }
    
    return {
      title: `Installer ${getShortAppName()} sur votre ordinateur`,
      steps: [
        'Cliquez sur "Installer l\'application" ci-dessous',
        'Confirmez l\'installation dans votre navigateur',
        'L\'application apparaîtra dans vos applications'
      ],
      icon: '💻'
    };
  },

  // Vérifier si l'appareil est mobile
  isMobileDevice(): boolean {
    const os = this.getOperatingSystem();
    return os === 'ios' || os === 'android';
  },

  // Obtenir les informations du navigateur
  getBrowserInfo(): {
    name: string;
    supportsInstall: boolean;
    isStandalone: boolean;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    let browserName = 'Unknown';
    let supportsInstall = false;

    if (userAgent.includes('safari') && userAgent.includes('ios')) {
      browserName = 'Safari iOS';
      supportsInstall = true;
    } else if (userAgent.includes('chrome') && userAgent.includes('android')) {
      browserName = 'Chrome Android';
      supportsInstall = true;
    } else if (userAgent.includes('samsung')) {
      browserName = 'Samsung Internet';
      supportsInstall = true;
    } else if (userAgent.includes('edge')) {
      browserName = 'Microsoft Edge';
      supportsInstall = true;
    } else if (userAgent.includes('chrome')) {
      browserName = 'Google Chrome';
      supportsInstall = true;
    } else if (userAgent.includes('firefox')) {
      browserName = 'Mozilla Firefox';
      supportsInstall = false; // Firefox ne supporte pas l'installation PWA
    }

    return {
      name: browserName,
      supportsInstall,
      isStandalone: this.isAppInstalled()
    };
  }
};

// Auto-initialisation des métriques
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => PWAUtils.logPerformanceMetrics(), 1000);
  });
}