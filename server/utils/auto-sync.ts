import { storage } from "../storage";
import { syncGitHubIssueStatus } from "./github-integration";
import { statusFromGitHub, toStorageStatus } from "./development-request-status";

/**
 * Synchronise automatiquement toutes les demandes de développement avec GitHub
 */
export async function autoSyncAllDevelopmentRequests(): Promise<void> {
  try {
    console.log("[Auto-Sync] Début de la synchronisation automatique...");
    
    // Récupérer toutes les demandes
    const result = await storage.getDevelopmentRequests();
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      console.error("[Auto-Sync] Erreur récupération des demandes:", error.message);
      return;
    }

    const requests = result.data;
    const requestsWithGitHub = requests.filter(req => req.githubIssueNumber);
    
    if (requestsWithGitHub.length === 0) {
      console.log("[Auto-Sync] Aucune demande avec issue GitHub à synchroniser");
      return;
    }

    console.log(`[Auto-Sync] Synchronisation de ${requestsWithGitHub.length} demande(s) avec GitHub...`);
    
    let syncSuccess = 0;
    let syncErrors = 0;

    // Synchroniser chaque demande
    for (const request of requestsWithGitHub) {
      try {
        const githubStatus = await syncGitHubIssueStatus(request.githubIssueNumber!);
        
        if (githubStatus) {
          const nextStatus = statusFromGitHub(githubStatus.status, githubStatus.labels);
          const storageStatus = toStorageStatus(nextStatus);
          // Mettre à jour le statut local si différent
          const needsUpdate = 
            request.githubStatus !== githubStatus.status ||
            request.status !== storageStatus;
            
          if (needsUpdate) {
            const updateResult = await storage.updateDevelopmentRequest(request.id, {
              githubStatus: githubStatus.status,
              status: storageStatus,
              lastSyncedAt: new Date()
            });
            
            if (updateResult.success) {
              console.log(`[Auto-Sync] ✓ Demande ${request.id} synchronized (${request.title})`);
              syncSuccess++;
            } else {
              const error = 'error' in updateResult ? updateResult.error : new Error('Unknown error');
              console.error(`[Auto-Sync] ✗ Erreur mise à jour demande ${request.id}:`, error.message);
              syncErrors++;
            }
          } else {
            console.log(`[Auto-Sync] - Demande ${request.id} déjà à jour`);
            syncSuccess++;
          }
        } else {
          console.error(`[Auto-Sync] ✗ Impossible de récupérer le statut GitHub pour la demande ${request.id}`);
          syncErrors++;
        }
      } catch (error) {
        console.error(`[Auto-Sync] ✗ Erreur synchronisation demande ${request.id}:`, error);
        syncErrors++;
      }
      
      // Petite pause pour éviter les rate limits GitHub
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Auto-Sync] Synchronisation terminée: ${syncSuccess} réussies, ${syncErrors} erreurs`);
    
  } catch (error) {
    console.error("[Auto-Sync] Erreur générale de synchronisation:", error);
  }
}

/**
 * Démarre la synchronisation automatique toutes les heures
 */
export function startAutoSync(): void {
  const SYNC_INTERVAL = 60 * 60 * 1000; // 1 heure en millisecondes
  
  console.log("[Auto-Sync] Démarrage de la synchronisation automatique toutes les heures");
  
  // Première synchronisation après 5 minutes de démarrage
  setTimeout(() => {
    autoSyncAllDevelopmentRequests();
  }, 5 * 60 * 1000);
  
  // Ensuite toutes les heures
  setInterval(() => {
    autoSyncAllDevelopmentRequests();
  }, SYNC_INTERVAL);
  
  console.log("[Auto-Sync] Système de synchronisation automatique configuré");
}
