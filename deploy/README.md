# Deploiement de Komuno

Ce dossier contient les fichiers necessaires pour installer et exploiter Komuno sur un serveur Linux avec Docker.

## Contenu

- `install.sh`: script d'installation automatisee
- `docker-compose.prod.yml`: stack de production
- `.env.example`: variables d'environnement de reference

## Prerequis serveur

- Docker Engine
- Docker Compose plugin
- Domaine DNS pointe vers votre serveur
- Reverse proxy HTTPS (Traefik, Nginx, Caddy, etc.)

Optionnel mais recommande:

- Reseau Docker partage `traefik_public` si Traefik est mutualise

```bash
docker network create traefik_public || true
```

## Installation rapide

```bash
export DOMAIN=example.org
export APP_NAME=komuno
export GHCR_USER=<github-user>
export GHCR_TOKEN=<github-token-read-packages>

curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/install.sh | bash
```

## Installation manuelle

```bash
mkdir -p /srv/workspace/komuno
cd /srv/workspace/komuno

curl -O https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/.env.example

cp .env.example .env
# editez .env

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Mise a jour

```bash
cd /srv/workspace/komuno
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Verification post-deploiement

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
curl -f https://<votre-domaine>/api/health
```

## Rollback (version image precedente)

1. Listez les images disponibles:

```bash
docker images | grep komuno
```

2. Pointez explicitement le tag precedent dans `docker-compose.prod.yml`
3. Redeployez:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Secrets GitHub Actions (si CI/CD)

Variables minimales si vous utilisez un workflow de deploiement distant:

- `TARGET_HOST`
- `TARGET_SSH_USER`
- `TARGET_SSH_KEY`
- `GHCR_TOKEN`

Adaptez ensuite votre workflow aux environnements vises.
