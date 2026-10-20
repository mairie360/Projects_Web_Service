# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "ad806b5facc94a939bc4937f9557fc091db09696", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "da250aa37446fe138a848433814bd1aa5ab3230b", "updated": {"dev": "2026-10-20 13:50 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `da250aa` | — |
| dev | — | `ad806b5` | 2026-10-20 13:50 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche propres à chaque projet (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban et les sélecteurs de statut de la fiche projet en dépendent, et le formulaire de tâche des cartes les propose (message « Les statuts sont en cours de chargement. » tant qu'ils ne sont pas lus). Les Responsables et administrateurs peuvent, via « Paramétrer les statuts », ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut ; une suppression demande le statut de destination des tâches. Ils gèrent aussi les modèles de projet, et la création d'un projet peut partir d'un modèle dont les statuts sont prévisualisés (`templateId`). Chaque écriture attend un reçu confirmé et une relecture ; une écriture non vérifiée conserve le brouillon. Sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie ; la case de fin de tâche la place dans le premier statut « Terminé » ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les écritures de statuts passent par les mêmes gardes que les écritures de tâches :
  - le déplacement d'une tâche dans le Kanban est refusé tant que cette tâche a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Changements de comportement
- L'interface adopte le thème partagé de `@mairie360/lib-components` 0.9.0 : couleurs issues de la feuille de style publiée, ce qui remplace `municipal-theme.css`. Elle utilise aussi des squelettes de chargement partagés, des résultats vides étiquetés et des confirmations d'action refermables. Le lien d'évitement précède désormais la navigation répétée. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- Le front exige désormais les compteurs `tasks.active` / `tasks.archived` dans les réponses projet du BFF (contrat `@mairie360/bff-project-openapi` 1.0.0). Une réponse qui ne les contient pas n'est plus acceptée. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau, accès au clavier : avant, la fiche d'un projet ne s'ouvrait qu'au clic souris sur la ligne. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » atteignable au Tab, avec un focus visible ; Entrée, Espace ou un clic ouvrent la fiche une seule fois. Un `permissions.canView: false` reçu désactive le bouton et l'ouverture par la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification de tâches : avant, toute modification recalculait le total, les tâches terminées et l'avancement à partir des seules tâches actives, ce qui faisait perdre les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les tâches archivées sont conservées dans ces compteurs. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- 3 changements de dépendances sans effet visible :
  - contrat `@mairie360/bff-project-openapi` passé à 1.0.0, puis à `0.0.0-dev.1c2e6646885128c6442f398ccb5d64a29d81fc9c`, avec les images `bff-project` des stacks de test ;
  - `@mairie360/front-kit` remplacé par `@mairie360/lib-components` 0.10.2, sans changement de comportement.
  (MAIR-569, MAIR-575, MAIR-126, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- 4 changements CI / sécurité :
  - jeton en lecture seule par défaut et `push` limité à `main` ;
  - montée de CICD en v4.3.1 puis v4.3.2, avec le journal des releases et un suivi Renovate ;
  - périmètre de la règle ZAP 10031 élargi aux filtres `view`/`status`/`priority`.
  (MAIR-436, MAIR-571, MAIR-567, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Statuts de tâche propres à chaque projet (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban et les sélecteurs de statut de la fiche projet en dépendent, et le formulaire de tâche des cartes les propose (message « Les statuts sont en cours de chargement. » tant qu'ils ne sont pas lus). Les Responsables et administrateurs peuvent, via « Paramétrer les statuts », ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut ; une suppression demande le statut de destination des tâches. Ils gèrent aussi les modèles de projet, et la création d'un projet peut partir d'un modèle dont les statuts sont prévisualisés (`templateId`). Chaque écriture attend un reçu confirmé et une relecture ; une écriture non vérifiée conserve le brouillon. Sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie ; la case de fin de tâche la place dans le premier statut « Terminé » ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les écritures de statuts passent par les mêmes gardes que les écritures de tâches :
  - le déplacement d'une tâche dans le Kanban est refusé tant que cette tâche a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Changements de comportement
- L'interface adopte le thème partagé de `@mairie360/lib-components` 0.9.0 : couleurs issues de la feuille de style publiée, ce qui remplace `municipal-theme.css`. Elle utilise aussi des squelettes de chargement partagés, des résultats vides étiquetés et des confirmations d'action refermables. Le lien d'évitement précède désormais la navigation répétée. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- Le front exige désormais les compteurs `tasks.active` / `tasks.archived` dans les réponses projet du BFF (contrat `@mairie360/bff-project-openapi` 1.0.0). Une réponse qui ne les contient pas n'est plus acceptée. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau, accès au clavier : avant, la fiche d'un projet ne s'ouvrait qu'au clic souris sur la ligne. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » atteignable au Tab, avec un focus visible ; Entrée, Espace ou un clic ouvrent la fiche une seule fois. Un `permissions.canView: false` reçu désactive le bouton et l'ouverture par la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification de tâches : avant, toute modification recalculait le total, les tâches terminées et l'avancement à partir des seules tâches actives, ce qui faisait perdre les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les tâches archivées sont conservées dans ces compteurs. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- 3 changements de dépendances sans effet visible :
  - contrat `@mairie360/bff-project-openapi` passé à 1.0.0, puis à `0.0.0-dev.1c2e6646885128c6442f398ccb5d64a29d81fc9c`, avec les images `bff-project` des stacks de test ;
  - `@mairie360/front-kit` remplacé par `@mairie360/lib-components` 0.10.2, sans changement de comportement.
  (MAIR-569, MAIR-575, MAIR-126, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280), [#293](https://github.com/mairie360/Projects_Web_Service/pull/293), [#287](https://github.com/mairie360/Projects_Web_Service/pull/287))
- 4 changements CI / sécurité :
  - jeton en lecture seule par défaut et `push` limité à `main` ;
  - montée de CICD en v4.3.1 puis v4.3.2, avec le journal des releases et un suivi Renovate ;
  - périmètre de la règle ZAP 10031 élargi aux filtres `view`/`status`/`priority`.
  (MAIR-436, MAIR-571, MAIR-567, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:50 UTC | dev | — | `ad806b5` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39432343564) |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
