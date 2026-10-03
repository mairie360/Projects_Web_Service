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

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.

## Project form submission recovery (MAIR-459)

Jira [MAIR-459](https://mairie-360.atlassian.net/browse/MAIR-459) and
[issue #210](https://github.com/mairie360/Projects_Web_Service/issues/210) cover
**New project** and **Edit from a card**, not the inline detail editor (MAIR-389)
or the separate read-recovery PR #209.

- A synchronous ref guards duplicate submissions before React can render the
  pending UI. Pending fields (including nested tasks), cancel, close and Escape
  cannot discard or alter the submitted draft; focus remains inside the dialog.
- A refused write keeps the complete form and reports an accessible inline error.
  A deliberate retry is possible. Only a confirmed POST/PATCH closes and resets
  the form. A subsequent read failure reports the confirmed save separately and
  does not invite another write.
- `tests/projects-form-pending.test.cjs` drives the real page/form and unchanged
  contract-gated HTTP routes for both modes, including synchronous duplicate
  callbacks, refusal/retry and confirmed-write/failed-read states. Component
  checks cover inherited disabled fields, focus trapping and accessible feedback.

Native browser QA against disposable contract-validated fixtures reproduced two
pending POSTs on the main snapshot and one per attempt on the candidate. Desktop
creation and card editing (1280×720) retained fields/tasks on refusal, accepted a
retry and closed after confirmation despite a failed refresh, without a write
replay. Console health and absence of horizontal overflow were checked. One
held request also reached the existing 15-second proxy timeout and retained its
draft; the explicit contract refusal was then verified separately.

The mobile viewport request was ignored by the integrated browser (actual
1280×720, including a new tab). **Mobile QA remains unverified**, and these
desktop captures are not mobile evidence. No live BFF authentication/persistence
or deployed environment is certified. Closure still requires mobile QA, green
applicable CI, integration into main and an exact local-current refresh.

No API/BFF, client/proxy, contract, dependency, shared library, security/workflow,
environment approval or cluster pin is changed. Fixture data stays outside
production source and the preserved local-demo remains untouched.
