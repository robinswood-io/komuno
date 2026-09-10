# Exploitation Komuno

**Responsable :** exploitant de l’instance  
**Dernière revue :** 2026-09-10 — revue semestrielle

## Santé et alertes

Surveiller toutes les cinq minutes : santé de l’application, PostgreSQL, Redis, MinIO, mémoire et disque. Seuils disque : avertissement 75 %, critique 85 %, urgence 92 %. À 75 %, établir la projection à 90 jours ; à 85 %, programmer l’extension ; à 92 %, geler les déploiements.

## Sauvegarder

Depuis le répertoire Compose, fournir `AGE_RECIPIENT`, `OFFSITE_DIR` et exécuter `scripts/backup-komuno.sh`. La sortie confirme l’archive chiffrée locale et sa copie hors hôte. Aucun fichier d’environnement contenant des secrets n’est inclus.

## Tester la restauration

Chaque mois, depuis un hôte séparé, fournir `AGE_IDENTITY`, `RESTORE_ARCHIVE`, puis exécuter `RUN_BACKUP_RESTORE_INTEGRATION=1 scripts/test-backup-restore.sh`. Le test crée un PostgreSQL temporaire, vérifie les empreintes, restaure la base et lit l’archive MinIO sans toucher à la production. Consigner RPO, RTO et nombre de tables.

## Mettre à jour et revenir en arrière

Déployer uniquement une image par digest et produire `release-manifest.json` avec `scripts/generate-release-manifest.sh`. Avant remplacement, noter l’identifiant de l’image courante comme retour arrière. Conserver l’image courante et cette image précédente. Ne jamais utiliser `docker image prune` ; toute suppression passe par `scripts/remove-images-bounded.sh` avec des identifiants explicites.

La matrice [compatibilité application/schéma](release-compatibility.json) précise le plan de retour arrière. Une migration non rétrocompatible interdit un retour binaire sans restauration de sauvegarde testée.

## Incident

1. Geler déploiements et migrations.
2. Noter heure, instance, commit, digest, symptômes et identifiant de corrélation.
3. Préserver journaux et preuves ; ne pas exposer de secret.
4. Revenir à l’image précédente seulement si le schéma est compatible.
5. Sinon restaurer dans un environnement isolé, décider du point de reprise puis exécuter la procédure autorisée.
6. Après résolution, vérifier parcours public, authentification, files de tâches, sauvegarde et alertes.
