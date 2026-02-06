# Politique de Sécurité - Komuno

## Versions Supportées

| Version | Supportée          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Signaler une Vulnérabilité

La sécurité de Komuno est une priorité. Si vous découvrez une vulnérabilité de sécurité, nous vous remercions de nous la signaler de manière responsable.

### Comment Signaler

**NE CRÉEZ PAS d'issue publique pour les vulnérabilités de sécurité.**

Envoyez un email à : **security@robinswood.io**

Incluez dans votre rapport :

1. **Description** de la vulnérabilité
2. **Étapes pour reproduire** le problème
3. **Impact potentiel** de la vulnérabilité
4. **Version affectée** de Komuno
5. **Suggestions de correction** (si vous en avez)

### Délai de Réponse

- **Accusé de réception** : Sous 48 heures
- **Évaluation initiale** : Sous 7 jours
- **Correction** : Selon la gravité (voir ci-dessous)
- **Divulgation publique** : Après correction et déploiement

### Gravité et Délais

| Gravité | Description | Délai de correction |
|---------|-------------|---------------------|
| **Critique** | Exécution de code à distance, accès admin non autorisé | 24-48 heures |
| **Haute** | Fuite de données sensibles, contournement d'authentification | 7 jours |
| **Moyenne** | XSS stocké, CSRF, injection SQL limitée | 30 jours |
| **Basse** | Fuite d'informations mineures, bonnes pratiques | 90 jours |

## Bonnes Pratiques de Sécurité

### Pour les Administrateurs

1. **Mots de passe forts** - Utilisez des mots de passe d'au moins 16 caractères
2. **2FA** - Activez l'authentification à deux facteurs via Authentik
3. **HTTPS** - Toujours utiliser HTTPS en production (configuré via Traefik)
4. **Mises à jour** - Appliquez les mises à jour de sécurité rapidement
5. **Sauvegardes** - Effectuez des sauvegardes régulières et testez-les
6. **Logs** - Surveillez les logs pour détecter les activités suspectes

### Pour les Développeurs

1. **Validation des entrées** - Validez toutes les entrées utilisateur (Zod v4)
2. **Requêtes préparées** - Utilisez Drizzle ORM (protection SQL injection)
3. **Échappement** - React échappe automatiquement (protection XSS)
4. **CORS** - Configuration stricte via NestJS
5. **Headers de sécurité** - Configurés via Traefik/Next.js
6. **Secrets** - Ne jamais committer de secrets dans le code

### Variables d'Environnement Sensibles

Ces variables ne doivent **JAMAIS** être exposées :

```
DATABASE_URL
SESSION_SECRET
S3_SECRET_ACCESS_KEY
MINIO_ROOT_PASSWORD
SMTP_PASSWORD
OAUTH_CLIENT_SECRET
```

## Périmètre de Sécurité

### Dans le périmètre

- Application Komuno (frontend Next.js)
- API Backend (NestJS)
- Base de données PostgreSQL
- Stockage MinIO
- Authentification Authentik

### Hors périmètre

- Services tiers (HelloAsso, etc.)
- Infrastructure hébergeur (OVH, etc.)
- Navigateurs et systèmes d'exploitation des utilisateurs

## Reconnaissance

Nous remercions les chercheurs en sécurité qui nous aident à améliorer Komuno. Les contributeurs significatifs seront mentionnés (avec leur accord) dans nos notes de version.

## Historique des Vulnérabilités

| Date | Version | Gravité | Description | Statut |
|------|---------|---------|-------------|--------|
| - | - | - | Aucune vulnérabilité signalée à ce jour | - |

---

**Contact sécurité :** security@robinswood.io

Merci de contribuer à la sécurité de Komuno !
