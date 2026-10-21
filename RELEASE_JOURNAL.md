# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "6bb98736adef05f98a4b363bb1c9eae764cbda6f", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-21 01:46 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `6bb9873` | 2026-10-21 01:46 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut viennent des statuts du projet (`GET /projects/{projectId}/statuses`). Responsables et administrateurs ajoutent, renomment, recolorent, recatégorisent, réordonnent ou suppriment un statut (suppression avec statut de destination des tâches) et gèrent des modèles de projet, utilisables à la création avec aperçu des statuts. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Vue Tableau : le titre de chaque projet est un bouton nommé « Ouvrir la fiche du projet … », ouvrable au clavier (Tab, Entrée, Espace). Une ligne dont `permissions.canView` vaut `false` désactive le titre et l'ouverture de la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Retours d'interface : squelettes de chargement partagés, résultats vides annoncés, reçus de confirmation fermables, un seul lien d'évitement avant la navigation. (MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- `/projects-page` : `tasks.active` et `tasks.archived` sont désormais requis en plus de `total` et `completed` (`src/lib/project-page-receipt.ts`). Une réponse qui les omet est refusée par le front. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Les écritures de statuts et de tâches sont sérialisées : un déplacement est refusé pendant une écriture en cours sur la même tâche ou tant qu'elle est à vérifier, les statuts ne sont pas enregistrés pendant une écriture de tâche du projet, et inversement. Un refus avant envoi n'envoie rien et affiche un message simple. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Dépendance `@mairie360/bff-project-openapi` : de la version dev figée `0.0.0-dev.0b18e81…` vers `0.0.0-staging.b643e72…` (MAIR-600, [#295](https://github.com/mairie360/Projects_Web_Service/pull/295)). Le passage intermédiaire à `1.0.0` (MAIR-569) n'est pas conservé sur main. Les images `bff-project` des stacks Docker suivent (`staging-b643e72`).

#### Corrections
- Édition d'une tâche : avant, l'enregistrement recalculait total, réalisé et progression à partir des seules tâches actives, et les tâches archivées disparaissaient (3/4 à 75 % devenait 0/1 à 0 %). Maintenant les compteurs archivés sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendance `@mairie360/front-kit` remplacée par `@mairie360/lib-components@0.10.2` (sous-chemins), archive `vendor/` supprimée, test de bundle client (`npm run test:bundle`). (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- Règle ZAP 10031 limitée à l'URL racine dont la requête ne contient que des valeurs d'énumération (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- CI : pin `mairie360/CICD` en v4.3.1 puis v4.3.2 (journal des releases rédigé par Claude), puis v4.3.3 (Renovate), avec test de cohérence des pins ; jeton en lecture seule par défaut, exécution sur `push` vers `main` seulement (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Dépendances de dev : `braces` vendorisé et `follow-redirects` 1.16.1 dans le lockfile. (MAIR-575, [#293](https://github.com/mairie360/Projects_Web_Service/pull/293))

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Workflows : `cicd.yml` passe à `mairie360/CICD` v4.4.0 et un `push` sur `main` s'arrête à `release-dev`. Ajout de `promote-staging.yml` et `promote-prod.yml`, déclenchés à la main (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300)).
- Dépendances : `mairie360/CICD` v4.3.3 (Renovate, [#298](https://github.com/mairie360/Projects_Web_Service/pull/298)) et `follow-redirects` 1.16.1 dans le lockfile pour l'audit npm (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Statuts de tâche paramétrables par projet et modèles de projet (Kanban, sélecteurs de statut, gestion par les Responsables et administrateurs). (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Vue Tableau : titre de projet ouvrable au clavier via un bouton nommé, `canView: false` désactive l'ouverture. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Squelettes de chargement, résultats vides annoncés, reçus de confirmation fermables, lien d'évitement unique. (MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Contrat BFF : la staging pin `0.0.0-staging.b643e72…` (MAIR-600, [#295](https://github.com/mairie360/Projects_Web_Service/pull/295)) diffère de la prod `0.0.0-dev.0b18e81…`. Les images `bff-project` des stacks suivent (`staging-b643e72`). Le BFF déployé doit fournir `tasks.active` et `tasks.archived` pour que `/projects-page` soit accepté ; à vérifier avant promotion.
- `/projects-page` : `tasks.active` et `tasks.archived` requis par le front (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)).
- Écritures de statuts et de tâches sérialisées, avec refus simples avant envoi (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283)).

#### Corrections
- Édition d'une tâche : les tâches archivées ne sont plus perdues dans le total et la progression (3/4 à 75 % ne devient plus 0/1 à 0 %). (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Remplacement de `@mairie360/front-kit` par `@mairie360/lib-components@0.10.2`, avec test de bundle client. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- Promotion et CI : `mairie360/CICD` v4.3.1 à v4.3.3 (journal des releases), jeton en lecture seule, `push` sur `main` seulement (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Règle ZAP 10031 limitée aux URL d'énumérations seules (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- Dépendances : `braces` vendorisé et `follow-redirects` 1.16.1 (MAIR-575, [#293](https://github.com/mairie360/Projects_Web_Service/pull/293)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 01:46 UTC | dev | — | `6bb9873` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39528247539) |
| 2026-10-20 19:11 UTC | staging | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 19:05 UTC | dev | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 13:50 UTC | dev | — | `ad806b5` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39432343564) |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
