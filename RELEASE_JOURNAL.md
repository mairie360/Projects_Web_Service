# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "6e41d95daa336e8e3e31605b71b26f402c715816", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-21 10:57 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `6e41d95` | 2026-10-21 10:57 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche propres à chaque projet : le Kanban et les sélecteurs de statut sont construits à partir des statuts du projet (lus sur `GET /projects/{projectId}/statuses`), et non plus sur trois statuts fixes. Responsables et administrateurs peuvent ajouter, renommer, recolorer, recatégoriser, réordonner et supprimer un statut (la suppression demande un statut de destination, `moveTo`) et gérer les modèles de projet ; la création d’un projet peut partir d’un modèle (`templateId`). Chaque écriture attend un reçu confirmé et une relecture. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Table : le titre de chaque projet est un bouton nommé « Ouvrir la fiche du projet … » ; Tab l’atteint, Entrée ou Espace ouvrent la fiche une seule fois. Avant, seul le clic souris ouvrait la fiche. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Thème partagé et retours accessibles : placeholders de chargement, résultats vides libellés, reçus confirmés fermables, un seul lien d’évitement placé avant la navigation. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Les écritures de statuts et de déplacements passent par le contrôleur de la page : un déplacement est refusé tant que la tâche a une écriture en cours ou attend une vérification ; les statuts ne s’enregistrent pas pendant une écriture de tâche du projet, et aucune écriture de tâche ne part pendant cet enregistrement. Un refus n’envoie rien et s’affiche comme un simple message, sans « écriture non vérifiée ». (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Table : une ligne dont `permissions.canView` vaut `false` n’ouvre plus la fiche au clic, et son titre est désactivé. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Le reçu de `/projects-page` est lu avec les compteurs `tasks.active` et `tasks.archived`, désormais obligatoires comme dans le contrat 1.0.0 ; le front ne les ignore plus. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Apparence : couleurs et police viennent de la feuille publiée de `@mairie360/lib-components` (0.9.0 puis 0.10.2) ; `municipal-theme.css` est supprimé, l’aspect visuel change. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Édition d’une tâche dans la fiche : avant, l’enregistrement recalculait total, réalisées et progression à partir des seules tâches actives, si bien que les tâches archivées (terminées) disparaissaient (3/4 à 75 % devenait 0/1 à 0 %) ; maintenant, l’état du formulaire conserve les compteurs archivés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Le contrat `@mairie360/bff-project-openapi` passe par 1.0.0 (MAIR-569), puis par des paquets dev (MAIR-575) et staging (`0.0.0-staging.b643e720…`, MAIR-600) ; le contenu de `contracts/openapi.json` ne change que par son `x-source-package`. Les images `bff-project` des stacks suivent (1.0.0, puis `staging-b643e72`). (MAIR-575, MAIR-600, [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295))
- Les images API et base des stacks sont alignées sur les releases de prod (détail dans un diff tronqué, non vérifié ici). ([#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- `@mairie360/front-kit` est remplacé par les sous-chemins de `@mairie360/lib-components` 0.10.2 ; l’archive vendue est supprimée ; aucun changement de comportement. Un test de bundle est ajouté au workflow de performance. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- Scan ZAP : la règle 10031 est hors périmètre pour les URL racine ne contenant que des valeurs d’énumération de `view`, `status` et `priority`. (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))
- CICD v4.3.1 puis v4.3.2 : le workflow transmet `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour le journal des releases ; le pin CICD est testé (`tests/cicd-pin.test.cjs`) et suivi par Renovate. ([#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289))
- MAIR-436 : `cicd.yml` et `contracts.yml` ne s’exécutent en push que sur `main` ; le token du workflow est en lecture seule par défaut, seul le job CICD reçoit les droits d’écriture ; test `tests/workflow-permissions.test.cjs`. ([#274](https://github.com/mairie360/Projects_Web_Service/pull/274))
- Dépendance de dev `braces` : archive de backport vendue, avec licence et provenance. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Images des stacks `docker-compose*.yml` mises à jour par Renovate : `project-api` 1.1.0 vers 1.2.0, `core-api` 2.1.0 vers 2.2.0, `database` et `liquibase-migrations` 3.2.0 vers 3.3.0. Le contenu des migrations 3.3.0 n’apparaît pas dans les diffs, leur effet en base n’est donc pas vérifié ici. ([#304](https://github.com/mairie360/Projects_Web_Service/pull/304), [#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305))
- Pin CICD mis à jour par Renovate, de v4.3.2 vers v4.3.3 puis v4.4.3 (workflows `cicd.yml` et `dev-dependency-exception.yml`). ([#298](https://github.com/mairie360/Projects_Web_Service/pull/298), [#301](https://github.com/mairie360/Projects_Web_Service/pull/301))
- Promotion séparée (MAIR-494) : un push sur `main` ne déclenche plus que `release-dev` ; staging et prod se lancent à la main via les nouveaux workflows `promote-staging.yml` et `promote-prod.yml` (`workflow_dispatch`, `sha` optionnel, verrou par cible). Cela change le déploiement, pas l’usage. ([#300](https://github.com/mairie360/Projects_Web_Service/pull/300))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Statuts de tâche propres à chaque projet : le Kanban et les sélecteurs de statut sont construits à partir des statuts du projet (lus sur `GET /projects/{projectId}/statuses`), et non plus sur trois statuts fixes. Responsables et administrateurs peuvent ajouter, renommer, recolorer, recatégoriser, réordonner et supprimer un statut (la suppression demande un statut de destination, `moveTo`) et gérer les modèles de projet ; la création d’un projet peut partir d’un modèle (`templateId`). Chaque écriture attend un reçu confirmé et une relecture. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Table : le titre de chaque projet est un bouton nommé « Ouvrir la fiche du projet … » ; Tab l’atteint, Entrée ou Espace ouvrent la fiche une seule fois. Avant, seul le clic souris ouvrait la fiche. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Thème partagé et retours accessibles : placeholders de chargement, résultats vides libellés, reçus confirmés fermables, un seul lien d’évitement placé avant la navigation. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Les écritures de statuts et de déplacements passent par le contrôleur de la page : un déplacement est refusé tant que la tâche a une écriture en cours ou attend une vérification ; les statuts ne s’enregistrent pas pendant une écriture de tâche du projet, et aucune écriture de tâche ne part pendant cet enregistrement. Un refus n’envoie rien et s’affiche comme un simple message, sans « écriture non vérifiée ». (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Table : une ligne dont `permissions.canView` vaut `false` n’ouvre plus la fiche au clic, et son titre est désactivé. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Le reçu de `/projects-page` est lu avec les compteurs `tasks.active` et `tasks.archived`, désormais obligatoires comme dans le contrat 1.0.0. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Apparence : couleurs et police viennent de la feuille publiée de `@mairie360/lib-components` ; `municipal-theme.css` est supprimé, l’aspect visuel change. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Édition d’une tâche dans la fiche : avant, l’enregistrement recalculait total, réalisées et progression à partir des seules tâches actives, si bien que les tâches archivées (terminées) disparaissaient (3/4 à 75 % devenait 0/1 à 0 %) ; maintenant, l’état du formulaire conserve les compteurs archivés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Contrat `@mairie360/bff-project-openapi` passé à 1.0.0 (MAIR-569), puis à des paquets dev (MAIR-575) et staging (`0.0.0-staging.b643e720…`, MAIR-600) ; `contracts/openapi.json` ne change que par son `x-source-package`, et les images `bff-project` des stacks suivent. ([#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295))
- `@mairie360/front-kit` remplacé par les sous-chemins de `@mairie360/lib-components` 0.10.2, archive vendue supprimée, aucun changement de comportement ; test de bundle ajouté au workflow de performance. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- Scan ZAP : la règle 10031 est hors périmètre pour les URL racine ne contenant que des valeurs d’énumération de `view`, `status` et `priority`. (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))
- CICD v4.3.1 puis v4.3.2 : le workflow transmet `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` pour le journal des releases. ([#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289))
- MAIR-436 : `cicd.yml` et `contracts.yml` ne s’exécutent en push que sur `main` ; token en lecture seule par défaut, droits d’écriture au seul job CICD. ([#274](https://github.com/mairie360/Projects_Web_Service/pull/274))
- Backport dev-only de `braces` vendu avec licence et provenance. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 10:57 UTC | dev | — | `6e41d95` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39585067611) |
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
