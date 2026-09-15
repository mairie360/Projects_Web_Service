# Contrat web service / BFF

Ce web service consomme **uniquement BFF_Project**, via son contrat publié `@mairie360/bff-project-openapi` épinglé à une version exacte dans `package.json`. [contracts/openapi.json](contracts/openapi.json) en est la reconstruction versionnée ; les types TypeScript sont importés du paquet (`@mairie360/bff-project-openapi/model`).

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Le front n’appelle aucun autre BFF : le rôle affiché vient de `access` dans `/projects-page`, et `/api/auth/logout` est une route locale qui efface le cookie sans appeler de service. Les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 CheckApiResponse |
| PATCH | `/projects/{projectId}/close` | 200 Projet clôturé ou suspendu |
| POST | `/projects` | 201 Projet créé |
| POST | `/projects/{projectId}/tasks` | 201 Tâche créée avec succès |
| DELETE | `/projects/{projectId}` | 204 Projet supprimé avec succès |
| PATCH | `/projects/{projectId}` | 200 Projet mis à jour avec succès |
| GET | `/projects/{projectId}` | 200 Projet trouvé |
| DELETE | `/projects/{projectId}/tasks/{taskId}` | 204 Tâche supprimée avec succès |
| PATCH | `/projects/{projectId}/tasks/{taskId}` | 200 Tâche mise à jour avec succès |
| POST | `/projects/{projectId}/duplicate` | 201 Projet dupliqué avec succès |
| PATCH | `/projects/{projectId}/tasks/{taskId}/status` | 200 Statut de la tâche mis à jour avec succès |
| GET | `/projects-page` | 200 Page projets chargée avec succès |
| GET | `/projects/{projectId}/tasks/{taskId}/collaboration` | 200 Suivi collaboratif |
| POST | `/projects/{projectId}/tasks/{taskId}/comments` | 201 Commentaire ajouté |

## Mise à jour et validation

Après une publication de BFF_Project, épingler la version (`npm install --save-exact @mairie360/bff-project-openapi@X.Y.Z`, jamais une préversion dev/staging), aligner les images `bff-project` des `docker-compose*.yml`, puis exécuter `npm run contracts:sync`, `npm run contracts:check` et `npm run test:contracts`. Ces commandes fonctionnent hors ligne ; la CI vérifie l’épinglage et que `contracts/openapi.json` correspond au paquet installé.

Besoins proposés pour BFF_Project, absents du contrat publié : une route d’identité de session (nom, e-mail, groupes) pour l’en-tête et la page profil, et une route de déconnexion qui révoque la session côté serveur.
