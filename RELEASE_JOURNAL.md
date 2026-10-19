# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "5f16d85ebd13c29d21a7ee74da9fcf11284b0645", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "da250aa37446fe138a848433814bd1aa5ab3230b", "updated": {"dev": "2026-10-19 20:15 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `da250aa` | — |
| dev | — | `5f16d85` | 2026-10-19 20:15 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche propres à chaque projet (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban de la fiche projet et les sélecteurs de statut en découlent, et le formulaire de tâche des cartes les propose. Une nouvelle tâche sans choix explicite prend le premier statut du projet de sa catégorie. La case de fin de tâche place la tâche dans le premier statut « Terminé », ou la remet dans le premier « À faire ». Un envoi pendant le chargement affiche « Les statuts sont en cours de chargement. ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Paramétrage des statuts dans la fiche projet, réservé aux Responsables et administrateurs ayant `permissions.canEdit` :
  - boutons « Paramétrer les statuts », « Enregistrer les statuts », « Annuler les modifications » et « Relire les statuts » ;
  - ajout, renommage, couleur, catégorie, ordre et suppression d'un statut (la suppression demande le statut de destination de ses tâches).
  
  Chaque écriture attend un reçu confirmé puis une relecture (« Statuts enregistrés. », « Modification vérifiée. »). Une écriture non vérifiée conserve le brouillon et demande une relecture. Le bouton « Détails des tâches » masque la liste détaillée des tâches. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : gestion des modèles, et création d'un projet à partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les déplacements de tâche dans le Kanban et l'enregistrement des statuts partagent les gardes des écritures de tâches :
  - un déplacement est refusé tant que la tâche a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche ou une création de projet en cours ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Changements de comportement
- Le front s'appuie sur le contrat `@mairie360/bff-project-openapi@1.0.0` : les compteurs `tasks.active` / `tasks.archived` sont désormais requis dans la réponse de `/projects-page` et conservés au lieu d'être ignorés. Les stacks docker-compose démarrent `ghcr.io/mairie360/bff-project:1.0.0` et `bff-user:1.0.0`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Interface alignée sur `@mairie360/lib-components` 0.9.0 et sa feuille de style commune :
  - couleurs du thème partagé (`--mairie-background`, `--mairie-text`) ;
  - squelettes de chargement partagés et résultats vides libellés ;
  - reçus de confirmation masquables ;
  - un seul lien d'évitement, placé avant la navigation. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Vue Tableau : avant, une ligne ne s'ouvrait qu'au clic souris. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable au Tab et activable par Entrée/Espace, sans déclencher en plus le clic de ligne. Un `permissions.canView: false` reçu désactive le bouton et l'ouverture par la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Avant, modifier les tâches d'un projet recalculait total, terminées et progression à partir des seules tâches actives : les tâches archivées disparaissaient des compteurs (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, le formulaire tient compte des tâches archivées. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- CI : jeton en lecture seule par défaut, droits d'écriture réservés au job `CICD`, `push` limité à `main` ; passage au workflow CICD v4.3.1 avec l'étape de journal des releases et ses secrets. (MAIR-436, MAIR-571, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#285](https://github.com/mairie360/Projects_Web_Service/pull/285))
- Plusieurs changements sans effet visible : nouveaux tests, documentation, backport `braces` en devDependency, périmètre de la règle ZAP 10031. ([#276](https://github.com/mairie360/Projects_Web_Service/pull/276), [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Statuts de tâche propres à chaque projet (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban de la fiche projet et les sélecteurs de statut en découlent, et le formulaire de tâche des cartes les propose. Une nouvelle tâche sans choix explicite prend le premier statut du projet de sa catégorie. La case de fin de tâche place la tâche dans le premier statut « Terminé », ou la remet dans le premier « À faire ». Un envoi pendant le chargement affiche « Les statuts sont en cours de chargement. ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Paramétrage des statuts dans la fiche projet, réservé aux Responsables et administrateurs ayant `permissions.canEdit` :
  - boutons « Paramétrer les statuts », « Enregistrer les statuts », « Annuler les modifications » et « Relire les statuts » ;
  - ajout, renommage, couleur, catégorie, ordre et suppression d'un statut (la suppression demande le statut de destination de ses tâches).
  
  Chaque écriture attend un reçu confirmé puis une relecture (« Statuts enregistrés. », « Modification vérifiée. »). Une écriture non vérifiée conserve le brouillon et demande une relecture. Le bouton « Détails des tâches » masque la liste détaillée des tâches. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet : gestion des modèles, et création d'un projet à partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les déplacements de tâche dans le Kanban et l'enregistrement des statuts partagent les gardes des écritures de tâches :
  - un déplacement est refusé tant que la tâche a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche ou une création de projet en cours ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))

#### Changements de comportement
- Le front s'appuie sur le contrat `@mairie360/bff-project-openapi@1.0.0` : les compteurs `tasks.active` / `tasks.archived` sont désormais requis dans la réponse de `/projects-page` et conservés au lieu d'être ignorés. Les stacks docker-compose démarrent `ghcr.io/mairie360/bff-project:1.0.0` et `bff-user:1.0.0`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Interface alignée sur `@mairie360/lib-components` 0.9.0 et sa feuille de style commune :
  - couleurs du thème partagé (`--mairie-background`, `--mairie-text`) ;
  - squelettes de chargement partagés et résultats vides libellés ;
  - reçus de confirmation masquables ;
  - un seul lien d'évitement, placé avant la navigation. ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Vue Tableau : avant, une ligne ne s'ouvrait qu'au clic souris. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable au Tab et activable par Entrée/Espace, sans déclencher en plus le clic de ligne. Un `permissions.canView: false` reçu désactive le bouton et l'ouverture par la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Avant, modifier les tâches d'un projet recalculait total, terminées et progression à partir des seules tâches actives : les tâches archivées disparaissaient des compteurs (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, le formulaire tient compte des tâches archivées. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- CI : jeton en lecture seule par défaut, droits d'écriture réservés au job `CICD`, `push` limité à `main` ; passage au workflow CICD v4.3.1 avec l'étape de journal des releases et ses secrets. (MAIR-436, MAIR-571, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274), [#285](https://github.com/mairie360/Projects_Web_Service/pull/285))
- Plusieurs changements sans effet visible : nouveaux tests, documentation, backport `braces` en devDependency, périmètre de la règle ZAP 10031. ([#276](https://github.com/mairie360/Projects_Web_Service/pull/276), [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
