# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "8653776165555a9f164e664c151b71e018aa8c55", "prod": "da250aa37446fe138a848433814bd1aa5ab3230b", "prod_tag": "v1.1.0", "staging": "da250aa37446fe138a848433814bd1aa5ab3230b", "updated": {"dev": "2026-10-19 22:16 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `da250aa` | — |
| staging | — | `da250aa` | — |
| dev | — | `8653776` | 2026-10-19 22:16 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut de la fiche projet sont construits à partir de `GET /projects/{projectId}/statuses`. Le formulaire de tâche des cartes propose les statuts du projet et ne lit que ceux-ci. Sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie (À faire / En cours / Terminé). Une soumission pendant le chargement affiche « Les statuts sont en cours de chargement. ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Gestion des statuts depuis la fiche projet par les Responsables et administrateurs : boutons « Relire les statuts », « Paramétrer les statuts » et « Enregistrer les statuts ». Ils peuvent ajouter, renommer, recolorer, changer la catégorie, réordonner ou supprimer un statut ; la suppression demande le statut de destination des tâches. Les tâches peuvent être déplacées entre colonnes du Kanban. Chaque écriture attend un reçu confirmé et une relecture (« Statuts enregistrés. » / « Modification vérifiée. »). Une écriture non vérifiée conserve le brouillon et demande une relecture. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet (d'après la description de la PR, diff tronqué) : gestion des modèles par les Responsables et administrateurs, et création d'un projet à partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures du panneau de statuts passent par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - un déplacement de tâche est refusé tant que cette tâche a une écriture en cours ou est à vérifier ;
  - l'enregistrement des statuts est refusé pendant une écriture ou une création de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Dans la vue Tableau, un projet reçu avec `permissions.canView: false` ne peut plus être ouvert : son bouton de titre est désactivé et un clic sur la ligne ne fait plus rien. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Le front utilise les contrats de production `@mairie360/bff-project-openapi@1.0.0` et `@mairie360/bff-user-openapi@1.0.0`. La réponse `/projects-page` doit désormais contenir les compteurs `tasks.active` et `tasks.archived`, qui sont conservés au lieu d'être ignorés. Les stacks `docker-compose*.yml` démarrent `ghcr.io/mairie360/bff-project:1.0.0` et `bff-user:1.0.0`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Adoption du thème partagé de `@mairie360/lib-components` 0.9.0 :
  - couleurs issues de la feuille de style publiée, la copie locale `municipal-theme.css` étant vidée ;
  - squelettes de chargement `Skeleton` ;
  - résultats vides libellés ;
  - reçus de confirmation refermables ;
  - lien d'évitement placé avant la navigation.
  ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Modifier les tâches d'un projet dans le formulaire d'édition faisait disparaître les tâches archivées (terminées) des compteurs : 3/4 à 75 % devenait 0/1 à 0 %. Les tâches archivées sont maintenant conservées dans le total, les tâches terminées et l'avancement. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Dans la vue Tableau, la fiche d'un projet ne s'ouvrait qu'au clic souris. Chaque titre est maintenant un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable par Tab et activable par Entrée ou Espace. Le clic sur le reste de la ligne et le menu d'actions sont inchangés. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))

#### Technique
- Le socle partagé (session, proxy, thème, contexte d'instance) est importé depuis les sous-chemins de `@mairie360/lib-components@0.10.2`. L'archive `@mairie360/front-kit` est supprimée et un contrôle `npm run test:bundle` du bundle client est ajouté, sans changement de comportement. Un backport `braces` est ajouté en dépendance de développement. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287), [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- CI :
  - jeton en lecture seule par défaut et pipelines déclenchés au push sur `main` uniquement (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)) ;
  - CICD v4.3.1 avec l'étape de journal des releases (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285)) ;
  - périmètre de la règle ZAP 10031 réduit pour `/?view=…`, documentation et tests. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Statuts de tâche paramétrables par projet : les colonnes Kanban et les sélecteurs de statut de la fiche projet sont construits à partir de `GET /projects/{projectId}/statuses`. Le formulaire de tâche des cartes propose les statuts du projet et ne lit que ceux-ci. Sans choix explicite, une nouvelle tâche prend le premier statut du projet de sa catégorie (À faire / En cours / Terminé). Une soumission pendant le chargement affiche « Les statuts sont en cours de chargement. ». (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Gestion des statuts depuis la fiche projet par les Responsables et administrateurs : boutons « Relire les statuts », « Paramétrer les statuts » et « Enregistrer les statuts ». Ils peuvent ajouter, renommer, recolorer, changer la catégorie, réordonner ou supprimer un statut ; la suppression demande le statut de destination des tâches. Les tâches peuvent être déplacées entre colonnes du Kanban. Chaque écriture attend un reçu confirmé et une relecture (« Statuts enregistrés. » / « Modification vérifiée. »). Une écriture non vérifiée conserve le brouillon et demande une relecture. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))
- Modèles de projet (d'après la description de la PR, diff tronqué) : gestion des modèles par les Responsables et administrateurs, et création d'un projet à partir d'un modèle dont les statuts sont prévisualisés. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

#### Changements de comportement
- Les écritures du panneau de statuts passent par le contrôleur de la page et partagent les gardes des écritures de tâches :
  - un déplacement de tâche est refusé tant que cette tâche a une écriture en cours ou est à vérifier ;
  - l'enregistrement des statuts est refusé pendant une écriture ou une création de tâche du projet ;
  - aucune écriture de tâche (statut, modification, suppression, création) ne part pendant l'enregistrement des statuts.
  Un tel refus n'envoie rien et s'affiche comme un simple message, sans marquer le panneau comme non vérifié. Après une écriture confirmée, la fiche et la page sont relues. (MAIR-570, [#283](https://github.com/mairie360/Projects_Web_Service/pull/283))
- Dans la vue Tableau, un projet reçu avec `permissions.canView: false` ne peut plus être ouvert : son bouton de titre est désactivé et un clic sur la ligne ne fait plus rien. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))
- Le front utilise les contrats de production `@mairie360/bff-project-openapi@1.0.0` et `@mairie360/bff-user-openapi@1.0.0`. La réponse `/projects-page` doit désormais contenir les compteurs `tasks.active` et `tasks.archived`, qui sont conservés au lieu d'être ignorés. Les stacks `docker-compose*.yml` démarrent `ghcr.io/mairie360/bff-project:1.0.0` et `bff-user:1.0.0`. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Adoption du thème partagé de `@mairie360/lib-components` 0.9.0 :
  - couleurs issues de la feuille de style publiée, la copie locale `municipal-theme.css` étant vidée ;
  - squelettes de chargement `Skeleton` ;
  - résultats vides libellés ;
  - reçus de confirmation refermables ;
  - lien d'évitement placé avant la navigation.
  ([#278](https://github.com/mairie360/Projects_Web_Service/pull/278))

#### Corrections
- Modifier les tâches d'un projet dans le formulaire d'édition faisait disparaître les tâches archivées (terminées) des compteurs : 3/4 à 75 % devenait 0/1 à 0 %. Les tâches archivées sont maintenant conservées dans le total, les tâches terminées et l'avancement. (MAIR-569, [#280](https://github.com/mairie360/Projects_Web_Service/pull/280))
- Dans la vue Tableau, la fiche d'un projet ne s'ouvrait qu'au clic souris. Chaque titre est maintenant un bouton « Ouvrir la fiche du projet … » (`aria-haspopup="dialog"`, focus visible), atteignable par Tab et activable par Entrée ou Espace. Le clic sur le reste de la ligne et le menu d'actions sont inchangés. (MAIR-310, [#281](https://github.com/mairie360/Projects_Web_Service/pull/281))

#### Technique
- Le socle partagé (session, proxy, thème, contexte d'instance) est importé depuis les sous-chemins de `@mairie360/lib-components@0.10.2`. L'archive `@mairie360/front-kit` est supprimée et un contrôle `npm run test:bundle` du bundle client est ajouté, sans changement de comportement. Un backport `braces` est ajouté en dépendance de développement. (MAIR-126, [#287](https://github.com/mairie360/Projects_Web_Service/pull/287), [#278](https://github.com/mairie360/Projects_Web_Service/pull/278))
- CI :
  - jeton en lecture seule par défaut et pipelines déclenchés au push sur `main` uniquement (MAIR-436, [#274](https://github.com/mairie360/Projects_Web_Service/pull/274)) ;
  - CICD v4.3.1 avec l'étape de journal des releases (MAIR-571, [#285](https://github.com/mairie360/Projects_Web_Service/pull/285)) ;
  - périmètre de la règle ZAP 10031 réduit pour `/?view=…`, documentation et tests. (MAIR-567, [#276](https://github.com/mairie360/Projects_Web_Service/pull/276))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
