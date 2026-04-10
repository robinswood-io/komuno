# Scripts de controle et deploiement

Ce repertoire regroupe des scripts utilitaires pour exploiter Komuno en local et en production.

## Principes

- Aucun secret ne doit etre hardcode dans ces scripts
- Les parametres sensibles passent par variables d'environnement
- Les scripts de deploiement doivent rester idempotents

## Scripts courants

- `docker-manage.sh`: operations Docker utilitaires
- `docker-monitor.sh`: supervision Docker
- `docker-backup.sh`: sauvegardes Docker
- `deploy-full.sh`: deploiement complet
- `health-check.sh`: verification de sante
- `validate-env.sh`: validation des variables d'environnement

## Usage general

```bash
# Exemple
./scripts/health-check.sh
./scripts/docker-manage.sh status
./scripts/deploy-full.sh
```

## Recommandations securite

- Utiliser des cles SSH (pas de mot de passe en clair)
- Stocker les credentials dans GitHub Secrets ou un coffre-fort
- Rotater regulierement les tokens

## CI/CD

Les scripts peuvent etre appeles depuis GitHub Actions.
Assurez-vous que les variables suivantes existent dans les secrets:

- `TARGET_HOST`
- `TARGET_SSH_USER`
- `TARGET_SSH_KEY`
- `GHCR_TOKEN`

## Verification post-action

```bash
# Exemples de controle
docker compose ps
docker compose logs --tail=100 app
curl -f https://<votre-domaine>/api/health
```
