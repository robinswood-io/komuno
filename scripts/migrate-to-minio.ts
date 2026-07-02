#!/usr/bin/env tsx
/**
 * Script de migration des fichiers locaux vers MinIO
 * 
 * Usage:
 *   tsx scripts/migrate-to-minio.ts [--delete]
 * 
 * Options:
 *   --delete: Supprimer les fichiers locaux après migration réussie
 */

import { getMinIOService } from '../server/services/minio-service.js';
import { logger } from '../server/lib/logger.js';

async function main() {
  const deleteAfterMigration = process.argv.includes('--delete');

  console.log('🚀 Démarrage de la migration vers MinIO...');
  console.log(`Mode: ${deleteAfterMigration ? 'Migration + Suppression' : 'Migration uniquement'}\n`);

  try {
    // Vérifier que les variables d'environnement sont configurées
    const requiredEnvVars = ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('⚠️  Variables d\'environnement manquantes:', missingVars.join(', '));
      console.warn('   Utilisation des valeurs par défaut...\n');
    }

    const minioService = getMinIOService();
    
    console.log('🔌 Connexion à MinIO...');
    await minioService.initialize();
    console.log('✅ MinIO initialisé\n');

    console.log('📦 Migration des fichiers...');
    const results = await minioService.migrateLocalFiles(deleteAfterMigration);

    console.log('\n📊 Résultats de la migration:');
    console.log(`  Photos de prêts: ${results.loanItems.success} migrées, ${results.loanItems.errors} erreurs`);
    console.log(`  Assets (logos): ${results.assets.success} migrés, ${results.assets.errors} erreurs`);

    const totalSuccess = results.loanItems.success + results.assets.success;
    const totalErrors = results.loanItems.errors + results.assets.errors;

    if (totalSuccess === 0 && totalErrors === 0) {
      console.log('\nℹ️  Aucun fichier à migrer');
      process.exit(0);
    } else if (totalErrors === 0) {
      console.log('\n✅ Migration terminée avec succès!');
      if (deleteAfterMigration) {
        console.log('🗑️  Fichiers locaux supprimés');
      } else {
        console.log('💡 Utilisez --delete pour supprimer les fichiers locaux après vérification');
      }
      process.exit(0);
    } else {
      console.log(`\n⚠️  Migration terminée avec ${totalErrors} erreur(s) sur ${totalSuccess + totalErrors} fichier(s)`);
      console.log('   Les fichiers en erreur n\'ont pas été migrés');
      process.exit(1);
    }
  } catch (error: unknown) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    logger.error('Migration to MinIO failed', { error });
    process.exit(1);
  }
}

main();

