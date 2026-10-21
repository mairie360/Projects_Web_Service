# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "763a15bcf1b1d0690c3985242e7ccbeb073d9431", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-21 10:18 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `763a15b` | 2026-10-21 10:18 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut sont construits à partir des statuts du projet, lus via `GET /projects/{projectId}/statuses`. Les Responsables et administrateurs peuvent ajouter, renommer, recolorer, recatégoriser, réordonner et supprimer un statut (la suppression demande un statut de destination pour ses tâches) et gérer les modèles de projet ; la création d'un projet peut partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Ouverture de la fiche d'un projet au clavier depuis la vue Tableau : chaque titre est un bouton nommé « Ouvrir la fiche du projet … » accessible par Tab, Entrée ou Espace. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Thème municipal partagé, squelettes de chargement, résultats vides libellés et reçus de confirmation fermables. (ff47fe0, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Les écritures de statuts et de tâches partagent désormais les mêmes gardes : un déplacement de tâche est refusé pendant une écriture en cours sur cette tâche ou tant qu'elle attend une vérification ; les statuts ne sont pas enregistrés pendant une écriture de tâche du projet, et inversement. Un refus n'envoie rien et s'affiche comme simple message. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Dans la vue Tableau, une ligne dont `permissions.canView` vaut `false` n'est plus ouvrable ni au clic ni au clavier. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Le contrat `@mairie360/bff-project-openapi` passe à 1.0.0 : `tasks.active` et `tasks.archived` deviennent obligatoires dans `tasks` de chaque projet, et les réponses exposent `statusId` / `statusName`. Le front exige désormais ces champs dans la réponse de `/projects-page`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Les images `bff-project` et `bff-user` des stacks Docker passent en 1.0.0. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Habillage visuel : le thème et les styles viennent désormais de `@mairie360/lib-components` (lien d'évitement unique avant la navigation, tiroir mobile). (ff47fe0, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Modification d'une tâche : avant, le formulaire recalculait le total et l'avancement à partir des seules tâches actives, ce qui faisait disparaître les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les compteurs archivés sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Vue Tableau : avant, une ligne ne s'ouvrait qu'au clic souris ; maintenant le titre est accessible au clavier. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Un refus avant envoi d'une écriture de statut ou de tâche n'affiche plus l'avertissement « non vérifiée ». (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Technique
- CI et releases : CICD épinglé en v4.3.1 puis v4.3.2 puis v4.3.3, journal des releases rédigé par Claude, test `tests/cicd-pin.test.cjs` et règles Renovate pour les SHA (MAIR-571, MAIR-575) ; workflows en lecture seule par défaut et déclenchement sur push vers `main` uniquement (MAIR-436).
- Contrats et scans : alignement sur les paquets dev puis staging du BFF (MAIR-575, MAIR-600), règle ZAP 10031 restreinte aux URL racine à valeurs d'énumération (MAIR-567), dépendance `follow-redirects` mise à jour (ce changement vient de la PR de promotion).
- Migration `@mairie360/front-kit` vers les sous-chemins de `@mairie360/lib-components` (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)), sans changement de comportement.
- Images Docker de développement : `core-api` 2.2.0, `database` et `liquibase-migrations` 3.3.0 (Renovate, [#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Mise à jour des images `ghcr.io/mairie360/core-api` (2.1.0 vers 2.2.0) dans les trois `docker-compose*.yml`, sans changement côté front ([#303](https://github.com/mairie360/Projects_Web_Service/pull/303)).
- Mise à jour de `ghcr.io/mairie360/database` et `liquibase-migrations` (3.2.0 vers 3.3.0) dans les `docker-compose*.yml` ; le diff ne décrit pas leur contenu, donc leur effet sur le schéma reste à vérifier ([#305](https://github.com/mairie360/Projects_Web_Service/pull/305)).
- Workflows : `cicd.yml` ne déclenche plus la promotion vers staging ou prod, qui devient manuelle via `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300)). Aucun effet visible pour les utilisateurs.
- CICD mis à jour en v4.3.3 (journal des releases, [#298](https://github.com/mairie360/Projects_Web_Service/pull/298)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Statuts de tâche paramétrables par projet et modèles de projet (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276)) : colonnes Kanban et sélecteurs construits à partir des statuts du projet (`GET /projects/{projectId}/statuses`), gestion des statuts pour les Responsables et administrateurs, création de projet à partir d'un modèle (`GET /project-templates`).
- Vue Tableau : titre de projet ouvrable au clavier via un bouton nommé « Ouvrir la fiche du projet … » (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281)).

#### Changements de comportement
- Écritures de statuts et de tâches sérialisées : un déplacement est refusé pendant une écriture en cours sur la même tâche ou tant qu'elle attend une vérification ; l'enregistrement des statuts bloque les écritures de tâches du projet, et inversement (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283)).
- Vue Tableau : une ligne avec `permissions.canView: false` n'est plus ouvrable (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281)).
- Contrat `@mairie360/bff-project-openapi` 1.0.0 : `tasks.active` et `tasks.archived` sont obligatoires, le front les exige dans `/projects-page` (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)).
- Images `bff-project` et `bff-user` 1.0.0 dans les stacks Docker (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)).
- Habillage visuel partagé (thème, squelettes de chargement, lien d'évitement, reçus fermables) issu de `@mairie360/lib-components` 0.9.0 (ff47fe0, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278)).

#### Corrections
- Modification d'une tâche : les tâches archivées n'étaient plus comptées après une édition (3/4 à 75 % devenait 0/1 à 0 %) ; le formulaire conserve maintenant ces compteurs (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)).
- Un refus avant envoi d'une écriture de statut ou de tâche n'affiche plus l'avertissement « non vérifiée » (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283)).
- Vue Tableau : avant, seul un clic souris ouvrait la fiche ; maintenant le clavier fonctionne aussi (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281)).

#### Technique
- Scan de sécurité : règle ZAP 10031 restreinte aux URL racine dont la requête ne contient que des valeurs d'énumération, avec test de cohérence sur les enums du contrat (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- Contrat BFF épinglé sur le paquet staging `0.0.0-staging.b643e720…` et image `staging-b643e72` (MAIR-600, [#295](https://github.com/mairie360/Projects_Web_Service/pull/295)) ; précédente version dev (MAIR-575, [#293](https://github.com/mairie360/Projects_Web_Service/pull/293)).
- CICD en v4.3.1 puis v4.3.2 avec secrets du journal des releases, et test d'épinglage `tests/cicd-pin.test.cjs` (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289)).
- Migration de `@mairie360/front-kit` vers `@mairie360/lib-components` 0.10.2 par sous-chemins, sans changement de comportement ; ajout de `test:bundle` en CI (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)).
- CI : workflows en lecture seule par défaut, déclenchement push limité à `main` (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Refactor interne du contrôleur des statuts (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283)) et suppression des diagnostics TypeScript liés à l'ancien SDK (MAIR-567).
- Mise à jour de la dépendance `follow-redirects` ; les dépendances du contrat sont épinglées sur les versions prod (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
