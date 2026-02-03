import { useState, useEffect } from 'react';
import { PWAUtils } from '@/lib/pwa-utils';

// // interface NotificationSubscription {
//   endpoint: string;
//   keys: {
//     p256dh: string;
//     auth: string;
//   };
// }

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Vérifier le support des notifications push
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      // Récupérer l'état initial des permissions
      setPermission(Notification.permission);
      
      // Vérifier s'il y a déjà un abonnement
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('[Notifications] Erreur vérification abonnement:', error);
    }
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    try {
      const result = await PWAUtils.requestNotificationPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('[Notifications] Erreur demande permission:', error);
      return 'denied';
    }
  };

  const subscribe = async (): Promise<boolean> => {
    try {
      // Demander la permission si nécessaire
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          return false;
        }
      }

      // S'abonner aux notifications push
      const registration = await navigator.serviceWorker.ready;
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await getVapidPublicKey()
      });

      // Envoyer l'abonnement au serveur
      const success = await savePushSubscription(pushSubscription);
      
      if (success) {
        setSubscription(pushSubscription);
        setIsSubscribed(true);
        
        // Notification de confirmation
        PWAUtils.showNotification('Notifications activées !', {
          body: 'Vous recevrez maintenant des notifications pour les nouvelles idées et événements',
          icon: '/icon-192.svg',
          tag: 'subscription-success'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Notifications] Erreur abonnement:', error);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      if (!subscription) return false;

      // Désabonner du service push
      const success = await subscription.unsubscribe();
      
      if (success) {
        // Supprimer l'abonnement du serveur
        await removePushSubscription(subscription);
        
        setSubscription(null);
        setIsSubscribed(false);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Notifications] Erreur désabonnement:', error);
      return false;
    }
  };

  const testNotification = async (): Promise<void> => {
    if (permission === 'granted') {
      PWAUtils.showNotification('Test de notification', {
        body: 'Les notifications fonctionnent correctement !',
        icon: '/icon-192.svg',
        tag: 'test-notification'
      });
    }
  };

  return {
    // État
    permission,
    isSubscribed,
    isSupported,
    subscription,
    
    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
    
    // Utilitaires
    canSubscribe: isSupported && permission !== 'denied',
    needsPermission: permission === 'default',
    hasPermission: permission === 'granted'
  };
}

// Fonctions utilitaires pour interagir avec le serveur
async function getVapidPublicKey(): Promise<BufferSource> {
  try {
    const response = await fetch('/api/notifications/vapid-key');
    const { publicKey } = await response.json();
    return urlBase64ToUint8Array(publicKey);
  } catch (error) {
    console.error('[Notifications] Erreur récupération clé VAPID:', error);
    // Clé VAPID par défaut pour le développement
    return urlBase64ToUint8Array('BM_example_default_vapid_key_for_development_only');
  }
}

async function savePushSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Notifications] Erreur sauvegarde abonnement:', error);
    return false;
  }
}

async function removePushSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Notifications] Erreur suppression abonnement:', error);
    return false;
  }
}

// Utilitaires de conversion
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return window.btoa(binary);
}