# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "a944d2b49576ac352a8f9dd2ace3d8c4b7fbad8e", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-21 10:55 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `a944d2b` | 2026-10-21 10:55 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Les statuts de tâche sont paramétrables par projet : les colonnes Kanban et les sélecteurs de statut viennent des statuts du projet (`GET /projects/{projectId}/statuses`). Responsables et administrateurs ajoutent, renomment, recolorent, recatégorisent, réordonnent et suppriment des statuts (la suppression demande un statut de destination pour les tâches), et gèrent les modèles de projet. La création d'un projet peut partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- En vue Tableau, le titre de chaque projet est un bouton nommé « Ouvrir la fiche du projet … » : Tab le atteint, Entrée ou Espace ouvrent la fiche une seule fois, un clic sur la ligne l'ouvre toujours. Un `permissions.canView: false` reçu désactive le bouton et la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Thème partagé et retours accessibles : placeholders de chargement, états vides libellés, reçus de confirmation fermables, lien d'évitement unique avant la navigation. (MAIR-126 / MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Contrat `@mairie360/bff-project-openapi` 1.0.0 : les réponses projet exposent `tasks.active` et `tasks.archived`, désormais obligatoires avec `completed` et `total` (un appelant qui les déclare comme optionnels doit être mis à jour). Les tâches exposent `statusId` et `statusName`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- `PATCH /projects/{projectId}/tasks/{taskId}/status` : le corps n'exige plus `status` (`statusId` accepté à la place). (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Les écritures de statuts passent par le contrôleur de la page : un déplacement est refusé pendant une écriture de la même tâche ou tant qu'elle attend une vérification ; les statuts ne s'enregistrent pas pendant une écriture de tâche du projet, et aucune écriture de tâche ne part pendant l'enregistrement des statuts. Ce refus n'envoie rien et affiche un simple message, sans marquer l'écriture comme non vérifiée. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Les lectures sont plus légères (MAIR-526) : ouvrir un projet lit `GET /projects/{projectId}` une fois, puis les statuts et les tâches archivées une fois ; le formulaire de tâche des cartes ne lit que les statuts. ([#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Corrections
- Modification d'un projet : avant, enregistrer le formulaire recalculait total, terminé et progression à partir des seules tâches actives, et les tâches archivées (terminées) disparaissaient (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les compteurs archivés sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances de la plateforme : passage du socle front-kit vendu à `@mairie360/lib-components` 0.10.2 (sous-chemins `next`, `guard`, `browser`, `shared`, `react`, `theme`), suppression de l'archive vendue, ajout de `npm run test:bundle` (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)).
- Consommation de `@mairie360/lib-components` 0.9.0 puis du thème publié (MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278)).
- Workflows CI : `mairie360/CICD` passe à v4.3.1 puis v4.3.2 ; le secret de journal de release est transmis au pipeline ([#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289)). Les workflows ont un jeton en lecture seule par défaut, tournent sur push uniquement pour `main`, et Node passe à 24.21.0 ([#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Règle ZAP 10031 réduite aux URL racine dont la requête ne contient que des valeurs d'énumération ([#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- Versions de contrat épinglées sur le paquet staging `0.0.0-staging.<sha40>` et tag `staging-<sha7>` ([#295](https://github.com/mairie360/Projects_Web_Service/pull/295)).
- Stacks compose : BFF et base alignés sur les versions du contrat ; mises à jour du dépôt (renovate) de la CICD, de l'image core-api 2.2.0 et du schéma de base 3.3.0 ([#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Les stacks `docker-compose*.yml` passent à `ghcr.io/mairie360/core-api:2.2.0` (depuis 2.1.0) et à `ghcr.io/mairie360/database:3.3.0` et `ghcr.io/mairie360/liquibase-migrations:3.3.0` (depuis 3.2.0) ; le contenu de ces images ne figure pas dans les diffs ([#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305)).
- Workflows : `mairie360/CICD` passe à v4.3.3 puis à v4.4.3 (renovate, [#298](https://github.com/mairie360/Projects_Web_Service/pull/298), [#301](https://github.com/mairie360/Projects_Web_Service/pull/301)).
- MAIR-494 : `promote-staging.yml` et `promote-prod.yml` sont des promotions manuelles de `main` vers staging puis prod, avec verrou par cible ; un push sur `main` s'arrête à `release-dev` (CICD v4.4.0, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Les statuts de tâche sont paramétrables par projet : les colonnes Kanban et les sélecteurs viennent des statuts du projet (`GET /projects/{projectId}/statuses`), et les responsables et administrateurs gèrent les statuts et les modèles de projet ; un projet peut partir d'un modèle prévisualisé. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- En vue Tableau, le titre de chaque projet est un bouton nommé « Ouvrir la fiche du projet … », ouvrable au clavier (Entrée, Espace) ; le clic sur la ligne reste disponible. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Thème partagé et retours accessibles : placeholders de chargement, états vides libellés, reçus de confirmation fermables, lien d'évitement unique. (MAIR-126, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Contrat `@mairie360/bff-project-openapi` 1.0.0 : `tasks.active` et `tasks.archived` deviennent obligatoires dans les réponses projet ; les tâches exposent `statusId` et `statusName`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- `PATCH /projects/{projectId}/tasks/{taskId}/status` n'exige plus `status` (`statusId` accepté). (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Les écritures de statuts passent par le contrôleur de la page : un déplacement est refusé pendant une écriture de la même tâche ou tant qu'elle attend une vérification, et aucune écriture de tâche ne part pendant l'enregistrement des statuts. Le refus n'envoie rien et affiche un message sans marquer l'écriture comme non vérifiée. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Les lectures sont allégées (MAIR-526) : ouvrir un projet lit le détail une fois, puis les statuts et les tâches archivées une fois. ([#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Corrections
- Modification d'un projet : avant, l'enregistrement recalculait total, terminé et progression à partir des seules tâches actives, et les tâches archivées disparaissaient (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les compteurs archivés sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Socle partagé : `@mairie360/lib-components` 0.10.2 remplace l'archive vendue `front-kit`, avec `npm run test:bundle` en CI ([#287](https://github.com/mairie360/Projects_Web_Service/pull/287)).
- Contrôles de sécurité ZAP : la règle 10031 n'est écartée que pour les URL racine composées d'énumérations ([#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- Versions de contrat : le paquet `0.0.0-staging.<sha40>` et le tag `staging-<sha7>` sont acceptés ([#295](https://github.com/mairie360/Projects_Web_Service/pull/295)).
- CI : `mairie360/CICD` passe à v4.3.1 puis v4.3.2, avec les secrets du journal de release ([#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289)) ; jeton en lecture seule par défaut, push sur `main` uniquement, Node 24.21.0 ([#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Stacks compose : BFF et version de contrat alignés sur le staging ([#295](https://github.com/mairie360/Projects_Web_Service/pull/295)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 10:55 UTC | dev | — | `a944d2b` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39584933340) |
| 2026-10-21 10:19 UTC | dev | — | `9140af0` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39582544762) |
| 2026-10-21 10:18 UTC | dev | — | `763a15b` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39582583438) |
| 2026-10-21 01:46 UTC | dev | — | `6bb9873` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39528247539) |
| 2026-10-20 19:11 UTC | staging | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 19:05 UTC | dev | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 13:50 UTC | dev | — | `ad806b5` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39432343564) |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
