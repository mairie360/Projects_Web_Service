# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "955a3f386e08c5eb45d60f11d1b4489e208826ff", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "da250aa37446fe138a848433814bd1aa5ab3230b", "updated": {"dev": "2026-10-19 22:51 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `da250aa` | — |
| dev | — | `955a3f3` | 2026-10-19 22:51 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Chaque projet a ses propres statuts de tâche (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban et les sélecteurs de statut de la fiche projet sont construits à partir d’eux, et le formulaire de tâche des cartes les propose (« Les statuts sont en cours de chargement. » tant qu’ils ne sont pas lus). (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les Responsables et les administrateurs peuvent ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut via « Paramétrer les statuts ». La suppression demande le statut de destination des tâches. Ils peuvent aussi gérer les modèles de projet. À la création, un projet peut partir d’un modèle dont les statuts sont d’abord prévisualisés. Chaque écriture attend un reçu confirmé puis une relecture. Une écriture non vérifiée conserve le brouillon et demande une relecture. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Sans choix explicite, une nouvelle tâche prend le premier statut du projet dans sa catégorie. La case de fin de tâche la place dans le premier statut « Terminé », ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures de statuts passent par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - le déplacement d’une tâche est refusé tant qu’elle a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l’enregistrement des statuts.
  Un tel refus n’envoie rien et s’affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Le front lit désormais les compteurs `tasks.active` / `tasks.archived`, devenus obligatoires dans le contrat `@mairie360/bff-project-openapi@1.0.0`. Il attend donc un BFF `bff-project` 1.0.0. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- L’interface adopte le thème partagé et la feuille de style publiée de `@mairie360/lib-components` (0.9.0) :
  - squelettes de chargement ;
  - résultats vides libellés ;
  - messages de confirmation masquables ;
  - lien d’évitement placé avant la navigation répétée.
  ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Vue Tableau : avant, la fiche d’un projet ne s’ouvrait qu’au clic souris sur la ligne. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable au clavier et activable par Entrée/Espace, sans déclencher le clic de ligne. Une permission reçue `canView: false` désactive le bouton et l’ouverture par la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Avant, modifier une tâche recalculait le total, les tâches terminées et l’avancement à partir des seules tâches actives : les tâches archivées disparaissaient (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les compteurs d’archivées sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances :
  - contrats OpenAPI passés en 1.0.0 et images docker-compose alignées (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)) ;
  - remplacement de `@mairie360/front-kit` par les sous-chemins de `@mairie360/lib-components@0.10.2`, sans changement de comportement, avec un test du bundle client (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)) ;
  - rétroportage de `braces` en dépendance de développement ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278)).
- CI et sécurité :
  - jeton en lecture seule par défaut et `push` limité à `main` (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)) ;
  - CICD v4.3.1 avec journal de release (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285)) ;
  - périmètre de la règle ZAP 10031 étendu aux filtres `view`/`status`/`priority` (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Chaque projet a ses propres statuts de tâche (nom, couleur, catégorie À faire / En cours / Terminé, ordre), lus via `GET /projects/{projectId}/statuses`. Les colonnes Kanban et les sélecteurs de statut de la fiche projet sont construits à partir d’eux, et le formulaire de tâche des cartes les propose (« Les statuts sont en cours de chargement. » tant qu’ils ne sont pas lus). (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Les Responsables et les administrateurs peuvent ajouter, renommer, recolorer, changer de catégorie, réordonner ou supprimer un statut via « Paramétrer les statuts ». La suppression demande le statut de destination des tâches. Ils peuvent aussi gérer les modèles de projet. À la création, un projet peut partir d’un modèle dont les statuts sont d’abord prévisualisés. Chaque écriture attend un reçu confirmé puis une relecture. Une écriture non vérifiée conserve le brouillon et demande une relecture. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Sans choix explicite, une nouvelle tâche prend le premier statut du projet dans sa catégorie. La case de fin de tâche la place dans le premier statut « Terminé », ou la remet dans le premier « À faire ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures de statuts passent par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - le déplacement d’une tâche est refusé tant qu’elle a une écriture en cours ou est à vérifier ;
  - les statuts ne sont pas enregistrés pendant une écriture de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l’enregistrement des statuts.
  Un tel refus n’envoie rien et s’affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Le front lit désormais les compteurs `tasks.active` / `tasks.archived`, devenus obligatoires dans le contrat `@mairie360/bff-project-openapi@1.0.0`. Il attend donc un BFF `bff-project` 1.0.0. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- L’interface adopte le thème partagé et la feuille de style publiée de `@mairie360/lib-components` (0.9.0) :
  - squelettes de chargement ;
  - résultats vides libellés ;
  - messages de confirmation masquables ;
  - lien d’évitement placé avant la navigation répétée.
  ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Vue Tableau : avant, la fiche d’un projet ne s’ouvrait qu’au clic souris sur la ligne. Maintenant, chaque titre est un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable au clavier et activable par Entrée/Espace, sans déclencher le clic de ligne. Une permission reçue `canView: false` désactive le bouton et l’ouverture par la ligne. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Avant, modifier une tâche recalculait le total, les tâches terminées et l’avancement à partir des seules tâches actives : les tâches archivées disparaissaient (3/4 à 75 % devenait 0/1 à 0 %). Maintenant, les compteurs d’archivées sont conservés. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))

#### Technique
- Dépendances :
  - contrats OpenAPI passés en 1.0.0 et images docker-compose alignées (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280)) ;
  - remplacement de `@mairie360/front-kit` par les sous-chemins de `@mairie360/lib-components@0.10.2`, sans changement de comportement, avec un test du bundle client (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287)) ;
  - rétroportage de `braces` en dépendance de développement ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278)).
- CI et sécurité :
  - jeton en lecture seule par défaut et `push` limité à `main` (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)) ;
  - CICD v4.3.1 avec journal de release (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285)) ;
  - périmètre de la règle ZAP 10031 étendu aux filtres `view`/`status`/`priority` (MAIR-567, [#291](https://github.com/mairie360/Projects_Web_Service/pull/291)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
