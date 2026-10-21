# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-10-21 11:07 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `214ddfa` | 2026-10-21 11:07 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés

- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut viennent désormais des statuts propres au projet (`GET /projects/{projectId}/statuses`). Les Responsables et administrateurs peuvent ajouter, renommer, recolorer, recatégoriser, réordonner ou supprimer un statut ; la suppression demande un statut de destination pour les tâches concernées. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : la création d'un projet peut partir d'un modèle dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Nouvelle tâche sans choix explicite de statut : elle prend le premier statut du projet correspondant à sa catégorie (À faire / En cours / Terminé). La case de fin de tâche la place dans le premier statut « Terminé », ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Vue Tableau : chaque titre de projet est un bouton nommé « Ouvrir la fiche du projet … », atteignable avec Tab puis Entrée ou Espace, avec focus visible. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Retour utilisateur : squelettes de chargement, résultats vides libellés, reçus de confirmation fermables, lien d'évitement en tête de page. (MAIR-126 / MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement

- Vue Tableau : un projet dont `permissions.canView` vaut `false` n'est plus ouvrable, ni par son titre (bouton désactivé), ni par un clic sur la ligne (qui n'affiche plus le curseur pointeur). (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Contrat BFF projet 1.0.0 puis 1.1.0 : `tasks.active` et `tasks.archived` deviennent obligatoires dans les projets (page projets et fiche) ; les tâches exposent `statusId` et `statusName` ; les corps de création et de modification de tâche acceptent `statusId` ; `PATCH /projects/{projectId}/tasks/{taskId}/status` n'exige plus le champ `status` ; les routes de statuts et de modèles de projet sont ajoutées. Les appelants qui valident strictement ces réponses doivent accepter ces champs. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280) ; MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276) ; MAIR-612, [#306](https://github.com/mairie360/Projects_Web_Service/pull/306))
- Écritures de statuts et de tâches : un déplacement de tâche est refusé si une écriture de cette tâche est en cours ou attend vérification ; l'enregistrement des statuts est refusé pendant une écriture de tâche du projet, et inversement. Un refus avant envoi affiche seulement son motif. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Corrections

- Édition d'une tâche : avant, le formulaire recalculait total, terminées et progression à partir des seules tâches actives ; les tâches archivées (terminées) disparaissaient, par exemple 3/4 à 75 % devenait 0/1 à 0 %. Maintenant les compteurs archivés sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique

- Intégration continue : `mairie360/CICD` passe de v4.3.x à v4.4.3, avec des workflows de promotion staging et prod manuels (MAIR-494) ; `cicd.yml` et `contracts.yml` ne tournent sur push que sur `main`, avec un jeton en lecture seule par défaut (MAIR-436). Renovate et les tests de cohérence des versions CICD ont été ajustés.
- Images des stacks de test (`docker-compose*.yml`) : `project-api` en 1.2.0, `core-api` en 2.2.0, `database` et `liquibase-migrations` en 3.3.0, `bff-user` et `bff-project` en 1.1.0. Le comportement de ces nouvelles versions n'est pas visible dans les diffs de ce journal.
- Socle partagé : `@mairie360/front-kit` retiré au profit des sous-chemins de `@mairie360/lib-components` 0.10.2 ; test de bundle client ajouté (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)).
- Scan ZAP : la règle 10031 n'est exclue que pour les URL racine dont les paramètres sont des valeurs d'énumération (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- Dépendances et tests : mises à jour de versions internes et de dépendances (`bff-project-openapi`, `bff-user-openapi`, tests de politique CI et de contrats).

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés

- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut viennent désormais des statuts propres au projet (`GET /projects/{projectId}/statuses`). Les Responsables et administrateurs peuvent ajouter, renommer, recolorer, recatégoriser, réordonner ou supprimer un statut ; la suppression demande un statut de destination pour les tâches concernées. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : la création d'un projet peut partir d'un modèle dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Nouvelle tâche sans choix explicite de statut : elle prend le premier statut du projet correspondant à sa catégorie (À faire / En cours / Terminé). La case de fin de tâche la place dans le premier statut « Terminé », ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Vue Tableau : chaque titre de projet est un bouton nommé « Ouvrir la fiche du projet … », atteignable avec Tab puis Entrée ou Espace, avec focus visible. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Retour utilisateur : squelettes de chargement, résultats vides libellés, reçus de confirmation fermables, lien d'évitement en tête de page. (MAIR-126 / MAIR-526, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement

- Vue Tableau : un projet dont `permissions.canView` vaut `false` n'est plus ouvrable, ni par son titre (bouton désactivé), ni par un clic sur la ligne (qui n'affiche plus le curseur pointeur). (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Contrat BFF projet 1.0.0 puis 1.1.0 : `tasks.active` et `tasks.archived` deviennent obligatoires dans les projets (page projets et fiche) ; les tâches exposent `statusId` et `statusName` ; les corps de création et de modification de tâche acceptent `statusId` ; `PATCH /projects/{projectId}/tasks/{taskId}/status` n'exige plus le champ `status` ; les routes de statuts et de modèles de projet sont ajoutées. Les appelants qui valident strictement ces réponses doivent accepter ces champs. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280) ; MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276) ; MAIR-612, [#306](https://github.com/mairie360/Projects_Web_Service/pull/306))
- Écritures de statuts et de tâches : un déplacement de tâche est refusé si une écriture de cette tâche est en cours ou attend vérification ; l'enregistrement des statuts est refusé pendant une écriture de tâche du projet, et inversement. Un refus avant envoi affiche seulement son motif. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Corrections

- Édition d'une tâche : avant, le formulaire recalculait total, terminées et progression à partir des seules tâches actives ; les tâches archivées (terminées) disparaissaient, par exemple 3/4 à 75 % devenait 0/1 à 0 %. Maintenant les compteurs archivés sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique

- Intégration continue : `mairie360/CICD` passe de v4.3.x à v4.4.3, avec des workflows de promotion staging et prod manuels (MAIR-494) ; `cicd.yml` et `contracts.yml` ne tournent sur push que sur `main`, avec un jeton en lecture seule par défaut (MAIR-436). Renovate et les tests de cohérence des versions CICD ont été ajustés.
- Images des stacks de test (`docker-compose*.yml`) : `project-api` en 1.2.0, `core-api` en 2.2.0, `database` et `liquibase-migrations` en 3.3.0, `bff-user` et `bff-project` en 1.1.0. Le comportement de ces nouvelles versions n'est pas visible dans les diffs de ce journal.
- Socle partagé : `@mairie360/front-kit` retiré au profit des sous-chemins de `@mairie360/lib-components` 0.10.2 ; test de bundle client ajouté (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)).
- Scan ZAP : la règle 10031 n'est exclue que pour les URL racine dont les paramètres sont des valeurs d'énumération (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).
- Dépendances et tests : mises à jour de versions internes et de dépendances (`bff-project-openapi`, `bff-user-openapi`, tests de politique CI et de contrats).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 11:12 UTC | staging | — | `214ddfa` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39589804908) |
| 2026-10-21 11:07 UTC | dev | — | `214ddfa` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39587884074) |
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
