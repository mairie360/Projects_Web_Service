# Projects_Web_Service

Enable municipal project and task tracking through Kanban, grid and table views. Data and permissions come from BFF Project.

Permettre le suivi des projets et tâches de la mairie dans des vues Kanban, grille et tableau. Les données et permissions proviennent de BFF Project.

## Documentation

| Language / Langue | Module | Technical / Technique |
| --- | --- | --- |
| English | [Module overview](docs/en/module.md) | [Technical documentation](docs/en/technical.md) |
| Français | [Présentation du module](docs/fr/module.md) | [Documentation technique](docs/fr/technical.md) |

The guides describe the implemented module, its current limitations, local setup, routes, data, verification and CI/CD.

Les guides décrivent le module implémenté, ses limites actuelles, le démarrage local, les routes, les données, les vérifications et la CI/CD.

## Frontend checks / Vérifications du front

`npm test` runs the existing Node contract/security suite and the Vitest component suite. Use `npm run test:node` or `npm run test:components` for an isolated run. The component checks stub only the published BFF Project client and cover loading, failure, empty data, project/task deep links and basic keyboard/axe accessibility. They do not replace live BFF end-to-end or role-based browser tests.

`npm test` lance les tests Node de contrat/sécurité et les tests de composants Vitest. Les réponses BFF des tests sont synthétiques et restent hors du code de production.

## Frontend image packaging / Packaging des images frontend

MAIR-436 / #206 pins production and development to the official Node 24.21.0 Bookworm slim digest and the same exact Node version in both consumer workflows. Both Dockerfiles use `npm ci` with the tracked npm policy mounted readonly and the existing `node_auth_token` BuildKit secret required only during installation. Supply the credential through `--secret id=node_auth_token,env=NODE_AUTH_TOKEN`, never a build argument. Development keeps npm for its existing command; the non-root standalone production runner retains Node/curl and port 5001 without unused global package managers. All three Compose files adapt only the frontend build secret; the unnecessary development runtime credential mount is removed. Other services and runtime configuration are unchanged.

The repository's required legacy status name is backed by a real blocking Semgrep and redacted Gitleaks job using reviewed immutable shared actions, complete frontend history and read-only contents access. The existing shared 4.0.2 audit remains enabled. No synthetic check or ruleset change is used. Tests in `tests/ci-policy.test.cjs` and `tests/required-security-check.test.cjs` guard this packaging and scanner configuration; actual image, scanner and isolated-stack outcomes still require CI evidence. This slice does not resolve MAIR-436's global permissions, push filters, dependency criteria or other frontends, and does not change product code, APIs/BFFs, contracts, business data, cluster pins or Staging/Prod approvals.

La tranche MAIR-436 / #206 corrige uniquement le packaging consommateur Projects : Node 24.21.0 exact et digest officiel, installation reproductible avec secret temporaire requis/politique npm en lecture seule, aucun jeton d'installation exposé au runtime. Le contrôle GitHub requis exécute réellement les scanners bloquants, sans affaiblir les protections. Les critères globaux et les autres fronts restent ouverts ; les tests isolés ne prouvent pas un déploiement cluster ou la parité métier complète.

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.
