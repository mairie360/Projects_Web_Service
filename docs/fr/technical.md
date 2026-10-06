# Projects_Web_Service — Documentation technique

## Assignés de tâches ordonnés — MAIR-408

`uniqueAssigneesInOrder` trimme, filtre et déduplique avec un `Set` ordonné, sans
utiliser le helper trié de catalogue `getUniqueValues` (inchangé).
`taskToFormState` place le responsable réellement reçu avant ses autres membres
et déduplique. Sauvegardes imbriquées et fiche utilisent le même helper ordonné ;
choix, retraits et fallback restent dans les handlers existants. Aucun nouvel
effet, appel, champ de contrat, DTO ou backend. Les tests vérifient responsable
et membres indépendamment des labels optionnels du reçu, puis les corps réels
POST projet/POST-PATCH tâche et le refus/réessai explicite identique.

## Défaut de date des tâches imbriquées — MAIR-408

`ProjectTasksEditor` conserve une date privée `string | null` : `null` signifie
non choisie, toute chaîne (y compris `''`) appartient à la tâche. La date rendue
et enregistrée est `draft.dueDate ?? form.dueDate`, sans copie dans un effet.
Les dates des tâches existantes restent des chaînes. Le marqueur ne modifie ni
`TaskFormState`, ni la tâche de présentation, ni le DTO, proxy ou BFF. Les
régressions composant couvrent années intermédiaires, brouillon titré, choix,
effacement, édition et annulation ; la régression page/harnais réel vérifie les
dates parent/tâches du POST unique, l’absence de marqueur/ID et le reçu canonique.

## Redirections opaques du client navigateur — MAIR-408

`requestBff` impose `redirect: 'manual'` puis vérifie l’AbortSignal après réception.
Le type `opaqueredirect` est traité avant statut, en-têtes et corps :
`BffProjectNavigationRequiredError` signale la navigation sans supposer un 401
ni inspecter Location. Un WeakSet indexé par Location limite les réponses
parallèles à un rechargement du document ; aucune lecture ni mutation n’est
rejouée. Le middleware inchangé construit Login et le retour au document initial.
Le cleanup 401 existant reste conservé. Erreurs réseau et vrais 403/503 ne
rechargent pas la page. Routes, méthodes et payloads contractuels sont inchangés.

## Construction des credentials frontend — MAIR-408

`createRequestHeaders` ajoute seulement Accept et Content-Type JSON par défaut
et conserve les en-têtes explicitement fournis. Il n’appelle plus les helpers
de jeton stocké. Le proxy same-origin inchangé dérive Authorization du cookie
HttpOnly en l’absence d’en-tête explicite ; l’authentification serveur ne change
pas. Les helpers historiques restent disponibles mais ne sont pas branchés sur
la construction des requêtes Projects. Le cleanup existant après401 est conservé.
Les tests client avec contrat couvrent stockage ancien/actuel/historique, priorité
du cookie, stockage refusé, lectures et duplication ; ils ne certifient pas un
stockage navigateur ou une session déployée de bout en bout.

## Pied de page partagé — MAIR-180

L’audit CI inchangé a détecté la dépendance d’outillage transitive
`brace-expansion@1.1.18`. Son entrée verrouillée passe à la version corrigée
compatible `1.1.21`, avec l’intégrité vérifiée sur le registre, conformément à
[l’avis amont](https://github.com/advisories/GHSA-qhr7-859c-m2p7).
Aucun seuil d’audit, workflow ou contrôle de sécurité n’est assoupli.

Le paquet est épinglé à `@mairie360/lib-components@0.6.8`, publié par
[la publication réussie de 0.6.8](https://github.com/mairie360/lib-components/actions/runs/36836970818), qui inclut la correction du pied de page #388.
L’AppShell affiche désormais le copyright dans la sidebar sombre, hors de la
navigation défilante. Le tiroir mobile conserve sa gestion du focus. Aucun bandeau
de pied de page ne réduit la zone de contenu ; seules les informations fournies
par le service sont affichées (pas de version fictive).
Les contrats, les API/BFF et les approbations de déploiement sont inchangés.
Le suivi de l’adoption reste dans [l’issue partagée #387](https://github.com/mairie360/lib-components/issues/387).

## Structure applicative partagée — MAIR-180

La page Projects utilise l’`AppShell` partagé pour la navigation ordinateur et
mobile, l’en-tête et le pied de page. Seules les URL runtime des modules actifs
sont transmises ; les destinations invalides sont omises. La réponse BFF fournit
toujours le rôle et les permissions. Aucun changement d’appel ni de contrat BFF.
Un paquet publié de `@mairie360/lib-components` exportant `AppShell` est
nécessaire avant déploiement.

## Profil centralisé dans Settings — lot MAIR-180

Les requêtes authentifiées vers `/profile` et ses sous-chemins redirigent (307)
dans le middleware vers `SETTINGS_FRONT_URL`, lue à chaque requête ; aucun profil
métier n’est chargé ici. Une destination absente, invalide, avec identifiants
intégrés ou contenant un segment `profile` renvoie HTTP 503 sans cache. Les
paramètres de l’ancien favori ne sont pas transmis. Le contrôle d’authentification
existant s’applique d’abord. Aucun nouveau contrat BFF, secret ni variable runtime.

## Destinations frontend explicites (MAIR-177)

Les redirections utilisent uniquement des URL HTTP(S) configurées, sans
identifiants intégrés. Aucun repli implicite vers localhost. Renseigner à
l’exécution les variables existantes `LOGIN_FRONT_URL` (fronts protégés) et
`PROJECT_FRONT_URL` (destination par défaut de Login), même en local. Login
accepte toujours un retour vers un front autorisé si sa destination par défaut
manque. Sans destination Login valide, le middleware répond 503 sans cache ;
Login affiche un état indisponible sans formulaire si aucune destination ne
peut être résolue. Aucun contrat API/BFF ni variable de déploiement ajouté.


[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

## Architecture et traitement des requêtes

Application Next.js 16.3.6, React 19 et TypeScript avec App Router. Le navigateur appelle les routes de la même origine; le serveur Next.js relaie les données vers **BFF_Project**.

```mermaid
flowchart LR
  Browser --> Next["Projects_Web_Service"]
  Next --> BFF["BFF_Project"]
```

`src/app/page.tsx` compose le contrôleur stable `useProjectsController` et
`ProjectsWorkspace`. Le contrôleur conserve état/effets, révisions des lectures
et gardes synchrones des mutations ; le rendu utilise ses props inférées sans
lecture supplémentaire ni état métier dupliqué. Les dialogues sont importés
directement depuis `CreateProjectModal.tsx` et `ProjectDetailModal.tsx`.
Ordre des hooks, corps des callbacks, focus et protections pendant l'attente
restent identiques. `bffProjectClient.ts` adapte toujours le contrat et
`projectPageState.ts` centralise les mises à jour. Les tâches/collaborations du
détail restent un volet d'audit distinct ; ce découpage ne certifie ni révocation,
persistance des métadonnées, déploiement ou totalité de MAIR-408.

Le proxy générique lit le contrat OpenAPI versionné pour autoriser chemins et méthodes. Il conserve paramètres de requête, corps binaire, statuts et en-têtes utiles, filtre les en-têtes de transport, désactive le cache et n’effectue pas de suivi automatique des redirections. Son délai est de 15 secondes.

## Données et persistance

Les sources et limites suivantes concernent le BFF associé, dont dépend la sauvegarde des données affichées.

Le module combine Project API et PostgreSQL. Le dépôt SQL gère notamment visibilité, membres, projets, tâches et collaboration. Les commentaires et une partie de l’historique utilisent `tasks.custom_fields`; l’historique de statut peut venir de `task_history`. Avec `PROJECT_DB_ACCESS=disabled`, la collaboration utilise un repli mémoire perdu au redémarrage.

Désactiver l’accès SQL change les capacités et la persistance; ce mode ne constitue pas une validation d’un déploiement complet. Les identifiants publics et statuts sont normalisés par les helpers, tandis que certains champs de projet sont dérivés des tâches.

L’état React gère l’affichage et les opérations en cours. Ce dépôt ne définit pas de base métier propre; les garanties de sauvegarde sont celles du BFF et de ses sources décrites ci-dessus.

## Installation et lancement local

Utiliser Node.js 22 pour reproduire le job de contrats et npm avec le fichier de verrouillage versionné. Les versions des autres jobs et de Docker sont précisées plus bas.

Les dépendances privées `@mairie360/*` nécessitent un accès GitHub Packages. Configurer `NODE_AUTH_TOKEN` dans l’environnement avec un jeton autorisé à lire ces packages, conformément à `.npmrc`. Ne pas enregistrer la valeur dans Git.

```bash
npm ci
```

Créer `.env.local` à la racine. Exemple pour des BFF exécutés sur la même machine:

```dotenv
BFF_PROJECT_BASE_URL=http://localhost:4001
```

Démarrer BFF_Project (il résout lui-même la session auprès de BFF User), puis lancer le web service. Le port `5001` ci-dessous est un choix local explicite pour éviter les collisions; ce n’est pas une affirmation sur les ports de tous les fichiers Compose.

```bash
npm run dev -- --port 5001
```

Ouvrir `http://localhost:5001`. Pour exécuter le build avec le script Next.js:

```bash
npm run build
npm run start -- --port 5001
```

## Configuration

Si la session manque ou a expiré, le middleware transmet `redirect` à Login. Il construit la destination avec `PROJECT_FRONT_URL` lu à l’exécution, puis le chemin et la query demandés, jamais avec l’hôte interne de l’ingress. Sans URL publique valide, Login utilise sa destination Projets par défaut.

Les valeurs ci-dessous sont des exemples locaux ou des comportements explicitement indiqués, pas des identifiants de production.

| Variable ou priorité | Exemple / repli indiqué | Rôle |
| --- | --- | --- |
| `BFF_PROJECT_BASE_URL` → `PROJECT_BFF_URL` → `NEXT_PUBLIC_BFF_PROJECT_BASE_URL` | http://localhost:4001 | Priorité de gauche à droite dans le proxy ; configurer explicitement une URL HTTP(S). Une configuration absente ou invalide renvoie un 503 non mis en cache, sans appel réseau. |
| `COOKIE_DOMAIN` | — | Domaine des cookies; vérifier sa cohérence avec Login ; la déconnexion locale efface le cookie sur ce domaine. |
| `ADMINISTRATION_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `CALENDAR_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `ELEARNING_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `EMAIL_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `FILES_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `LOGIN_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `MESSAGE_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |
| `PROJECT_FRONT_URL` | — | Destination de navigation; voir le fichier source qui la lit. Les variables injectées par `next.config.ts` ou préfixées `NEXT_PUBLIC_` sont publiques et prises en compte lors du build. |

Dans un conteneur, `localhost` désigne le conteneur lui-même. Utiliser le nom DNS du service BFF sur le réseau Docker, ou une adresse d’hôte accessible. Les fichiers Compose incluent parfois d’autres services et des paramètres hérités; vérifier les URL et ports effectifs avant de les employer.

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`, reconstruction exacte du paquet publié `@mairie360/bff-project-openapi` épinglé dans `package.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés et champs requis sont définis dans ce contrat. Le paquet orval ne type que les succès (`2XX`) ; les erreurs de BFF_Project utilisent l’enveloppe `ApiError` (`{ error: { code, message, details } }`).

Ces chemins de données sont exposés à la même origine par le proxy; les pages Next.js sont distinctes. `/openapi.json` et `/swagger.json` sont également relayés. L’interface Swagger `/docs` se consulte directement sur le BFF.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
| --- | --- | --- | --- |
| GET | `/check_apis` | — | 2XX |
| GET | `/health` | — | 2XX |
| POST | `/projects` | application/json | 400, 2XX |
| GET | `/projects-page` | — | 500, 2XX |
| DELETE | `/projects/{projectId}` | — | 404, 2XX |
| GET | `/projects/{projectId}` | — | 404, 2XX |
| PATCH | `/projects/{projectId}` | application/json | 400, 404, 2XX |
| PATCH | `/projects/{projectId}/close` | application/json | 403, 2XX |
| POST | `/projects/{projectId}/duplicate` | — | 404, 2XX |
| POST | `/projects/{projectId}/tasks` | application/json | 400, 404, 2XX |
| DELETE | `/projects/{projectId}/tasks/{taskId}` | — | 404, 2XX |
| PATCH | `/projects/{projectId}/tasks/{taskId}` | application/json | 400, 404, 2XX |
| GET | `/projects/{projectId}/tasks/{taskId}/collaboration` | — | 403, 2XX |
| POST | `/projects/{projectId}/tasks/{taskId}/comments` | application/json | 403, 2XX |
| PATCH | `/projects/{projectId}/tasks/{taskId}/status` | application/json | 400, 404, 2XX |

### Pages et route locale

| Page | Source |
| --- | --- |
| `/` | [src/app/page.tsx](../../src/app/page.tsx) |
| `/profile` et sous-chemins | [src/middleware.ts](../../src/middleware.ts) redirige vers Settings |

| Méthode | Route locale | Source |
| --- | --- | --- |
| POST | `/api/auth/logout` | [src/app/api/auth/logout/route.ts](../../src/app/api/auth/logout/route.ts) |

## Session, permissions et erreurs

BFF_Project est le seul service appelé par ce web service ; c’est lui qui résout l’utilisateur auprès de BFF User. Le rôle affiché par le shell vient du bloc `access` de `GET /projects-page` (le contrat publié n’expose ni nom ni e-mail, l’en-tête affiche donc le libellé du rôle). `/api/auth/logout` est local : il efface le cookie `accessToken` sans appeler de service, la session n’est donc pas révoquée côté serveur, faute de route de déconnexion dans le contrat publié. Le proxy générique utilise le Bearer explicite ou, en son absence, le cookie `accessToken`. Les permissions métier restent celles du BFF et de ses sources.

Le proxy générique répond 400 pour un chemin invalide, 404 pour un chemin hors contrat, 405 pour une méthode interdite et 502 si le service est injoignable ou dépasse le délai. Les réponses amont sont conservées, y compris les corps vides 204/205/304.

Toutes les réponses portent `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` et `Cross-Origin-Resource-Policy`, `Cross-Origin-Embedder-Policy` et `Cross-Origin-Opener-Policy` (`next.config.ts`), et `X-Powered-By` est désactivé. Pour les requêtes authentifiées, [src/middleware.ts](../../src/middleware.ts) ajoute une `Content-Security-Policy` avec un nonce propre à chaque requête, que Next.js applique à ses scripts. Les pages sont donc rendues à la demande (`dynamic = "force-dynamic"` dans le layout). Les feuilles de style sont limitées à l'origine et au nonce ; seuls les attributs `style` rendus par les composants passent par `style-src-attr 'unsafe-inline'`, et `next dev` autorise aussi `'unsafe-eval'`. Toute nouvelle ressource externe (image, police, API appelée depuis le navigateur) doit être ajoutée à la politique dans `src/lib/content-security-policy.ts`.

## Synchronisation et vérifications

Le contrat provient d’une version **publiée** de BFF_Project. Après une publication, épingler la nouvelle version (`npm install --save-exact @mairie360/bff-project-openapi@X.Y.Z`, jamais une préversion `0.0.0-dev`/`staging`), aligner les tags d’image `bff-project` des `docker-compose*.yml` sur cette version, puis exécuter :

```bash
npm run contracts:sync
npm run contracts:check
npm run test:contracts
npm run lint
npm run build
```

`contracts:sync` reconstruit `contracts/openapi.json` depuis le paquet installé (`scripts/orval-contract.mjs`). `contracts:check` échoue si la version n’est pas un `X.Y.Z` exact, si le paquet installé diffère, si un autre paquet `bff-*-openapi` existe ou si le snapshot est périmé. Les deux fonctionnent hors ligne. Les types sont importés de `@mairie360/bff-project-openapi/model`. `test:contracts` exécute les tests Node sans coverage ; `npm test` les exécute avec le seuil de 60 % (lignes, branches, fonctions) sur les modules `src/**/*.ts` chargés, rapportés aux lignes TypeScript grâce aux source maps.

Les tests reprennent les mocks pilotés par contrat des BFF : `tests/support/contract-mock-server.ts` et `openapi-contract.ts` sont des copies à l’identique des helpers des BFF. Un seul vrai serveur HTTP local simule BFF_Project, piloté par `contracts/openapi.json` ; il refuse tout chemin, méthode, paramètre ou corps hors contrat et valide les réponses simulées. `tests/support/front-harness.cjs` route le `fetch` same-origin du navigateur vers les vrais handlers `src/app/**/route.ts` et n’autorise le proxy serveur qu’à joindre ce mock. `tests/network-contract.test.cjs` inventorie statiquement chaque appel réseau de `src/` et échoue si l’un d’eux contourne `requestBff` ou le contrat. `tests/package-contract.test.cjs` vérifie l’épinglage exact, l’unicité du paquet de contrat, le snapshot et les tags d’image Docker.

Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans modification de leur source.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 22, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/frontend-cicd.yml@v2.0.0`, avec `cicd_version: v2.0.0` et `node_version: "23"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

Le Dockerfile utilise par défaut `NODE_VERSION=23.10.0` et le build Next.js `standalone`; la commande de l’image est `["node", "server.js"]`. Le port de l’image et les mappings Compose peuvent différer du port local proposé plus haut.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Diagnostic

### Confirmation des commentaires de tâche — MAIR-446 / issue #204

`ProjectDetailModal` distingue la sélection du suivi, la génération de lecture
et le verrou immédiat d’envoi. Une réponse ou erreur tardive ne remplace pas
une autre tâche et ne rouvre pas un panneau fermé. Une actualisation du même
projet conserve le suivi et son brouillon ; un changement de projet ou le
démontage invalide les opérations de présentation précédentes.

Le retour existant de `addTaskComment` fournit le commentaire confirmé :
il est rapproché par identifiant, sans donnée auteur/date fabriquée, puis le
brouillon envoyé est vidé. L’échec de `getTaskCollaboration` ne supprime pas ce
commentaire et affiche « Commentaire enregistré. Actualisation impossible ».
Une lecture réussie encore en retard conserve également les commentaires
confirmés manquants. « Actualiser le suivi » relance seulement le GET. Un POST
refusé conserve le brouillon et libère le nouvel essai ; les appels rapprochés
ou pendant l’envoi ne doublent pas l’écriture. L’état d’envoi est annoncé et
le champ est temporairement désactivé. `canComment=false` masque toujours le
formulaire, sans changer les permissions côté serveur.

Les régressions utilisent la vraie page et les routes existantes dans le
harnais contractuel. Aucun client/proxy/route/contrat, API/BFF, dépendance,
environnement ou donnée métier de référence ne change. Une recette locale
sur copies jetables ne constitue pas une preuve de persistance déployée.

Si le rôle ou le contexte utilisateur échoue, vérifier `GET /projects-page` sur BFF_Project (et, derrière lui, BFF User). Si les vues divergent, comparer la réponse de BFF Project, ses permissions et les conversions de `bffProjectClient.ts`. Le mode SQL et le repli mémoire se configurent dans BFF Project, pas dans ce web service.

En cas d’erreur de proxy, comparer la route et la méthode à l’inventaire, vérifier l’URL du BFF puis la session. Pour un 401 après navigation entre modules, vérifier le cookie `accessToken`, son domaine et BFF_Project. Un 404 sur un besoin décrit dans `BACKEND.md` peut correspondre à une fonctionnalité seulement proposée.

## Repères dans le dépôt

- [src/app/page.tsx](../../src/app/page.tsx)
- [src/lib/bffProjectClient.ts](../../src/lib/bffProjectClient.ts)
- [src/lib/projectPageState.ts](../../src/lib/projectPageState.ts)
- [src/components/project](../../src/components/project)
- [src/middleware.ts](../../src/middleware.ts)
- [src/lib/bff-proxy.ts](../../src/lib/bff-proxy.ts)
- [src/app/[...path]/route.ts](../../src/app/%5B...path%5D/route.ts)
- [contracts/openapi.json](../../contracts/openapi.json)
- [scripts/orval-contract.mjs](../../scripts/orval-contract.mjs)
- [scripts/contracts.mjs](../../scripts/contracts.mjs)
- [package.json](../../package.json)
- [.github/workflows/contracts.yml](../../.github/workflows/contracts.yml)
- [.github/workflows/cicd.yml](../../.github/workflows/cicd.yml)
- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)

Compléments historiques: [BFF.md](../../BFF.md), [BACKEND.md](../../BACKEND.md). Les besoins proposés doivent rester distincts du comportement effectivement implémenté.
