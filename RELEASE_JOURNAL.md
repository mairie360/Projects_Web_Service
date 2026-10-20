# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "da250aa37446fe138a848433814bd1aa5ab3230b", "updated": {"dev": "2026-10-20 19:05 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `da250aa` | — |
| dev | — | `8bfd374` | 2026-10-20 19:05 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche propres à chaque projet, lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban et les sélecteurs de statut de la fiche projet en dépendent, et le formulaire de tâche des cartes les propose : sans choix explicite, une tâche prend le premier statut du projet dans sa catégorie, et le message « Les statuts sont en cours de chargement. » s'affiche pendant leur lecture. Les Responsables et les administrateurs disposent du bouton « Paramétrer les statuts » : ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut (la suppression demande le statut de destination de ses tâches). Ils gèrent aussi les modèles de projet. Un nouveau projet peut partir d'un modèle dont les statuts sont prévisualisés. Chaque écriture attend un reçu confirmé et une relecture ; si l'écriture n'est pas vérifiée, le brouillon est conservé. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures de statuts passent par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - un déplacement de tâche est refusé tant que la tâche a une écriture en cours ou attend une vérification ;
  - les statuts ne sont pas enregistrés pendant une écriture ou une création de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- L'interface adopte le thème partagé de `@mairie360/lib-components` : couleurs du thème municipal, squelettes de chargement (`Skeleton`), résultats vides libellés, confirmations refermables et lien d'évitement placé avant la navigation. (MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- Le front lit désormais les compteurs obligatoires `tasks.active` / `tasks.archived` de `/projects-page`. Auparavant, il les supprimait de la réponse reconstruite. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau : avant, la fiche d'un projet ne s'ouvrait qu'au clic de souris sur la ligne. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable au clavier (Tab) et activable avec Entrée ou Espace, sans déclencher aussi le clic de ligne. Un `permissions.canView: false` reçu désactive le bouton et la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification des tâches d'un projet : avant, le formulaire recalculait total, terminées et progression à partir des seules tâches actives, ce qui faisait perdre les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les tâches archivées sont prises en compte. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances internes :
  - `@mairie360/front-kit` est remplacé par `@mairie360/lib-components` `0.10.2`, avec un contrôle `npm run test:bundle` (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)) ;
  - le contrat `@mairie360/bff-project-openapi` passe de `1.0.0` au paquet dev, puis à `0.0.0-staging.b643e720f51e25126c93bb0286ec1bfd427327c5`, avec l'image `bff-project:staging-b643e72` dans les stacks de test, et `scripts/contract-version.mjs` accepte désormais `0.0.0-staging.<sha40>` (MAIR-569, MAIR-575, MAIR-600, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295)).
- CI et sécurité (4 PR) :
  - jeton de workflow en lecture seule par défaut et `push` limité à `main` (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)) ;
  - CICD passe en v4.3.1 puis v4.3.2, avec les secrets du journal des releases et le suivi Renovate (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289)) ;
  - périmètre de la règle ZAP 10031 étendu aux filtres `view`/`status`/`priority` (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Statuts de tâche propres à chaque projet, lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban et les sélecteurs de statut de la fiche projet en dépendent, et le formulaire de tâche des cartes les propose : sans choix explicite, une tâche prend le premier statut du projet dans sa catégorie, et le message « Les statuts sont en cours de chargement. » s'affiche pendant leur lecture. Les Responsables et les administrateurs disposent du bouton « Paramétrer les statuts » : ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut (la suppression demande le statut de destination de ses tâches). Ils gèrent aussi les modèles de projet. Un nouveau projet peut partir d'un modèle dont les statuts sont prévisualisés. Chaque écriture attend un reçu confirmé et une relecture ; si l'écriture n'est pas vérifiée, le brouillon est conservé. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures de statuts passent par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - un déplacement de tâche est refusé tant que la tâche a une écriture en cours ou attend une vérification ;
  - les statuts ne sont pas enregistrés pendant une écriture ou une création de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- L'interface adopte le thème partagé de `@mairie360/lib-components` : couleurs du thème municipal, squelettes de chargement (`Skeleton`), résultats vides libellés, confirmations refermables et lien d'évitement placé avant la navigation. (MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- Le front lit désormais les compteurs obligatoires `tasks.active` / `tasks.archived` de `/projects-page`. Auparavant, il les supprimait de la réponse reconstruite. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau : avant, la fiche d'un projet ne s'ouvrait qu'au clic de souris sur la ligne. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable au clavier (Tab) et activable avec Entrée ou Espace, sans déclencher aussi le clic de ligne. Un `permissions.canView: false` reçu désactive le bouton et la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification des tâches d'un projet : avant, le formulaire recalculait total, terminées et progression à partir des seules tâches actives, ce qui faisait perdre les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les tâches archivées sont prises en compte. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances internes :
  - `@mairie360/front-kit` est remplacé par `@mairie360/lib-components` `0.10.2`, avec un contrôle `npm run test:bundle` (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)) ;
  - le contrat `@mairie360/bff-project-openapi` passe de `1.0.0` au paquet dev, puis à `0.0.0-staging.b643e720f51e25126c93bb0286ec1bfd427327c5`, avec l'image `bff-project:staging-b643e72` dans les stacks de test, et `scripts/contract-version.mjs` accepte désormais `0.0.0-staging.<sha40>` (MAIR-569, MAIR-575, MAIR-600, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295)).
- CI et sécurité (4 PR) :
  - jeton de workflow en lecture seule par défaut et `push` limité à `main` (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)) ;
  - CICD passe en v4.3.1 puis v4.3.2, avec les secrets du journal des releases et le suivi Renovate (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289)) ;
  - périmètre de la règle ZAP 10031 étendu aux filtres `view`/`status`/`priority` (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 19:05 UTC | dev | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 13:50 UTC | dev | — | `ad806b5` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39432343564) |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
