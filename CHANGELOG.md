# Changelog

Tous les changements notables de ce projet sont documentes dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et [Semantic Versioning](https://semver.org/lang/fr/).

## [2.2.4] - 2026-06-18

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Use CJD Amiens logo

## [2.2.3] - 2026-06-18

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Restore CJD public logo assets

## [2.2.2] - 2026-06-18

### En bref

- Cette version apporte des ajustements techniques.

### Maintenance

- Tag REP compose image from digest

## [2.2.1] - 2026-06-18

### En bref

- Cette version apporte des ajustements techniques.

### Maintenance

- Retry REP public smoke checks

## [2.2.0] - 2026-06-18

### En bref

- Cette version apporte 1 nouveaute(s).

### Nouveautes

- Add annual member groups

## [2.1.15] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Rendre les smoke tests publics REP stricts (404 interdit)

## [2.1.14] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Fiabiliser routage REP apex+www et verrouiller DOMAIN/APP_NAME

## [2.1.13] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Ajouter smoke test public bloquant pour rep

## [2.1.12] - 2026-05-06

### En bref

- Cette version apporte des ajustements techniques.

### Maintenance

- Tracer exposition port compose rep

## [2.1.11] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Déclencher deploy sur changements compose

## [2.1.10] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Exposer le port app en prod pour repicardie

## [2.1.9] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Auto-répare la connexion traefik_public côté REP

## [2.1.8] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Assouplit le contrôle de restart au bootstrap REP

## [2.1.7] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Déploie aussi les dépendances REP depuis compose

## [2.1.6] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Fiabilise deploy REP (réseau externe + healthcheck flexible)

## [2.1.5] - 2026-05-06

### En bref

- Cette version apporte des ajustements techniques.

### Maintenance

- Ajoute docker-compose.prod.yml à la racine pour le déploiement REP

## [2.1.4] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Limite le déploiement REP aux compose de production

## [2.1.3] - 2026-05-06

### En bref

- Cette version apporte 1 correction(s).

### Corrections

- Fiabilise le déploiement REP avec détection compose/service

## [2.1.2] - 2026-05-06

### En bref

- Cette version apporte des ajustements techniques.

### Maintenance

- Versionne l'intégralité des artefacts restants
- Ajout massif de tests unitaires multi-vagues

## [2.1.1] - 2026-05-01

### En bref

- Cette version apporte des ajustements techniques.

### Maintenance

- Finaliser et nettoyer le repo komuno
- Synchronise la version locale du repo komuno

## [2.1.0] - 2026-04-12

### En bref

- Cette version apporte 21 nouveaute(s), 68 correction(s), 4 amelioration(s).

### Nouveautes

- Gestion admin des inscriptions aux événements
- Email de notification admin (notification_email) pour les rappels de tâches
- Conversion automatique prospect Signé → membre actif
- Drag & drop kanban Pipeline CRM
- Titre onglet dynamique via generateMetadata SSR
- Filtrage serveur prospects/membres (onlyProspects + excludeProspects)
- Pipeline CRM REP - phases Qualification/R1/R2/Contractualisation
- Section CRM Contacts feature-flagged (crm disabled par défaut)
- Séparation Membres/Prospects dans le menu + page pipeline CRM
- Actions en masse sur les membres (supprimer, cotisation)
- Réseau de connexions, recherche SIRET, corrections API
- Vue kanban pipeline prospection + opérations en masse (bulk status/export)
- Historique interactions membres (appels, RDV, emails, dejeuners)
- Service email + rappels automatiques tâches dues (cron 8h00 quotidien)
- Page détail parrain avec onglets contacts/dons/interactions/propositions
- Enrichir onglets Notifications et Apparence dans paramètres
- Refonte complète des paramètres et gestion des modules
- Ajouter lien Statuts dans sidebar CRM
- Interface admin gestion statuts membres
- Nettoyage automatique images Docker dans workflow
- Module outils du dirigeant + corrections UI

### Corrections

- TS2345 — prospectionStatus nullable dans updateMemberSchema pour conversion Signé→membre
- Rappels tâches — 9h Paris, jour J uniquement, config SMTP depuis DB
- Branding save (PUT /api/admin/branding) + migration prospects pipeline
- DynamicTitle attend la fin du chargement branding avant de mettre à jour le titre
- Extraire smtpHost hors du bloc narrowed (TS strict)
- TS strict narrowing sur configResult.data
- Test email envoie vers fromEmail (pas l'email admin fictif)
- SMTP username/password manquants dans email_config
- GenerateMetadata utilise cache no-store (NestJS absent au build)
- Migration 0016 — réparer colonnes members manquantes sur repicardie.fr
- Migration 0015 — garantir prospection_status sur repicardie.fr
- Object.keys(modules) crash sur repicardie.fr admin/settings
- Email-templates helpers acceptent context optionnel (TS strict CI)
- CreateTestEmailTemplate - context et styles manquants (fix CI build)
- Modules ne doit jamais être null après hydration branding
- Merge DB features with defaults to expose new feature flags
- Initialiser modules depuis brandingCore pour éviter le spinner infini
- Migration 0013 - upsert setup admin avec hash correct
- Corriger le hash bcrypt du compte setup@admin.cjd (migration 0012)
- Seed admin initial si DB vierge (migration 0011)
- Créer la table user_sessions via migration + createTableIfMissing true
- Service name 'app' au lieu de 'rep-app' dans docker compose (deploy REP)
- Attendre que NestJS soit prêt avant smoke tests (polling /api/health)
- Supprimer doublons ALTER TABLE dans migration 0003
- Déballer la réponse API enveloppée dans la page détail mécène
- Support DATABASE_URL_SUPERUSER pour DDL (ALTER TABLE)
- Seed historique 0000-0006 pour éviter crash-loop prod
- Migration 0009 v2 avec DO block pour éviter crash-loop prod
- Ajouter migration 0009 pour colonnes membres manquantes en prod
- Ajouter migration 0008 (force add)
- Gérer erreur permissions avec migration corrective
- Améliorer health check déploiement avec détection restarts
- Installer postgresql-client pour les migrations
- Ajouter migration corrective pour colonnes manquantes
- Améliorer système de migrations avec tracking et gestion d'erreurs
- Tagger l'image pullée pour docker-compose CJD80
- Forcer recréation conteneur lors du déploiement
- Fix API 502 errors: Add Next.js API route proxy handler
- Router Traefik séparé pour API (port 5000) et frontend (port 3000)
- Copier fichiers statiques Next.js standalone correctement
- Imports et types TypeScript member-statuses
- Utiliser Dockerfile standard (optimized incomplet)
- Syntaxe Bun install (--production sans valeur)
- Augmenter RAM build + API statuts membres personnalisables
- Npm ci pour deps (registre privé Verdaccio), bun run pour build
- Deploy-rep utilise image GHCR au lieu du build local (OOM)
- Déploiement REP via self-hosted runner et corrections entrypoint
- Utiliser calcul automatique de contraste dans ThemeScript
- Appliquer calcul contraste dans thème dark + user info
- Calcul automatique du contraste et élimination du flash de thème
- Gestion automatique du contraste texte dans le menu admin
- Exécuter migrations SQL directement avec psql au démarrage
- Ajouter exécution automatique des migrations DB au démarrage
- Correction du domaine de cookie de session pour production
- Supprimer dernière référence à setupVite dans server/index.ts
- Désactiver ViteModule pour permettre NextJS de gérer les routes
- Augmenter limite rate limiting et exclure healthchecks
- Script de démarrage robuste pour NextJS + NestJS
- Ajouter build NextJS et lancer Next+NestJS en production
- Copier tous les node_modules pour résoudre les dépendances manquantes en production
- Utiliser le service cjd-app au lieu de cjd80
- Chemin correct /docker/cjd80 pour le déploiement
- Utiliser docker-compose.yml au lieu de docker-compose.apps.yml
- Configuration REP avec fallback vers VPS secrets
- Chemin de déploiement CJD80 vers /home/thibault
- Utiliser les secrets VPS existants au lieu de CJD80
- Utiliser npm/node au lieu de bun pour le build Docker
- Corrections TypeScript et configuration Traefik

### Ameliorations

- Migration complète Vite→NestJS+NextJS + correctifs prod
- Supprimer tout usage de 'any' dans member-statuses
- Utiliser Bun pour l'installation des deps et le build Docker
- Supprimer Vite complètement et fixer clignottement thème

### Maintenance

- Met a jour les dependances et nettoie le worktree
- Nettoie docs et compose legacy inutiles
- Supprime les artefacts cursor/claude/bmad/playwright
- Supprime les fichiers legacy à la racine
- Synchronise les lockfiles npm et bun
- Corrige la suite vitest pour komuno\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>
- Préparation open source du repository
- Migration Tailwind v3 → v4 (postcss, directives, config)
- Validation migrations en CI avant déploiement + robustesse script
- Améliorer pipelines deploy cjd80.fr + repicardie.fr
- Détecter changements scripts/run-migrations.sh et docker-entrypoint.sh
- Améliorer workflows et ajouter validation de thème
- Supprimer workflow redondant deploy.yml
- Invalider cache Docker (next.config.js)
- Invalider cache Docker pour rebuild CSS
- Ajouter documentation et scripts pour migrations DB

## [2.0.0] - 2026-02-06

### Ajoute

- Support multi-tenant (plusieurs organisations sur une base de code)
- Branding dynamique via interface admin (logo, couleurs, textes)
- Toggle d'affichage du logo dans le header
- CI/CD GitHub Actions (build Docker + deploiement)
- Systeme de cotisations avec types reutilisables
- Graphe de relations membres
- Exports PDF/Excel
- Notifications integrees
- Templates GitHub (issues, PR)

### Modifie

- Migration frontend vers Next.js 16 + Turbopack
- Migration backend vers NestJS 11
- Migration React 19
- Migration Zod v4
- Rebranding du projet sous le nom Komuno
- Optimisations Docker pour le developpement
- Licence du projet basculee vers MIT

### Corrige

- Stabilisation du hot reload
- Correctifs memoire (OOM) en environnement de dev

### Securite

- Ajout d'une politique de securite (`SECURITY.md`)
- Renforcement de la configuration CORS

## [1.0.0] - 2025-01-15

### Ajoute

- Version initiale de la plateforme
- Module idees avec votes
- Module evenements avec inscriptions
- Module membres/CRM
- Module pret de materiel
- Authentification OAuth2/OIDC
- Frontend React
- Backend Express.js
- PostgreSQL + Drizzle ORM

---

## Types de changements

- **Ajoute** pour les nouvelles fonctionnalites
- **Modifie** pour les changements de comportement
- **Deprecie** pour les fonctionnalites a retirer prochainement
- **Supprime** pour les fonctionnalites retirees
- **Corrige** pour les corrections de bugs
- **Securite** pour les changements de securite
