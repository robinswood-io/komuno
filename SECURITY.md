# Politique de securite

## Versions supportees

| Version | Support |
| ------- | ------- |
| 2.x     | Oui     |
| 1.x     | Non     |

## Signaler une vulnerabilite

Ne creez pas d'issue publique pour une faille de securite.

Envoyez un rapport prive a: **security@robinswood.io**

Merci d'inclure:

1. Description de la vulnerabilite
2. Etapes de reproduction
3. Impact estime
4. Version affectee
5. Proposition de correction (si disponible)

## SLA de traitement

- Accuse de reception: sous 48h
- Qualification initiale: sous 7 jours
- Correctif: selon severite

| Severite | Delai cible |
| -------- | ----------- |
| Critique | 24-48h      |
| Haute    | 7 jours     |
| Moyenne  | 30 jours    |
| Basse    | 90 jours    |

## Bonnes pratiques securite

- Activer HTTPS en production
- Utiliser des secrets forts (`SESSION_SECRET`, DB credentials, tokens)
- Ne jamais committer de secrets (`.env`, cles privees)
- Maintenir les dependances a jour (`npm audit`)
- Appliquer le principe du moindre privilege

## Scope

Dans le scope:

- Application Komuno (frontend + backend)
- API et authentification
- Integrations officielles du projet

Hors scope:

- Infrastructure tierce non geree par le projet
- Configuration reseau/OS de l'hebergeur
- Services externes non maintenus par Komuno

Merci de contribuer a la securite de Komuno.
