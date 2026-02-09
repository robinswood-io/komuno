# ===================================
# Stage 1: Builder - Construction de l'application
# ===================================
FROM oven/bun:1-alpine AS bun-stage
FROM node:20-alpine AS builder

# Copier Bun depuis l'image officielle
COPY --from=bun-stage /usr/local/bin/bun /usr/local/bin/bun
COPY --from=bun-stage /usr/local/bin/bunx /usr/local/bin/bunx

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY .npmrc* ./

# Installer les deps via npm (registre privé Verdaccio pour @robinswood/*)
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copier le code source
COPY . .

# Augmenter la limite de mémoire Node.js pour éviter les erreurs "heap out of memory"
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=3072
# Build frontend + backend (Next.js utilise Node, Bun orchestre)
RUN bun run build

# ===================================
# Stage 2: Runner - Image de production
# ===================================
FROM node:20-alpine AS runner

WORKDIR /app

# Installer wget pour les health checks
RUN apk add --no-cache wget

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S cjd && adduser -S cjduser -G cjd

# Copier package.json et node_modules complets depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copier les fichiers nécessaires pour les migrations
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts/run-migrations.sh ./scripts/run-migrations.sh

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public

# Créer le dossier logs et symlink pour @shared (alias vers shared)
RUN mkdir -p /app/logs /app/node_modules && \
    ln -sf /app/shared /app/node_modules/@shared && \
    chown -R cjduser:cjd /app

# Charger le loader ESM pour la résolution des imports sans extension
COPY --from=builder /app/server/esm-loader.js ./server/esm-loader.js

# Copier le script de démarrage
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && \
    chmod +x /app/scripts/run-migrations.sh && \
    chown -R cjduser:cjd /app/docker-entrypoint.sh /app/scripts

# Utiliser l'utilisateur non-root
USER cjduser

# Exposer les ports (NextJS:3000, NestJS:5000)
EXPOSE 3000 5000

# Build arg pour le tag Git
ARG GIT_TAG=main-unknown

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000
ENV GIT_TAG=${GIT_TAG}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Commande de démarrage (NextJS + NestJS via script shell)
CMD ["./docker-entrypoint.sh"]
