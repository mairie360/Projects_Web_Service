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

Mobile QA subsequently used an actual measured **390×844** viewport: the override
must be applied to the selected recipe tab, not a background control tab.
Creation and card editing each protected all fields and keyboard dismissal,
retained the draft after an explicit refusal, and closed after a confirmed retry
despite a failed refresh. The held card-edit attempt produced one PATCH and no
contract violations; its final counter read was unavailable after the temporary
fixture stopped, so that read is not claimed as evidence. The confirmed-save
message and closed dialog were observed in the real UI; console and horizontal
overflow checks passed. Earlier 1280×720 captures are desktop evidence only.

No live BFF authentication/persistence or deployed environment is certified.
The first PR CI failed the npm security audit on five high-severity findings;
skipped build/release checks are not passes. Closure still requires green
applicable CI, integration into main and an exact local-current refresh.

No API/BFF, client/proxy, contract, dependency, shared library, security/workflow,
environment approval or cluster pin is changed. Fixture data stays outside
production source and the preserved local-demo remains untouched.
