# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-20 19:05 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `8bfd374` | 2026-10-20 19:05 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche paramétrables par projet. Les colonnes Kanban de la fiche projet et les sélecteurs de statut sont construits à partir de `GET /projects/{projectId}/statuses`, et le formulaire de tâche des cartes propose ces statuts.
  - Sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie (À faire / En cours / Terminé).
  - Pendant le chargement des statuts, le message « Les statuts sont en cours de chargement. » s'affiche.
  - Les Responsables et les administrateurs peuvent ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut via « Paramétrer les statuts » / « Enregistrer les statuts ». La suppression demande le statut de destination des tâches.
  - Chaque écriture attend un reçu confirmé puis une relecture. Une écriture non vérifiée conserve le brouillon et demande une relecture (« Relire les statuts »).
  - Le bouton « Détails des tâches » masque ou affiche la liste détaillée des tâches. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : les Responsables et les administrateurs gèrent les modèles. La création d'un projet peut partir d'un modèle, dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Adoption du thème partagé de `@mairie360/lib-components` : feuille de style commune, squelettes de chargement, états vides libellés, reçus de confirmation refermables, lien d'évitement placé avant la navigation répétée. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Les écritures du workflow passent désormais par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - Le déplacement d'une tâche est refusé tant qu'elle a une écriture en cours ou qu'elle est à vérifier.
  - Les statuts ne sont pas enregistrés pendant une écriture ou une création de tâche du projet.
  - Aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  - Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié.
  - Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Le front lit et exige les compteurs `tasks.active` / `tasks.archived` du contrat `@mairie360/bff-project-openapi@1.0.0` dans la réponse `/projects-page`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau :
  - Avant, une ligne de projet ne s'ouvrait qu'au clic souris. Désormais, chaque titre est un bouton nommé « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), accessible au clavier avec Tab puis Entrée/Espace, et il ouvre la fiche une seule fois.
  - Avant, une ligne s'ouvrait même avec `permissions.canView: false`. Désormais, cette permission désactive le titre et l'ouverture de la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Avant, la modification d'une tâche recalculait total, terminées et progression à partir des seules tâches actives, ce qui perdait les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Désormais, le formulaire conserve les compteurs d'archivées. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances :
  - Contrat `@mairie360/bff-project-openapi` passé à `1.0.0`, puis à `0.0.0-dev.1c2e664…`, puis à `0.0.0-staging.b643e720f51e25126c93bb0286ec1bfd427327c5`, avec les images `bff-project` des stacks compose alignées (`staging-b643e72`). La politique de version accepte désormais `0.0.0-staging.<sha40>`. (MAIR-569, MAIR-575, MAIR-600, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295))
  - Remplacement de `@mairie360/front-kit` (archive dans `vendor/`) par les sous-chemins de `@mairie360/lib-components@0.10.2`, avec un nouveau contrôle `npm run test:bundle`. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
  - Backport `braces` de développement. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- CI et sécurité :
  - Jeton de workflow en lecture seule par défaut et `push` limité à `main`. (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274))
  - CICD passé en v4.3.1 puis v4.3.2 avec le journal des releases, suivi par Renovate. (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289))
  - Périmètre de la règle ZAP 10031 élargi aux filtres `view`/`status`/`priority`. (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Statuts de tâche paramétrables par projet. Les colonnes Kanban de la fiche projet et les sélecteurs de statut sont construits à partir de `GET /projects/{projectId}/statuses`, et le formulaire de tâche des cartes propose ces statuts.
  - Sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie (À faire / En cours / Terminé).
  - Pendant le chargement des statuts, le message « Les statuts sont en cours de chargement. » s'affiche.
  - Les Responsables et les administrateurs peuvent ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut via « Paramétrer les statuts » / « Enregistrer les statuts ». La suppression demande le statut de destination des tâches.
  - Chaque écriture attend un reçu confirmé puis une relecture. Une écriture non vérifiée conserve le brouillon et demande une relecture (« Relire les statuts »).
  - Le bouton « Détails des tâches » masque ou affiche la liste détaillée des tâches. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : les Responsables et les administrateurs gèrent les modèles. La création d'un projet peut partir d'un modèle, dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Adoption du thème partagé de `@mairie360/lib-components` : feuille de style commune, squelettes de chargement, états vides libellés, reçus de confirmation refermables, lien d'évitement placé avant la navigation répétée. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Les écritures du workflow passent désormais par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - Le déplacement d'une tâche est refusé tant qu'elle a une écriture en cours ou qu'elle est à vérifier.
  - Les statuts ne sont pas enregistrés pendant une écriture ou une création de tâche du projet.
  - Aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  - Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié.
  - Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Le front lit et exige les compteurs `tasks.active` / `tasks.archived` du contrat `@mairie360/bff-project-openapi@1.0.0` dans la réponse `/projects-page`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau :
  - Avant, une ligne de projet ne s'ouvrait qu'au clic souris. Désormais, chaque titre est un bouton nommé « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), accessible au clavier avec Tab puis Entrée/Espace, et il ouvre la fiche une seule fois.
  - Avant, une ligne s'ouvrait même avec `permissions.canView: false`. Désormais, cette permission désactive le titre et l'ouverture de la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Avant, la modification d'une tâche recalculait total, terminées et progression à partir des seules tâches actives, ce qui perdait les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Désormais, le formulaire conserve les compteurs d'archivées. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances :
  - Contrat `@mairie360/bff-project-openapi` passé à `1.0.0`, puis à `0.0.0-dev.1c2e664…`, puis à `0.0.0-staging.b643e720f51e25126c93bb0286ec1bfd427327c5`, avec les images `bff-project` des stacks compose alignées (`staging-b643e72`). La politique de version accepte désormais `0.0.0-staging.<sha40>`. (MAIR-569, MAIR-575, MAIR-600, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#295](https://github.com/mairie360/Projects_Web_Service/pull/295))
  - Remplacement de `@mairie360/front-kit` (archive dans `vendor/`) par les sous-chemins de `@mairie360/lib-components@0.10.2`, avec un nouveau contrôle `npm run test:bundle`. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
  - Backport `braces` de développement. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- CI et sécurité :
  - Jeton de workflow en lecture seule par défaut et `push` limité à `main`. (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274))
  - CICD passé en v4.3.1 puis v4.3.2 avec le journal des releases, suivi par Renovate. (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289))
  - Périmètre de la règle ZAP 10031 élargi aux filtres `view`/`status`/`priority`. (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 19:11 UTC | staging | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 19:05 UTC | dev | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 13:50 UTC | dev | — | `ad806b5` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39432343564) |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
