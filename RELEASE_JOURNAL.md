# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "763a15bcf1b1d0690c3985242e7ccbeb073d9431", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-21 10:19 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `763a15b` | 2026-10-21 10:19 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut viennent des statuts du projet (`GET /projects/{projectId}/statuses`). Responsables et administrateurs ajoutent, renomment, recolorent, réordonnent et suppriment des statuts (suppression avec statut de destination) et gèrent les modèles de projet ; un nouveau projet peut partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Le formulaire de tâche des cartes propose les statuts du projet ; sans choix explicite, la tâche prend le premier statut de sa catégorie (À faire / En cours / Terminé). (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures de statuts passent par le contrôleur de la page et partagent ses gardes (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283)) : un déplacement de tâche est refusé pendant une écriture en cours sur cette tâche ou si elle attend une vérification ; les statuts ne s'enregistrent pas pendant une écriture de tâche du projet, et inversement. Un refus n'envoie rien et s'affiche comme un simple message, sans mention d'écriture non vérifiée.
- Dans le Tableau, une ligne avec `permissions.canView: false` désactive le titre et ne s'ouvre plus au clic. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Les projets renvoyés par le BFF portent `tasks.active` et `tasks.archived`, désormais requis avec `completed` et `total` ; le front les lit dans `/projects-page` et à l'ouverture de fiche. Les appelants doivent en tenir compte. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Thème et retours : couleurs et fond viennent de la feuille partagée de `@mairie360/lib-components` 0.9.0 (`municipal-theme.css` supprimé) ; chargement affiché en squelettes ; résultats vides libellés ; confirmations affichées en reçus fermables ; un seul lien d'évitement précède la navigation. (feat(projects), [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- Les releases staging et prod ne se déclenchent plus au push sur `main` : elles sont lancées à la main via `promote-staging.yml` et `promote-prod.yml`. (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300))

#### Corrections
- Tableau au clavier : avant, seul un clic souris ouvrait la fiche d'un projet. Maintenant, Tab atteint le bouton « Ouvrir la fiche du projet … » et Entrée ou Espace ouvrent la fiche une fois, sans remonter au clic de ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification d'une tâche : avant, le formulaire recalculait total, terminées et progression depuis les seules tâches actives, si bien qu'une édition effaçait les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant les compteurs sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Test stacks : `core-api` en 2.2.0, `database` et `liquibase-migrations` en 3.3.0 ; `bff-project` passe d'un build dev à l'image `staging-b643e72`. ([#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295))
- Socle partagé : imports `@mairie360/front-kit/*` remplacés par `@mairie360/lib-components/*` (0.10.2), archive vendored supprimée, test de bundle ajouté au workflow de performance. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- CI : CICD épinglé en v4.3.x avec secrets de journal de release, Renovate suit les SHA ; permissions en lecture seule par défaut et push limité à `main` ; règle ZAP 10031 limitée aux URL racine à valeurs d'énumération ; `follow-redirects` 1.16.1 et braces vendored pour `npm audit`. ([#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#291](https://github.com/mairie360/Projects_Web_Service/pull/291), [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Un push sur `main` ne déclenche plus que la release dev : `cicd.yml` s'arrête à `release-dev`. Staging et prod se lancent à la main avec `promote-staging.yml` et `promote-prod.yml` (entrée `sha` facultative). Changement pour l'équipe, sans effet sur les utilisateurs. (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300))

#### Technique
- Stacks de test (`docker-compose*.yml`) : `ghcr.io/mairie360/core-api` passe de 2.1.0 à 2.2.0 ; `ghcr.io/mairie360/database` et `liquibase-migrations` passent de 3.2.0 à 3.3.0. ([#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305))
- CICD épinglé en v4.3.3 puis v4.4.0 dans `cicd.yml`, `dev-dependency-exception.yml` et les nouveaux workflows de promotion ; `follow-redirects` 1.16.1 dans le lockfile pour débloquer `npm audit`. ([#298](https://github.com/mairie360/Projects_Web_Service/pull/298), [#300](https://github.com/mairie360/Projects_Web_Service/pull/300))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Statuts de tâche paramétrables par projet et modèles de projet : colonnes Kanban et sélecteurs construits à partir des statuts du projet (`GET /projects/{projectId}/statuses`), gestion des statuts par les Responsables et administrateurs, création de projet depuis un modèle. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures de statuts partagent les gardes des écritures de tâches (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283)) : un déplacement de tâche est refusé pendant une écriture en cours sur cette tâche ou si elle attend une vérification ; les statuts ne s'enregistrent pas pendant une écriture de tâche du projet, et inversement. Un refus n'envoie rien et s'affiche comme un simple message.
- Dans le Tableau, une ligne avec `permissions.canView: false` ne s'ouvre plus au clic et son titre est désactivé. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Les projets renvoyés par le BFF portent `tasks.active` et `tasks.archived`, désormais requis avec `completed` et `total` ; le contrat ajoute aussi `statusId`, `statusName` et `templateId`. Les appelants doivent en tenir compte. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Thème et retours : couleurs et fond viennent de la feuille partagée de `@mairie360/lib-components` 0.9.0 ; chargement en squelettes ; résultats vides libellés ; confirmations en reçus fermables ; un seul lien d'évitement avant la navigation. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Tableau au clavier : avant, seul un clic souris ouvrait la fiche. Maintenant, Tab atteint le bouton « Ouvrir la fiche du projet … » et Entrée ou Espace l'ouvrent une fois. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification d'une tâche : avant, le formulaire recalculait les compteurs depuis les seules tâches actives, et une édition effaçait les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant les compteurs sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Contrat BFF : `@mairie360/bff-project-openapi` passe à 1.0.0 puis à un paquet `0.0.0-staging.b643e720…` ; `bff-project` des stacks de test passe à `staging-b643e72`. ([#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295))
- Socle partagé : imports migrés vers `@mairie360/lib-components` 0.10.2 et archive vendored supprimée ; test de bundle ajouté au workflow de performance. ([#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- CI : CICD v4.3.1 puis v4.3.2 avec secrets du journal de release, Renovate suit les SHA épinglés, permissions en lecture seule par défaut, push limité à `main`. ([#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#274](https://github.com/mairie360/Projects_Web_Service/pull/274))
- Scan ZAP : la règle 10031 ne vise hors périmètre que les URL racine dont la requête ne contient que des valeurs d'énumération (`view`, `status`, `priority`). ([#276](https://github.com/mairie360/Projects_Web_Service/pull/276), [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
