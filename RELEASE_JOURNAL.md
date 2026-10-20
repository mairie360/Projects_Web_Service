# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "f10d3cf57c243a7f7616abe47e9804a0c9a9487c", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "da250aa37446fe138a848433814bd1aa5ab3230b", "updated": {"dev": "2026-10-20 12:27 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `da250aa` | — |
| dev | — | `f10d3cf` | 2026-10-20 12:27 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche propres à chaque projet (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Ils alimentent les colonnes Kanban et les sélecteurs de statut de la fiche projet, ainsi que le formulaire de tâche des cartes. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Responsables et administrateurs peuvent paramétrer les statuts d'un projet depuis la fiche (boutons « Paramétrer les statuts » et « Enregistrer les statuts ») : ajout, renommage, couleur, catégorie, ordre et suppression avec choix du statut de destination des tâches. Ils peuvent aussi gérer les modèles de projet. Chaque écriture attend un reçu confirmé et une relecture ; si elle n'est pas vérifiée, le brouillon est conservé et une relecture est demandée. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- La création d'un projet peut partir d'un modèle, dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Adoption du thème partagé `@mairie360/lib-components` (feuille de style commune, couleurs via variables `--mairie-*`) :
  - squelettes de chargement partagés ;
  - résultats vides libellés ;
  - reçus de confirmation refermables ;
  - lien d'évitement placé avant la navigation répétée. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Dans le formulaire de tâche des cartes :
  - sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie ;
  - la soumission est bloquée avec « Les statuts sont en cours de chargement. » tant que les statuts ne sont pas lus.
  
  Dans la fiche, la case de fin de tâche place la tâche dans le premier statut « Terminé », ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les déplacements de tâche et l'enregistrement des statuts partagent désormais les gardes des écritures de tâches :
  - un déplacement est refusé tant que la tâche a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche du projet ;
  - aucune écriture ni création de tâche ne part pendant l'enregistrement des statuts.
  
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Le front utilise le contrat `@mairie360/bff-project-openapi` 1.0.0 et exige les compteurs `tasks.active` / `tasks.archived` dans la réponse de `/projects-page`. Un BFF antérieur à `bff-project:1.0.0` n'est plus compatible. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau, ouverture d'un projet :
  - avant, la fiche ne s'ouvrait qu'au clic souris sur la ligne ;
  - maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » accessible au clavier (Tab, puis Entrée ou Espace), avec un focus visible ;
  - `permissions.canView: false` désactive le titre et le clic sur la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification d'une tâche et compteurs du projet :
  - avant, toute modification recalculait total, terminées et progression à partir des seules tâches actives, ce qui faisait disparaître les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %) ;
  - maintenant, les tâches archivées sont prises en compte. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- CI/CD :
  - CICD épinglé en v4.3.1 puis v4.3.2 (journal des releases, secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`, suivi Renovate par SHA + tag) ;
  - jeton de workflow en lecture seule par défaut et `push` limité à `main` ;
  - périmètre de la règle ZAP 10031 étendu aux filtres `view`/`status`/`priority`.
  
  (MAIR-571, MAIR-436, MAIR-567, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))
- Dépendances, images et tests :
  - socle partagé importé depuis `@mairie360/lib-components` 0.10.2 au lieu de l'archive `@mairie360/front-kit` (sans changement de comportement) ;
  - nouveau contrôle `npm run test:bundle` ;
  - images docker-compose alignées sur les versions prod (`bff-project`/`bff-user` 1.0.0).
  
  (MAIR-126, MAIR-569, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287), [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Statuts de tâche propres à chaque projet (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Ils alimentent les colonnes Kanban et les sélecteurs de statut de la fiche projet, ainsi que le formulaire de tâche des cartes. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Responsables et administrateurs peuvent paramétrer les statuts d'un projet depuis la fiche (boutons « Paramétrer les statuts » et « Enregistrer les statuts ») : ajout, renommage, couleur, catégorie, ordre et suppression avec choix du statut de destination des tâches. Ils peuvent aussi gérer les modèles de projet. Chaque écriture attend un reçu confirmé et une relecture ; si elle n'est pas vérifiée, le brouillon est conservé et une relecture est demandée. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- La création d'un projet peut partir d'un modèle, dont les statuts sont prévisualisés avant validation. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Adoption du thème partagé `@mairie360/lib-components` (feuille de style commune, couleurs via variables `--mairie-*`) :
  - squelettes de chargement partagés ;
  - résultats vides libellés ;
  - reçus de confirmation refermables ;
  - lien d'évitement placé avant la navigation répétée. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Changements de comportement
- Dans le formulaire de tâche des cartes :
  - sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie ;
  - la soumission est bloquée avec « Les statuts sont en cours de chargement. » tant que les statuts ne sont pas lus.
  
  Dans la fiche, la case de fin de tâche place la tâche dans le premier statut « Terminé », ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les déplacements de tâche et l'enregistrement des statuts partagent désormais les gardes des écritures de tâches :
  - un déplacement est refusé tant que la tâche a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche du projet ;
  - aucune écriture ni création de tâche ne part pendant l'enregistrement des statuts.
  
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Le front utilise le contrat `@mairie360/bff-project-openapi` 1.0.0 et exige les compteurs `tasks.active` / `tasks.archived` dans la réponse de `/projects-page`. Un BFF antérieur à `bff-project:1.0.0` n'est plus compatible. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Corrections
- Vue Tableau, ouverture d'un projet :
  - avant, la fiche ne s'ouvrait qu'au clic souris sur la ligne ;
  - maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » accessible au clavier (Tab, puis Entrée ou Espace), avec un focus visible ;
  - `permissions.canView: false` désactive le titre et le clic sur la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Modification d'une tâche et compteurs du projet :
  - avant, toute modification recalculait total, terminées et progression à partir des seules tâches actives, ce qui faisait disparaître les tâches archivées (3/4 à 75 % devenait 0/1 à 0 %) ;
  - maintenant, les tâches archivées sont prises en compte. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- CI/CD :
  - CICD épinglé en v4.3.1 puis v4.3.2 (journal des releases, secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`, suivi Renovate par SHA + tag) ;
  - jeton de workflow en lecture seule par défaut et `push` limité à `main` ;
  - périmètre de la règle ZAP 10031 étendu aux filtres `view`/`status`/`priority`.
  
  (MAIR-571, MAIR-436, MAIR-567, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285), [#289](https://github.com/mairie360/Projects_Web_Service/pull/289), [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#291](https://github.com/mairie360/Projects_Web_Service/pull/291))
- Dépendances, images et tests :
  - socle partagé importé depuis `@mairie360/lib-components` 0.10.2 au lieu de l'archive `@mairie360/front-kit` (sans changement de comportement) ;
  - nouveau contrôle `npm run test:bundle` ;
  - images docker-compose alignées sur les versions prod (`bff-project`/`bff-user` 1.0.0).
  
  (MAIR-126, MAIR-569, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287), [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
