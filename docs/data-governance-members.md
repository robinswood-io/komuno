# Gouvernance technique des données membres

Les exports sont paginés et plafonnés à **1 000 lignes par requête**. Ils sont inscrits dans le journal d’administration via `AuditService`. La recherche d’annuaire est plafonnée à 20 résultats, le kanban à 60 et la liste standard à 100.

Une demande d’effacement exige une référence précise et une confirmation. Le traitement anonymise les champs de profil et désactive le membre; il ne supprime pas physiquement les données financières, cotisations ou identifiants nécessaires à leurs relations. L’action et les catégories conservées sont auditées.

Cette implémentation est un garde-fou technique, **pas une validation juridique**. Chaque demande doit être examinée selon sa portée et les obligations applicables. Référence officielle consultée: [CNIL — droit à l’effacement](https://www.cnil.fr/fr/comprendre-mes-droits/le-droit-leffacement-supprimer-vos-donnees-en-ligne), qui rappelle notamment la précision de la demande, la conservation légale des factures et la défense des droits.
