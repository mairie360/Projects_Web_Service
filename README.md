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

### Protected navigation after a redirect / Navigation protégée après redirection — MAIR-408

Project requests use manual redirects. An opaque redirect reopens the current
protected page once, so the existing middleware chooses Login and the return URL;
the client never reads the hidden Location or follows a data-route destination.
Aborted reads cannot navigate, and mutations are never automatically replayed.
Real 401 replies retain the existing local logout; 403, service and network
failures remain ordinary errors. API/BFF, middleware, proxy and auth routes are
unchanged. This does not certify deployed authentication or server revocation.

Une redirection opaque recharge une seule fois la page protégée courante, sans
lire sa destination masquée ni rejouer une écriture. Le middleware existant
garde le choix de Login et du chemin de retour. Une lecture annulée ne navigue
pas ; 403, indisponibilité et erreur réseau ne déclenchent aucune déconnexion.
La recette isolée ne constitue pas une validation de l’authentification déployée.

Validation on 5 October: 210 Node tests, 31 component tests, TypeScript,
published contract, lint (four inherited warnings) and production build pass.
Native 1280×720 QA reproduces the expired-cookie defect on main and verifies
the candidate's document return path, existing401 logout and read-only recovery
after403/503. The fixture ledger records eight upstream GET and no writes or
contract violations. The requested390×844 override stayed1280×720, so mobile
is not validated. Login is a labelled QA landing; integration still requires
all actual-head CI gates. No test fixture is shipped in product source.

Vérifications du5octobre : 210testsNode,31composants, types, contrat, lint
et build réussis. Recette native1280×720 avant/après qualifiée ; huitGET,
aucune écriture amont ni violation de contrat. Login reste une destination
QA étiquetée. Mobile non validé et intégration conditionnée aux CI réelles.

### Cookie session precedence / Priorité de la session cookie — MAIR-408

Project reads and mutations no longer read, migrate or automatically send tokens
from browser localStorage. A stale legacy token cannot override the cookie used
by the unchanged proxy. No cookie means no storage-derived fallback session.
Existing local logout cleanup and explicit-header proxy behavior are preserved;
no API/BFF, auth route, middleware, contract or dependency is changed. The mixed
audit's revocation, redirection, persistence and component-size concerns remain
separate. Tracking: [issue216](https://github.com/mairie360/Projects_Web_Service/issues/216)
and the existing composed PR214; integration requires the actual CI security gates.

Les lectures et mutations Projects ne lisent, ne migrent et n’envoient plus
automatiquement les jetons du stockage local. Un ancien jeton ne remplace plus
le cookie utilisé par le proxy inchangé. Sans cookie, aucun fallback de stockage
n’est réintroduit. Nettoyage au logout, proxy et authentification serveur restent
inchangés. Les autres volets de MAIR-408 ne sont pas déclarés terminés.

The published sidebar keeps the reference's 44px minimum navigation targets and
separating shadow. The mobile drawer lowers only its sidebar stacking level so
the shared Close button stays reachable. These consumer styles do not replace
AppShell or supply saved appearance preferences, identity or demo data (MAIR-180).

La sidebar publiée reprend les cibles de navigation de 44px minimum et l’ombre
de séparation de la référence. Son niveau d’empilement mobile reste sous Fermer,
sans remplacer l’AppShell ni simuler des préférences ou données (MAIR-180).

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
That initial mobile attempt was unverified: the browser retained an actual
1280×720 viewport. The later composed recipe below uses a measured 390×844.
No synthetic test data or temporary QA server
is included in the product. Actual-head CI and integration must pass separately.
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

### Composition with read recovery

PR #211 now depends on read-recovery PR #209. Their page conflict is resolved
by retaining the synchronous form guard and applying the confirmed POST/PATCH
response before refreshing. Create inserts once; edit replaces only its target.
Canonical titles and permissions come from that response, never the submitted
draft. The extended form regression closes the created detail before activating
the read-only retry and verifies that recovery sends no additional write.
The save-information notice is distinct from the current page-read error.

PR #214 now includes the resolved #209/#211 composition while remaining targeted
at main, with all main checks and approval requirements unchanged. Both form and
duplication refs are retained. Its eighth duplication regression combines early
repeat callbacks, a pending follow-up GET, view switching, an official confirmed
copy, refused reads and read-only recovery: exactly one POST and one copy.
This is preparation, not integration; do not close #208, #210 or #213 before
actual applicable green CI and main/local-current delivery.

Only merge into main after all applicable actual-head CI is genuinely green.
The #214 candidate now includes published #207 packaging and #212 shared-UI
commits as well as #209 read recovery and #211 form protection. This composition
is not a main integration or deployment; the original checkout and local-current
remain unchanged until those gates pass.

### Composed comparison — 4 October 2026

The five-slice candidate passed 202 Node tests (89.01% lines, 88.59% branches,
79.60% functions), 31 React tests, the published BFF Project 0.4.0 contract check,
TypeScript, lint (zero errors/four inherited warnings) and a one-worker Next
16.3.6 production build. Temporary worker configuration was restored before
commit. Source and tests match the all-five rehearsal; composition introduces
no new client/proxy, contract, API/BFF or deployment changes.

The preserved prototype's unchanged source/public files were built in a separate
disposable reference runtime with the same installed dependency tree. This is a
source comparison, not certification of its historical installation. Desktop
1280×720 and actual mobile 390×844 measurements have identical project heading
positions and no document overflow. When GET is refused, the reference hides
its cards without a visible page retry; the candidate keeps received cards,
announces stale page totals/options and recovers with GET only.

Native 390×844 interactions covered grid duplication while switching to table,
new-project fields/nested tasks, and card editing. Pending controls and keyboard
dismissal remain protected; explicit refusal retains drafts; deliberate retry
accepts the canonical response, closes the form and retains the confirmed
copy/create/edit despite a failed following read. Read retry never repeats the
write. The first candidate fixture session recorded 10 GET, four POST and one
PATCH; a fresh edit-recovery session recorded four GET and two PATCH. Each had
zero contract violations. These are separate fixture sessions, not a persistence
test; the reference ledger contains two GET and no write.

The QA servers stopped before an additional composed desktop duplication retry,
so that interrupted attempt and its fetch error do not certify desktop duplication.
Earlier isolated desktop evidence remains scoped to its recorded revision. Two
initial resize screenshots also retained desktop dimensions and are not mobile
proof; later pending/refusal/confirmed screenshots are genuinely 390×844.
Remaining shared-shell row/icon/version differences, real authentication,
multi-role acceptance, persistence and deployed ZAP/k6 are not certified here.
No fixture data or QA helper enters production. Main CI, integration and exact
local-current delivery remain mandatory before closing the linked issues.

La composition #214 réunit les commits publiés #207/#212 et les protections
#209/#211. Les 202 tests Node, 31 tests React, TypeScript, contrat, lint et build
local passent. La comparaison avec les sources conservées confirme le défaut
de lecture initial et sa correction, pas l'installation historique. En vrai
390×844, duplication, création et édition conservent les brouillons refusés et
les réponses confirmées sans rejouer l'écriture lors d'une reprise GET. Les deux
sessions du candidat sont distinctes et sans violation de contrat. La tentative
desktop interrompue n'est pas une réussite ; parité fine AppShell et recette
déployée restent séparées. Aucune donnée de démonstration, API/BFF, approbation
d'environnement ou pin de cluster ne change. Les tickets restent ouverts jusqu'à
une vraie CI verte et la livraison main/local-current.

## Shared UI alignment / Alignement UI partagé — MAIR-180

This consumer pins the published `@mairie360/lib-components@0.6.10`, including
its exact download URL and SHA512 integrity. Only the shared UI entry changes
in the lockfile; all other dependencies and security policies are preserved.
Tracking: [MAIR-180](https://mairie-360.atlassian.net/browse/MAIR-180) and
[cross-frontend issue](https://github.com/mairie360/Login_Web_Service/issues/142).
Login stays standalone without header/sidebar/footer; authenticated module
shells and the existing Elearning confirmation/rating features are preserved.
No API/BFF, contract, runtime configuration, demo data or deployment approval change.

Le pin exact et l'intégrité du package publié sont alignés sur Elearning sans
le rétrograder. Les tests de release vérifient le manifeste, le lockfile et le
vrai package installé. Une validation isolée ne remplace pas la CI verte,
l'intégration des sept consommateurs et la recette de la copie locale livrée.
