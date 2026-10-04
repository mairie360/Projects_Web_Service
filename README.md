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

### Pending project duplication (MAIR-466)

Kanban, grid and table keep **Dupliquer** disabled and busy while that source
project's request and following read are pending. A synchronous per-project guard
also rejects repeated events before React updates the button; other projects stay
available. Refusal announces the existing service error, preserves filters and
allows an explicit retry. This does not change permissions or backend idempotency.

`tests/projects-duplication-pending.test.cjs` exercises the real page, views and
contract-gated frontend routes: seven cases cover all three views, early repeat
events, the follow-up read/view change, refusal/filter preservation, concurrent
different projects and an explicitly refused permission. The separate MAIR-451
read-recovery change remains necessary when a confirmed write's following GET
fails. This guard does not certify that unrelated recovery or live persistence.

Local Node coverage, 29 component tests, TypeScript, contract checks, lint (four
existing warnings, zero errors) and a one-worker production build passed. Native
desktop 1280×720 QA against disposable contract fixtures exercised pending,
refusal and confirmed retry across Kanban/grid/table, with no contract violations.
Mobile remains unverified: the integrated browser retained an actual 1280×720
viewport after requesting 390×844. No synthetic test data or temporary QA server
is included in the product. Actual-head CI and integration must pass separately.

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.
