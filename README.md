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

### Refused page refreshes (MAIR-451)

An initial page-read failure is announced and offers a keyboard-accessible
`Réessayer` button. A refused refresh retains the last non-empty received
projects in Kanban, grid and table views, with an explicit stale-data notice.
An old empty response is not displayed as a newly confirmed empty result.

Retry requests only `GET /projects-page` using the current search, status,
priority, deadline and view. It does not replay confirmed project/task writes;
repeat activation is guarded while pending. A successful response replaces the
data and clears the error. Existing BFF permissions and contracts are unchanged.

Confirmed project writes are applied before the subsequent page refresh:
create/duplicate append the returned project once; card/detail edits, moves,
closure and suspension replace the received project; a successful DELETE 204
removes only its target. Refused writes never apply submitted drafts. Older or
aborted page reads cannot undo a later confirmation or overwrite a newer read
error. Page-level totals, options and pagination remain the last successful
page DTO, explicitly identified as such while a refresh is refused; they are
not fabricated from a potentially filtered or incomplete list. Task/comment
mutations are separate from this project-write recovery acceptance.

`tests/projects-refresh-recovery.test.cjs` exercises the real page and the
existing contract-gated proxy, using isolated test-only responses. These checks
do not certify deployed BFF availability, authorization or persistence.

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.
