# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "8bfd3743ada9c6d4f6899c52f14d438587355c09", "updated": {"dev": "2026-10-21 11:07 UTC", "staging": "2026-10-20 19:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `8bfd374` | 2026-10-20 19:11 UTC |
| dev | — | `214ddfa` | 2026-10-21 11:07 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche paramétrables par projet : le Kanban, les sélecteurs de statut et le formulaire de tâche des cartes utilisent les statuts du projet, lus via `GET /projects/{projectId}/statuses`. Responsables et administrateurs peuvent ajouter, renommer, recolorer, recatégoriser, réordonner et supprimer un statut ; la suppression demande un statut de destination pour les tâches (`moveTo`). (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : la création d'un projet peut partir d'un modèle (`/project-templates`, `templateId`) dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les listes vides affichent un libellé explicite, les chargements affichent des placeholders et les reçus d'action confirmée peuvent être fermés. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Le contrat `bff-project` 1.0.0 rend obligatoires `tasks.active` et `tasks.archived` sur chaque projet et ajoute `statusId` / `statusName` aux tâches ; le front valide désormais ces champs dans les pages et les fiches projet. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Une écriture de statut de tâche est refusée sans envoi (message affiché, sans demande de vérification) si la tâche a déjà une écriture en cours ou attend une vérification. L'enregistrement des statuts est refusé pendant une écriture de tâche du projet, et toute écriture de tâche (statut, modification, suppression, création) est refusée pendant cet enregistrement. Avant, le déplacement de statut contournait ces gardes. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Apparence : couleurs et règles communes viennent de la feuille publiée de lib-components 0.9.0 ; le fichier local `municipal-theme.css` est supprimé et le lien d'évitement unique précède la navigation répétée. Le rendu peut donc différer visuellement. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Édition d'une tâche : avant, toute modification recalculait total, terminées et progression à partir des seules tâches actives, ce qui effaçait les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant le formulaire conserve les compteurs `active` et `archived`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Tableau : avant, seul un clic souris ouvrait la fiche d'un projet. Maintenant chaque titre est un bouton « Ouvrir la fiche du projet … » ouvrable au clavier (Tab, Entrée, Espace) ; un `canView: false` le désactive. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))

#### Technique
- Contrats : `@mairie360/bff-project-openapi` 1.1.0 et `@mairie360/bff-user-openapi` 1.1.0 ; la snapshot `contracts/openapi.json` ne change que sa référence de paquet. Les stacks de test lancent `bff-project` et `bff-user` en 1.1.0. (MAIR-612, [#306](https://github.com/mairie360/Projects_Web_Service/pull/306))
- Stacks de test : `project-api` 1.2.0, `core-api` 2.2.0, `database` et `liquibase-migrations` 3.3.0 (Renovate, [#304](https://github.com/mairie360/Projects_Web_Service/pull/304), [#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305)).
- Bibliothèque : `@mairie360/front-kit` remplacé par les sous-chemins de `@mairie360/lib-components` 0.10.2, archive vendue supprimée, test de bundle ajouté (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)). Dépendance `braces` de développement vendue avec override npm (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278)).
- CI : CICD épinglé de v4.3.1 à v4.4.3, secrets du journal de release transmis, promotions staging et prod manuelles (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300) ; MAIR-571, [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#285](https://github.com/mairie360/Projects_Web_Service/pull/285)). `cicd.yml` et `contracts.yml` ne tournent sur push que pour `main`, jeton en lecture seule par défaut (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Scan ZAP : la règle 10031 est hors périmètre pour les URL racines ne portant que des valeurs d'énumération (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Contrats : `@mairie360/bff-project-openapi` 1.1.0 et `@mairie360/bff-user-openapi` 1.1.0 épinglés ; la snapshot ne change que sa référence de paquet, et les stacks de test lancent les images `bff-project` et `bff-user` en 1.1.0 (MAIR-612, [#306](https://github.com/mairie360/Projects_Web_Service/pull/306)).
- Stacks de test : `project-api` 1.2.0, `core-api` 2.2.0, `database` et `liquibase-migrations` 3.3.0 (Renovate, [#304](https://github.com/mairie360/Projects_Web_Service/pull/304), [#303](https://github.com/mairie360/Projects_Web_Service/pull/303), [#305](https://github.com/mairie360/Projects_Web_Service/pull/305)).
- CI : CICD passe de v4.3.3 à v4.4.3, avec les workflows de promotion staging et prod manuels (MAIR-494, [#300](https://github.com/mairie360/Projects_Web_Service/pull/300) ; [#301](https://github.com/mairie360/Projects_Web_Service/pull/301), [#298](https://github.com/mairie360/Projects_Web_Service/pull/298)). Un push sur `main` ne lance plus que `release-dev`.
- Aucun changement fonctionnel distinct n'apparaît dans cette plage.

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Statuts de tâche paramétrables par projet et modèles de projet : Kanban et sélecteurs construits à partir des statuts du projet (`GET /projects/{projectId}/statuses`), gestion des statuts par les responsables et administrateurs, création de projet à partir d'un modèle prévisualisé (`/project-templates`, `templateId`). (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les listes vides affichent un libellé explicite, les chargements affichent des placeholders et les reçus d'action confirmée peuvent être fermés. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Le contrat `bff-project` 1.0.0 rend obligatoires `tasks.active` et `tasks.archived` sur chaque projet et ajoute `statusId` / `statusName` aux tâches ; le front valide ces champs. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Écritures de statut : une écriture refusée avant envoi (tâche déjà en cours d'écriture ou à vérifier, enregistrement des statuts en cours) affiche son message sans demande de vérification. Les écritures de tâches et l'enregistrement des statuts ne se croisent plus. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Apparence : couleurs et règles communes viennent de la feuille publiée de lib-components 0.9.0 ; `municipal-theme.css` local supprimé, lien d'évitement unique avant la navigation répétée. (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Édition d'une tâche : avant, la modification recalculait total, terminées et progression à partir des seules tâches actives, ce qui effaçait les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant les compteurs `active` et `archived` sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Tableau : avant, seul un clic souris ouvrait la fiche d'un projet. Maintenant le titre est un bouton nommé, ouvrable au clavier (Tab, Entrée, Espace). (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))

#### Technique
- Contrats : `bff-project` passe par `0.0.0-staging.<sha40>` (MAIR-600, [#295](https://github.com/mairie360/Projects_Web_Service/pull/295)) et par un paquet `0.0.0-dev` (MAIR-575, [#293](https://github.com/mairie360/Projects_Web_Service/pull/293)) avant 1.0.0 ; la politique de version accepte le paquet staging.
- Bibliothèque : `@mairie360/front-kit` remplacé par les sous-chemins de `@mairie360/lib-components`, archive vendue supprimée, test de bundle ajouté (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)). `braces` de développement vendue avec override npm (sans clé Jira, [#278](https://github.com/mairie360/Projects_Web_Service/pull/278)).
- CI : CICD passe de v4.3.1 à v4.3.2 puis v4.4.0 (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289)) ; `cicd.yml` et `contracts.yml` ne tournent sur push que pour `main`, jeton en lecture seule (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)).
- Scan ZAP : règle 10031 hors périmètre pour les URL racines ne portant que des valeurs d'énumération (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
