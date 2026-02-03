import { Injectable } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { logger } from '../../lib/logger';
import type { Admin } from '../../../shared/schema';

// Cache en mémoire pour éviter les requêtes DB répétées
const userCache = new Map<string, { user: Admin; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AuthService {
  constructor(private storageService: StorageService) {
    // Nettoyage périodique du cache
    setInterval(() => {
      const now = Date.now();
      userCache.forEach((cached, email) => {
        if ((now - cached.timestamp) >= CACHE_TTL) {
          userCache.delete(email);
        }
      });
    }, CACHE_TTL);
  }

  /**
   * Désérialiser l'utilisateur depuis la session (email)
   * Utilisé par Passport pour récupérer l'utilisateur depuis la session
   */
  async deserializeUser(email: string): Promise<Admin | null> {
    try {
      // Vérifier le cache d'abord
      const cached = userCache.get(email);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.user;
      }

      // Si pas en cache ou expiré, requête DB
      const userResult = await this.storageService.storage.getUser(email);
      if (userResult.success && userResult.data) {
        // Mettre en cache
        userCache.set(email, { user: userResult.data, timestamp: now });
        return userResult.data;
      } else {
        // Supprimer du cache si l'utilisateur n'existe plus
        userCache.delete(email);
        return null;
      }
    } catch (error) {
      logger.error('[Auth] Erreur lors de la désérialisation', { error });
      userCache.delete(email); // Nettoyer le cache en cas d'erreur
      throw error;
    }
  }

  /**
   * Sérialiser l'utilisateur pour la session
   * Retourne l'email de l'utilisateur
   */
  serializeUser(user: Admin): string {
    return user.email;
  }

  /**
   * Obtenir l'utilisateur actuel sans le mot de passe
   */
  getUserWithoutPassword(user: Admin): Omit<Admin, 'password'> {
    if (!user) return null as any; // Runtime guard, TS allows null for compatibility
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

