# Projects_Web_Service — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Permettre le suivi des projets et tâches de la mairie dans des vues Kanban, grille et tableau. Les données et permissions proviennent de BFF Project.

## Public et utilité

Les agents, responsables de projets et administrateurs.

Domaine fonctionnel: Projets et tâches.

## Fonctions disponibles

- Recherche, filtres, pagination et changement de vue des projets.
- Formulaires de création et modification de projets et tâches.
- Détails, statuts, collaboration et actions disponibles selon les permissions du BFF.

## Parcours type

1. Résoudre la session avec BFF User et charger `/projects-page`.
2. Ouvrir un projet pour consulter ses tâches et les actions autorisées.
3. Effectuer une mutation puis utiliser les données renvoyées et recharger le contexte concerné.

## Place dans Mairie360

Dépôts associés: [BFF_Project](https://github.com/mairie360/BFF_Project).

Ce dépôt contient l’interface navigateur et ses adaptateurs Next.js. Le BFF associé fournit les données métier et coordonne leurs sources.

## Données et état actuel

Le module combine Project API et PostgreSQL. Le dépôt SQL gère notamment visibilité, membres, projets, tâches et collaboration. Les commentaires et une partie de l’historique utilisent `tasks.custom_fields`; l’historique de statut peut venir de `task_history`. Avec `PROJECT_DB_ACCESS=disabled`, la collaboration utilise un repli mémoire perdu au redémarrage.

## Périmètre et limites

Désactiver l’accès SQL change les capacités et la persistance; ce mode ne constitue pas une validation d’un déploiement complet. Les identifiants publics et statuts sont normalisés par les helpers, tandis que certains champs de projet sont dérivés des tâches.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
