# Contrat web service / BFF

Ce web service consomme **BFF_Project**. La copie [OpenAPI](contracts/openapi.json) définit les routes et les données échangées ; les [types TypeScript](src/contracts/bff.d.ts) sont générés depuis cette copie.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

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

Dans le BFF associé, exécuter `npm run contracts:generate`. Dans ce web service, exécuter `npm run contracts:sync`, puis `npm run contracts:check` et `npm run test:contracts`. Les dépôts peuvent être voisins ; sinon `BFF_CONTRACT_DIR` indique le répertoire `contracts` du BFF. La CI vérifie que les types correspondent au document livré, même sans checkout du dépôt voisin.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.
