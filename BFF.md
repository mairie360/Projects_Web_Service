# BFF — Projets

Référentiel de besoins harmonisé le 5 septembre 2026. Documentation uniquement : aucune route ni migration n'est créée par ces fichiers. Les chemins BFF sont relatifs au service indiqué, pas au préfixe des proxies Next.js ; les chemins backend conservent leurs préfixes réels.

Le front est branché au BFF Project. Les projets/tâches proviennent du client Project et/ou SQL direct. Priorité et échéance projet sont souvent dérivées des tâches ; certains champs sont seulement réinjectés dans la réponse ou stockés en mémoire. Les routes API ci-dessous sont celles du client installé, avec les divergences locales signalées.

Tables et routes propriétaires : [BACKEND.md](BACKEND.md).

`Existant` : déclaré dans les sources locales ; `Partiel` : route présente mais données manquantes, SQL direct ou mémoire ; `Client généré` : chemin observé dans le client installé, déploiement non vérifié ; `Proposé` : contrat cible à implémenter/valider. Pour les tables, `SQL observé` ne prouve pas qu'une migration est déployée.

## Routes communes

Les identifiants renvoyés par un domaine restent ceux de son backend, même lorsqu'un BFF les sérialise en chaîne. `phone` côté Core/DTO correspond à `users.phone_number` en SQL ; `name`/`fullName` est composé à partir du prénom et du nom, sans découpage automatique inverse. Les rôles d'affichage sont adaptés par chaque front à partir de `roles`, sans nouvelle table de rôles par module. Le profil s'édite dans **Paramètres > Profil** ; les anciennes pages `/profile` ne définissent pas un stockage distinct.

| Méthode | Service et route BFF | Route backend / source | Données nécessaires au front | État |
| --- | --- | --- | --- | --- |
| GET | BFF User `/me` (alias `/session/me`) | Core `GET /api/v1/user/me/` + `GET /api/v1/groups/` | Identité, rôles et groupes communs ; réponse actuelle `{user, groups, roles}` ; enrichir avec identifiant, avatar, service, poste et dernière connexion | Partiel |
| POST | BFF User `/auth/logout` | Actuel : suppression du cookie ; cible : Core `POST /api/v1/sessions/revoke` avec le refresh token de la session courante | Déconnexion ; révocation serveur à brancher, pas une suppression de toutes les sessions | Partiel |
| GET | BFF User `/notifications` | Core `GET /api/v1/user/me/notifications/` | Notifications du bandeau et compteur non lu ; ne pas utiliser la constante de démonstration 3 | Proposé |
| PATCH | BFF User `/notifications/{notificationId}/read` | Core `PATCH /api/v1/user/me/notifications/{notificationId}/read` | Marquage lu et compteur actualisé pour l'utilisateur connecté | Proposé |

## Routes du module

| Méthode | Service et route BFF | Route backend / source | Données nécessaires au front | État |
| --- | --- | --- | --- | --- |
| GET | BFF Project `/projects-page` | Project `GET /api/v1/projects/`, tâches/membres par projet ; Core annuaire ; labels ci-dessous | q, status, priority, dueBefore/dueAfter, view, page/limit ; projets, résumé, filtres, options, kanban, pagination, access | Partiel ; labels/dates/priority réels à compléter |
| GET | BFF Project `/projects/{projectId}` | Project `GET /api/v1/projects/{projectId}/`, `GET /api/v1/projects/{projectId}/tasks/`, membres | Projet, taskItems, responsables/assignés, progression, droits | Partiel |
| POST | BFF Project `/projects` | Project `POST /api/v1/projects/` + membres/tâches ; SQL alternatif | Titre, description, statut, priorité, responsable, assignés, labels, échéance, tâches initiales | Partiel ; champs projet non tous persistés |
| PATCH | BFF Project `/projects/{projectId}` | Project `PATCH /api/v1/projects/{projectId}/` cible enrichie ; SQL alternatif | Même jeu de champs qu'en création ; valeurs stables à la relecture | Partiel ; PATCH de modification complète à distinguer du client closeProject |
| DELETE | BFF Project `/projects/{projectId}` | Project `DELETE /api/v1/projects/{projectId}/` | Suppression autorisée | Existant côté BFF ; API via client généré |
| POST | BFF Project `/projects/{projectId}/duplicate` | Project lectures puis `POST /api/v1/projects/`, création tâches et membres | Dupliquer projet/tâches ; règles de remise à zéro explicites | Partiel ; valeurs par défaut remplaçant priorité, labels et assignés |
| PATCH | BFF Project `/projects/{projectId}/close` | Project `PATCH /api/v1/projects/{projectId}/` utilisé par le client closeProject ; SQL alternatif | Clôture/suspension ; statut cible et droits | Partiel ; chemin du handler local différent |
| POST | BFF Project `/projects/{projectId}/tasks` | Project `POST /api/v1/projects/{projectId}/tasks/` | Titre, priorité, statut, échéance, responsable, assignés multiples, labels | Partiel ; plusieurs assignés et labels non restitués complètement |
| PATCH | BFF Project `/projects/{projectId}/tasks/{taskId}` | Project `PATCH /api/v1/projects/{projectId}/tasks/{taskId}/` | Modification de tâche et historique | Partiel |
| PATCH | BFF Project `/projects/{projectId}/tasks/{taskId}/status` | Project `PATCH /api/v1/projects/{projectId}/tasks/{taskId}/` | Statut todo/in-progress/review/done ; horodatage réel | Partiel |
| DELETE | BFF Project `/projects/{projectId}/tasks/{taskId}` | Project `DELETE /api/v1/projects/{projectId}/tasks/{taskId}/` | Suppression de tâche | Existant côté BFF ; API via client généré |
| GET | BFF Project `/projects/{projectId}/tasks/{taskId}/collaboration` | Actuel : tasks.custom_fields/task_history ou mémoire ; cible Project commentaires/historique ci-dessous | Commentaires, auteurs, dates et changements | Partiel |
| POST | BFF Project `/projects/{projectId}/tasks/{taskId}/comments` | Project `POST /api/v1/projects/{projectId}/tasks/{taskId}/comments/` cible ; SQL/mémoire actuel | Texte, auteur connecté, date persistée | Partiel |

## Points d'alignement

| Sujet | Contrat / écart |
| --- | --- |
| Divergence API/client | Le Project_API local imbrique `/projects` dans `/projects` au lieu de `/{projectId}` ; son handler de clôture est `/close`. Le client installé vise `/api/v1/projects/{projectId}/` (PATCH pour closeProject) et un DELETE membre avec `//`. Ne pas considérer ces chemins comme validés en déploiement : cible commune conservée, correction API/client distincte de cette PR documentaire. |
| Sources communes | Dashboard et références métier de Messagerie utilisent les mêmes projects/tasks/project_members ; aucune duplication dashboard_projects. Les participants sont enrichis depuis l'annuaire Core, pas depuis un nouveau profil Project. |
| Présentation | Libellés, couleurs, vues et progression sont dérivés. Les timestamps et échéances absents ne doivent pas être remplacés contractuellement par la date courante. |

## Sources

| Périmètre | Référence |
| --- | --- |
| Front inspecté | [src/lib/bffProjectClient.ts](src/lib/bffProjectClient.ts) |
| Identité / sessions / groupes | [Core_API 9904624](https://github.com/mairie360/Core_API/tree/99046240dd9742217d2a2c3d282721b785cacca0/src) ; [BFF_user b7c3477](https://github.com/mairie360/BFF_user/tree/b7c3477f858073aa846ba0129cbb29152528e6d2/src) |
| BFF métier inspecté | [BFF_Project 7bfa4b0](https://github.com/mairie360/BFF_Project/tree/7bfa4b04362bc4577c8a1919659e31357c69025b/src) |
| Client API installé | `@mairie360/project-api-openapi@0.0.0-dev.89c97300f8477aa18475319a9706b06dba002816` ; chemin et DTO vérifiés localement, pas appel réseau de validation |
| Sources projets | [BFF_Project 7bfa4b0](https://github.com/mairie360/BFF_Project/tree/7bfa4b04362bc4577c8a1919659e31357c69025b/src) ; [Project_API 4ff22c5](https://github.com/mairie360/Project_API/tree/4ff22c529801d22e0a6e4bf5359b3e85a85d61af/src) |
