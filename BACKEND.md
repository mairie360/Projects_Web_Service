# Backend — Projets

Correspondance front/BFF : [BFF.md](BFF.md). Référentiel de besoins harmonisé le 5 septembre 2026. Documentation uniquement : aucune route ni migration n'est créée par ces fichiers. Les chemins BFF sont relatifs au service indiqué, pas au préfixe des proxies Next.js ; les chemins backend conservent leurs préfixes réels.

`Existant` : déclaré dans les sources locales ; `Partiel` : route présente mais données manquantes, SQL direct ou mémoire ; `Client généré` : chemin observé dans le client installé, déploiement non vérifié ; `Proposé` : contrat cible à implémenter/valider. Pour les tables, `SQL observé` ne prouve pas qu'une migration est déployée.

Les tables sont des sources ou des besoins cibles, pas un script SQL. Les références interservices (`user_id`, `file_id`, etc.) sont logiques : elles n'imposent pas de clé étrangère entre bases distinctes. Les BFF doivent à terme passer par les API propriétaires ; les accès SQL directs et replis mémoire actuels sont signalés. Les permissions restent contrôlées par le serveur.

## Tables communes

| Table / source propriétaire | Clés et données nécessaires | État |
| --- | --- | --- |
| Core `users` | `id` ; `first_name`, `last_name`, `email`, `phone_number`, `status`, `is_archived`, `first_connect`. `password` reste exclusivement côté serveur | SQL observé |
| Core `roles`, `user_roles` | `roles.id`, `roles.name` ; association `user_roles(user_id, role_id)` vers `users.id` et `roles.id` | SQL observé |
| Core `groups`, `group_users` | `groups.id`, `owner_id`, `name`, `description` ; association `group_users(group_id, user_id)` ; nomenclature cible commune basée sur Core | SQL observé dans Core ; divergence `group_members` dans les BFF User/Calendar/Project à résoudre, pas une seconde table cible |
| Core `sessions` | `id`, `user_id`, `created_at`, `expires_at`, `device_info`, `ip_address`, `revoked_at` ; `token_hash` interne, jamais exposé. Dernière connexion dérivée des sessions, pas de la date courante | SQL observé ; vue `v_sessions` utilisée par Core |
| Core `user_profiles` | `user_id` unique vers `users.id` ; `avatar_file_id` vers Files `files.id`, `service_id` vers `services.id`, `position`, `biography` ; `address`, `city` seulement pour compatibilité des anciens profils | Proposé ; ne pas dupliquer identité, mot de passe ou rôles |
| Core `services` | `id`, `code` unique, `name`, `active` ; même annuaire pour Paramètres, Administration, Calendrier, contacts et membres de projets | Proposé ; distinct des groupes d'habilitation |
| Core `notifications` | `id`, `user_id`, `type`, `title`, `body`, `resource_type`, `resource_id`, `created_at`, `read_at` ; source du compteur commun | Proposé ; distinct des préférences `user_notification_settings` |

## Tables du module

| Table / source propriétaire | Clés et données nécessaires | État |
| --- | --- | --- |
| Project `projects` | `id`, `title`, `description`, `owner_id`, `status` observés ; cible `priority`, `responsible_id`, `due_date`, dates de création/modification/clôture | SQL observé ; extensions proposées pour les champs propres au projet |
| Project `project_members` | Association `(project_id, user_id)` ; mêmes identifiants Core | SQL observé |
| Project `tasks` | `id`, `project_id`, `title`, `status`, `priority`, `due_date`, `assigned_to`, `custom_fields` ; description et timestamps à confirmer/compléter | SQL observé ; assigned_to mono-utilisateur actuel |
| Project `task_assignees` | Association `(task_id, user_id)` ; `assigned_to` conserve le responsable principal pour compatibilité | Proposé ; assignation multiple |
| Project `project_labels`, `project_label_links`, `task_label_links` | Référentiel `id`, `name`, `color` ; associations `(project_id, label_id)` et `(task_id, label_id)` | Proposé ; labels actuellement vides ou dans custom_fields |
| Project `task_comments` | `id`, `task_id`, `author_id`, `message`, `created_at` | Proposé ; migrer les commentaires actuellement dans tasks.custom_fields/mémoire |
| Project `task_history` | `id`, `task_id`, `changed_by`, `changed_at`, détails de changement ; correspondance au DTO history | SQL observé ; repli custom_fields/mémoire dans BFF à supprimer à terme |

## Routes backend communes

| Méthode | Service et route backend | Tables / source | État |
| --- | --- | --- | --- |
| GET | Core `/api/v1/user/me/` | `users`, `roles`, `user_roles` ; cible : `user_profiles`, `services`, `sessions` | Existant ; enrichissement proposé (notamment `id`, absent de GetMeResponseView local) |
| PATCH | Core `/api/v1/user/me/` | `users` ; cible : `user_profiles` | Existant pour prénom, nom, e-mail, téléphone ; extension proposée pour le profil |
| GET | Core `/api/v1/groups/` | `groups`, `group_users` | Existant ; groupes de l'appelant |
| GET | Core `/api/v1/sessions/` | `sessions`, vue `v_sessions` | Existant ; sessions de l'appelant |
| GET | Core `/api/v1/sessions/history` | `sessions`, vue `v_sessions` | Existant ; historique de l'appelant |
| POST | Core `/api/v1/sessions/refresh` | `sessions` ; entrée `refresh_token` | Existant |
| POST | Core `/api/v1/sessions/revoke` | `sessions` ; entrée `refresh_token` | Existant ; ce n'est pas une révocation par `sessionId` |
| DELETE | Core `/api/v1/sessions/{sessionId}` | `sessions` ; session appartenant à l'appelant | Proposé pour la déconnexion d'un autre appareil, sans exposer son refresh token |
| GET | Core `/api/v1/services/` | `services` | Proposé ; annuaire unique |
| GET | Core `/api/v1/users/directory/` | `users`, `user_profiles`, `services`, `roles`, `user_roles`, `groups`, `group_users` | Proposé ; annuaire limité au périmètre autorisé |
| GET | Core `/api/v1/user/me/notifications/` | `notifications` ; filtre utilisateur connecté | Proposé |
| PATCH | Core `/api/v1/user/me/notifications/{notificationId}/read` | `notifications.read_at` ; filtre utilisateur connecté | Proposé |

## Routes backend du module

| Méthode | Service et route backend | Tables / source | État |
| --- | --- | --- | --- |
| GET, POST | Project `/api/v1/projects/` | `projects`, `project_members` ; extension labels/priorité/échéance | Client généré ; collection aussi présente dans sources API |
| GET, DELETE | Project `/api/v1/projects/{projectId}/` | `projects`, `project_members`, `tasks` | Client généré ; divergence de montage locale à résoudre |
| PATCH | Project `/api/v1/projects/{projectId}/` | `projects`, `project_members`, `project_label_links` | Client généré pour closeProject ; modification générale/enrichissement proposés |
| GET, POST | Project `/api/v1/projects/{projectId}/tasks/` | `tasks`, cible `task_assignees`, `task_label_links` | Client généré ; extensions proposées |
| PATCH, DELETE | Project `/api/v1/projects/{projectId}/tasks/{taskId}/` | `tasks`, `task_history`, cible `task_assignees`, `task_label_links` | Client généré ; extensions proposées |
| GET, POST | Project `/api/v1/projects/{projectId}/users/` | `project_members`, identités Core | Client généré |
| DELETE | Project `/api/v1/projects/{projectId}/users/{userId}/` | `project_members` | Cible normalisée ; client installé génère un double slash final |
| GET | Project `/api/v1/project-labels/` | `project_labels` | Proposé |
| GET | Project `/api/v1/projects/{projectId}/permissions/` | `projects`, `project_members`, `tasks` et droits/groupes Core | Proposé ; remplace la politique SQL BFF comme source propriétaire |
| GET, POST | Project `/api/v1/projects/{projectId}/tasks/{taskId}/comments/` | `task_comments`, `tasks`, identité auteur Core | Proposé |
| GET | Project `/api/v1/projects/{projectId}/tasks/{taskId}/history/` | `task_history`, identité auteur Core | Proposé |
| GET | Project `/api/v1/projects/stats` | `projects`, `project_members`, `tasks` ; dates réelles de clôture | Proposé ; mêmes statistiques que Tableau de bord |

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
