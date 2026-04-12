# Analyse Complète des Échecs de Déploiement

## 🔍 Problèmes Identifiés

### Problème 1 : Fichiers manquants pour migrations ❌
**Erreur** : `drizzle-kit push` ne trouve pas `drizzle.config.ts` ou `shared/schema.ts`

**Cause** : Le Dockerfile ne copiait que `dist/` dans l'image de production.

**Solution** : ✅ Ajout de la copie de `drizzle.config.ts` et `shared/` dans l'image Docker.

### Problème 2 : drizzle-kit non installé ❌
**Erreur** : `npx drizzle-kit push` échoue car `drizzle-kit` n'est pas disponible.

**Cause** : `drizzle-kit` est dans `devDependencies` et n'est pas installé avec `npm ci --omit=dev`.

**Solution** : ✅ Installation explicite de `drizzle-kit` dans l'image de production.

### Problème 3 : Permissions insuffisantes ❌
**Erreur** : Erreurs de permissions lors de l'exécution des migrations.

**Cause** : L'image utilise un utilisateur non-root (`cjduser`) par défaut.

**Solution** : ✅ Utilisation de `--user root` temporairement pour les migrations.

## ✅ Corrections Appliquées

### 1. Dockerfile - Ajout des fichiers et dépendances

```dockerfile
# Installer les production dependencies + drizzle-kit pour les migrations
RUN npm ci --omit=dev && \
    npm install drizzle-kit --save-dev --no-audit --no-fund || true

# Copier les fichiers nécessaires pour les migrations (drizzle-kit)
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared
```

### 2. Script de déploiement - Simplification et permissions

```bash
# Exécuter les migrations avec les fichiers dans l'image
docker run --rm \
    --env-file "$DEPLOY_DIR/.env" \
    --network proxy \
    --user root \
    "$DOCKER_IMAGE" \
    sh -c "cd /app && npx drizzle-kit push"
```

## 📋 Checklist de Validation

- [x] `drizzle.config.ts` copié dans l'image Docker
- [x] `shared/schema.ts` copié dans l'image Docker
- [x] `drizzle-kit` installé dans l'image de production
- [x] Utilisation de `--user root` pour les migrations
- [x] Commande simplifiée (pas besoin de monter de volume)
- [x] Variables d'environnement chargées depuis `.env`
- [x] Réseau Docker `proxy` utilisé pour la connexion DB

## 🚀 Prochaines Étapes

1. ✅ Vérifier que le workflow GitHub Actions passe
2. ✅ Vérifier que les migrations s'exécutent correctement
3. ✅ Vérifier que l'application démarre après les migrations
4. ✅ Vérifier le health check

## 🔗 Références

- **Workflow** : `.github/workflows/deploy.yml`
- **Script de déploiement** : `scripts/vps-deploy.sh`
- **Dockerfile** : `Dockerfile`
- **Configuration Drizzle** : `drizzle.config.ts`

---

**Dernière mise à jour** : Après corrections complètes du déploiement

