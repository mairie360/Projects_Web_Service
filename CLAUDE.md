# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 16 (App Router, React 19, TypeScript, Tailwind 4) web service for Mairie360 hosting the project & task management module (list/kanban views, tasks, comments, collaboration). The browser only talks to this app's own origin, and the Next.js server talks to **one service only: BFF_Project**. It goes through BFF_Project's published contract, and BFF_Project calls BFF User itself. This front must never call BFF User or any other BFF directly. UI building blocks come from the private package `@mairie360/lib-components`. Docs are bilingual: `docs/en|fr/module.md` (functional) and `docs/en|fr/technical.md` (routes, config, troubleshooting) — update both languages together. `BFF.md` / `BACKEND.md` contain *proposed* backend needs; the published contract package is the source of truth for implemented behaviour.

## Commands

Private `@mairie360/*` packages come from GitHub Packages: `.npmrc` reads `NODE_AUTH_TOKEN`, so export a token with `read:packages` before installing or building images.

```bash
npm ci
npm run dev -- --port 5001         # needs BFF_Project reachable, see "BFF URL" below
npm run build && npm run start -- --port 5001
npm run lint                             # ESLint on src/
npm test                                 # node:test on tests/*.test.cjs + lcov in coverage/lcov.info (what CI runs)
npm run test:contracts                   # same tests, no coverage
node --test --enable-source-maps --test-name-pattern="<name>" tests/bff-project-client.test.cjs   # single test
```

The `tests/*.test.cjs` suite uses CommonJS `node:test`; component tests use Vitest. The 60% node-test coverage threshold (lines/branches/functions) only counts modules a test loads; `network-contract.test.cjs` loads every `src/**/*.ts`, and `projects-page-html.test.cjs` loads the `.tsx` UI, which therefore counts too (its many handlers are what keeps the function ratio near the threshold: cover new interactions there). `--enable-source-maps` makes coverage report TypeScript lines, which also counts type-only lines as uncovered, so the percentages are lower than without it.

- `tests/support/typescript.cjs` (`requireTs`) is the shared loader: a `.ts` hook with inline source maps that resolves the `@/*` alias. `proxy.test.cjs` and `security-headers.test.cjs` still use their own inline hook and stub `global.fetch`.
- `tests/support/{openapi-contract,contract-mock-server}.ts` are **verbatim copies** of the BFF helpers (`../../BFFs/BFF_*/tests/support/`); keep them identical. They are type-checked by `next build` because the tsconfig includes `**/*.ts`.
- `front-harness.cjs` starts one real HTTP mock, for BFF_Project, driven by `contracts/openapi.json`. It also replaces `global.fetch` and `global.window`:
  - same-origin paths go to the real `src/app/**/route.ts` handlers, which it discovers the way the App Router does;
  - absolute URLs may only target the mock (`allowUpstream` adds an extra one, e.g. a closed port).

  `violations()` (checked in `afterEach`) collects contract mismatches, undeclared query params, cookies forwarded to the BFF and blocked calls. Orval only types successes (`2XX`), so error replies must go through `harness.errorReply(status, body)`. It marks them `outOfContract` but still validates the body against the published `ApiError` model.
- `network-contract.test.cjs` walks the TypeScript AST of `src/` and forbids network primitives other than `fetch`. It allows `fetch` only in three places:
  - `forwardToBff`, which may only be called by the catch-all route's `proxyBffRequest`;
  - `requestBff`, which only the axios adapter of the generated `bffProject` client (`getBffProject` from `@mairie360/bff-project-openapi/endpoints/bffProject`) calls;
  - `logoutAndReload`, which posts to the local `/api/auth/logout`.

  The only route files allowed are the catch-all and that local logout route, which must not import the proxy. Every `bffProject.<operation>(…)` call must name an operation of the generated client whose method+path match the contract and are served by the catch-all, and `ProjectsPageQuery` keys must equal the declared query params. `bff-project-client.test.cjs` then checks that every consumed operation was exercised against the mock. A new client call must use a generated `bffProject.<operation>` function: `bffProjectClient.ts` may not contain any hand-written path, and axios is allowed only in that file.
- `package-contract.test.cjs` checks that:
  - the package is pinned to an accepted exact version (`scripts/contract-version.mjs`: a release `X.Y.Z`, a `0.0.0-dev.<sha40>` dev package of BFF_Project `main` or, since MAIR-600, the `0.0.0-staging.<sha40>` staging package of that commit; `0.0.0-staging.<short sha>` and ranges are refused), installed and locked at that version; the `@mairie360/bff-user-openapi` session types follow the same policy as a devDependency;
  - it is the only `@mairie360/bff-*-openapi` dependency;
  - `contracts/openapi.json` equals the rebuild from the package;
  - every `docker-compose*.yml` uses the `bff-project` and `bff-user` images built from the pinned commits (`X.Y.Z`, `dev-<sha7>` for a dev package, or `staging-<sha7>` for a staging package; never a `../BFF_Project` build);
  - the `projects-front` service references no other service than BFF_Project.
- `projects-page-html.test.cjs` renders the real `src/app/page.tsx` with its components through `tests/support/server-view.cjs` (`react-dom/server` with hook state kept between passes, same file in every front, see `../CLAUDE.md`) on the harness: loading, `/projects-page` with the declared query, search/filters/views, card menu (duplicate, edit, delete with confirmation), task composer, detail modal (task status, deletion, collaboration and comments, inline edit, close) are driven through `view.click` / `view.fire` / component props and asserted on the HTML and the BFF calls.
- `session.test.cjs` replaces `react` in `require.cache` with a one-render `useState`/`useEffect` stub to test `useAuthSession`.
- `bff-fixtures.cjs` holds contract-valid bodies. JWTs use a fixed `exp`, because tokens computed from `Date.now()` made tests flaky.

### OpenAPI contract

The only contract is **BFF_Project's, as published in `@mairie360/bff-project-openapi`**, pinned to an exact version in `package.json` (`dependencies`). Never copy it from a BFF checkout: the local `BFFs/BFF_Project` can be ahead of the last release. The package is orval output (`endpoints/bffProject.ts` + `model/*.ts`, no `openapi.json`), so:

- `scripts/orval-contract.mjs` rebuilds an OpenAPI document from it, using the TypeScript compiler API. It is the same ESM port as `Login_Web_Service/scripts/orval-contract.mjs`; only `PACKAGE_NAME` differs, so keep the two identical otherwise. It writes the committed `contracts/openapi.json` (`info.x-source-package` names the version), which the proxy imports at build time and the tests load. Never hand-edit it.
- orval keeps paths, methods, parameters, bodies, success models and JSDoc constraints. It drops formats, examples and error statuses, and exposes success as `2XX`.
- Source code imports its types straight from the package (`import type { ProjectsPageResponse } from '@mairie360/bff-project-openapi/model'`). There is no generated `.d.ts`.

```bash
npm install --save-exact @mairie360/bff-project-openapi@<version>   # bump: a release X.Y.Z, a published 0.0.0-dev.<sha40> or 0.0.0-staging.<sha40> (MAIR-600)
npm run contracts:sync      # (= contracts:generate) rebuild contracts/openapi.json from the installed package
npm run contracts:check     # fail if the version isn't an accepted exact version, installed != package.json, a second business bff-*-openapi exists, or the snapshot is stale
```

These commands run offline. After a bump, also move the `bff-project` (and `bff-user`) image tags in the `docker-compose*.yml` files to the images built from the same commits (`package-contract.test.cjs` enforces it), then adapt the client. The stacks also pin dev images of Core API, Project API and the database: the dev Liquibase needs `-Dallow_template_admin=true`, the database enforces argon2id hashes in `init-test.sql`, the dev APIs need `JWT_ALLOW_WEAK_SECRET` for the shared test secret and `RATE_LIMIT_ENABLED=false`, BFF_Project needs `JWT_SECRET` at startup and BFF User `AUTH_RATE_LIMIT_ENABLED=false` for the ZAP scan. BFF errors use the shared `ErrorResponse` envelope (`{ error: { code, message, details } }`, `code` in a fixed enum).

## Figma mockup

Figma is the source of truth: design and agree any UI change on **Mairie360 – Projects_Web_Service** (https://www.figma.com/design/d34hTymLXPWK5JMbGWJ8bY) first, then code it. Shared components come from the lib mockup https://www.figma.com/design/T7vetUfuzPEXk5TxjHRiO2 and are instantiated, never redrawn.

## Component tree convention

Every component under `src/components/` is a **folder named after it**, and the folder tree
mirrors the composition tree:

```
Name/
  index.ts          # exports the component (and the helpers it owns)
  Name.tsx          # imports ONLY its direct sub-components, through their index.ts
  Name.test.jsx     # its tests, co-located (vitest + jsdom; `.jsx` in this repo, `.tsx` in the TypeScript-tested fronts)
  components/       # one such folder per direct sub-component, recursively
```

- A component needs nothing but the `index.ts` of its direct sub-components: `Name.tsx` imports
  `./components/Sub`, never `./components/Sub/Sub` nor a sub-sub-component. Leaves are folders
  too (without `components/`).
- Helpers a component owns (models, hooks, `*.ts`) sit beside it and are exported by its
  `index.ts`; a helper shared by two siblings sits in their closest common ancestor.
- A big component is acceptable only for a technical reason stated in a comment; otherwise
  split it so that each visible part is a component and what composes it a sub-component.
- Page and journey tests stay in `tests/`; per-component tests are the co-located
  `Name.test.jsx`. `tests/component-tree-convention.test.cjs` enforces the folder, the index,
  the co-located test and the index-only imports.

## Front tickets and the Figma mockup

A front ticket (Jira + GitHub issue + PR) **must link the Figma frame that serves as the
example** of what is being built or changed. Without that link the ticket cannot be worked
on, unless the change does not affect the display (tooling, tests, proxy, contracts…). Update
and agree the mockup first, then code it: the sync direction is Figma → code.

## Architecture

- **Shell from the lib (MAIR-578)** — `src/components/ProjectsWorkspace/ProjectsWorkspace.tsx` renders `AccessibleShell` from `@mairie360/lib-components/shell`; `src/lib/front-urls-provider.tsx` uses the lib `configureSidebarCookieDomain`. No local `accessible-shell.tsx`, `desktop-navigation.tsx` or `sidebar-preference.ts` (pinned by `tests/lib-shell-adoption.test.cjs`).

- **Shared shell and profile routing (MAIR-180)** — `ProjectsWorkspace` uses
  the published-library `AppShell` with BFF-derived role/permissions and runtime
  destinations for active modules. Authenticated legacy `/profile` URLs redirect
  to validated `SETTINGS_FRONT_URL` in frontend middleware; invalid or missing
  destinations return uncached 503. No local profile UI or demo identity is
  rendered. Deploy only after a published library version exports `AppShell`.

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` pins this behaviour.
- **BFF URL** — `BFF_PROJECT_BASE_URL` → `PROJECT_BFF_URL` → `NEXT_PUBLIC_BFF_PROJECT_BASE_URL`; resolved at request time on the server. Missing or invalid configuration returns an uncached 503 without contacting an upstream; configure an URL explicitly for local development too.
- **Session** — there is no session adapter. The shell's session comes from BFF_Project's `access` block (`role`, `scope`, `can*`) in `GET /projects-page`; `useProjectsController` derives it from the page response it already loads (`authSessionFromAccess`). Legacy profile routes are handled by frontend middleware without fetching business data.

  The published contract has no identity (name, e-mail), so the header shows the role label.
- **Logout** — `logoutAndReload()` (`src/lib/auth-token.ts`) posts to the local `src/app/api/auth/logout/route.ts`, which only clears the `accessToken` cookie on `COOKIE_DOMAIN` (`src/lib/access-token-cookie.ts`, shared with the middleware). It then clears `localStorage` and reloads, and the middleware redirects to Login. The session is not revoked server-side: BFF_Project's contract has no logout route. The client calls it on any 401.
- **Auth gate** — `src/middleware.ts` redirects every page request (matcher excludes `/api`, `/_next/static`, `/_next/image` and paths with a dot) to `LOGIN_FRONT_URL` when the `accessToken` cookie is missing or its JWT `exp` is past, clearing the cookie on `COOKIE_DOMAIN`. It only decodes the payload; signature validation is the BFF/Core's job. Note that the catch-all data routes (e.g. `/health`) also pass through it. For authenticated requests it also sets a per-request nonce `Content-Security-Policy` (built in `src/lib/content-security-policy.ts`, forwarded to Next.js via request headers), which is why `src/app/layout.tsx` forces dynamic rendering: a prerendered page would carry no nonce and its scripts would be blocked. Any new external origin (images, fonts, browser-side API calls) must be added to that policy.
- **Client calls** — pages call same-origin paths (e.g. `/projects-page`, `/projects/*`) through clients that parse `{ error: { message } }` / `{ message }` bodies into typed errors. Requests never read, migrate or send a Bearer token from localStorage; the unchanged proxy uses the HttpOnly cookie when no explicit Authorization header is provided. Legacy token helpers remain isolated from client request construction, and existing logout cleanup still clears legacy storage (MAIR-408). Browser requests use manual redirects: an opaque redirect reloads the current protected document once per Location, before inspecting status or body, then rejects with `BffProjectNavigationRequiredError`. Existing middleware owns Login and the document return URL. Aborted responses cannot navigate; no mutation is automatically replayed. Generic network failures and 403/503 are not treated as expired sessions.
- **Stable page boundaries (MAIR-408)** — `src/app/page.tsx` composes one
  `useProjectsController` and the top-level `ProjectsWorkspace`. The controller
  owns the existing state, effects, read revisions and mutation guards for the
  page's lifetime; the workspace renders its inferred props without extra reads
  or duplicated state. `CreateProjectModal` and `ProjectDetailModal` have direct
  module imports and stable component identities. Keep those boundaries during
  rerenders so nested task/comment drafts, pending state and focus are retained.
  `ProjectDetailModal` still contains the task/collaboration workflow; this split
  does not complete that further audit or change session/revocation policy.
- `src/lib/bffProjectClient.ts` adapts the OpenAPI contract to the presentation model (`src/types/project.tsx`) and `src/lib/projectPageState.ts` centralises page-state updates.
- **Component tree (MAIR-608)** — `src/components/ProjectsWorkspace/` is the single page root (`ProjectsWorkspace.tsx`, `use-projects-controller.ts`, helpers `project-card-meta.ts`, `field-style.ts`, `workflow-helpers.ts`) and follows the component tree convention above. Its `components/` holds the workspace parts (`WorkspaceHeader`, `ProjectFiltersBar` → filter/search/view controls, the notices, `ProjectPagination`), the views (`KanbanBoard`, `GridView`, `TableView`, `ProjectsEmptyState`), `ProjectCard` (→ `ProjectActionsMenu`, `TaskComposer` with its `use-task-composer.ts` hook, labels/avatars/recent tasks), the shared leaves (`StatusPill`, `PriorityPill`, `PriorityLabel`, `PersonAvatar`, `ProgressMeter`, `FieldLabel`, `FormField`, `TextAreaField`, `SelectField`, `MultiSelectField`, `TaskEditButton`, `TaskCreationNotice`, `StatusDefinitionEditor`), `ProjectTasksEditor` (`task-form-state.ts`, `use-task-drafts.ts` → `TaskDraftForm`, `DraftTaskRow`), `ProjectTemplateManager` (→ `TemplateManagerEditor`), `CreateProjectModal` (→ feedback, fields, footer, `ProjectTemplatePicker`) and `ProjectDetailModal`, whose state lives in hooks beside it (`use-project-edit`, `use-detail-task-form`, `use-task-collaboration`, `use-task-filters`, `use-linked-task-scroll`, `use-dialog-focus`) and whose parts are `DetailHeader`, `DetailRefreshAlert`, `TaskFormPanel`, `ProjectEditForm`, `ProjectSummary`, `ProjectLifecycle`, `ProjectWorkflow` (→ `TaskStatusKanban` → `TaskStatusSelect`) and `DetailTaskList` (→ `TaskFilters`, `TaskRow`, `TaskDeleteConfirm`, `TaskFollowUp`). `tests/project-component-tree.test.cjs` pins that composition; `tests/component-tree-convention.test.cjs` the convention. Component tests are the co-located `Name.test.jsx` (vitest + jsdom); journeys stay in `tests/component/`. `src/lib/navigation.ts` supplies validated runtime destinations to the shared shell.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile), `poweredByHeader: false` and static security headers on every route (`tests/security-headers.test.cjs` pins them, and the ZAP baseline fails without them). `*_FRONT_URL` destinations are read at runtime, not baked into the image.
- **Text constraints of the contract (MAIR-514)** — `src/lib/text-constraints.ts` mirrors the published rules: every free text refuses `<` and `>` (`NO_MARKUP_PATTERN`, the HTML form of `^[^<>]*$`, with `NO_MARKUP_HINT` as `title`) and a task comment is at most `COMMENT_MAX_LENGTH` (2 000). `FormField` always carries them, `TextAreaField` reports them through `reportMarkupValidity` (`setCustomValidity`, textareas have no `pattern`), the task title inputs (`ProjectDetailModal`, `TaskComposer`, `ProjectTasksEditor`) and the comment input carry them too. `getBffProjectErrorMessage` goes through `describeBffProjectError`: a BFF 400 whose `error.details[]` add information lists the refused fields in French (`Titre : ne doit pas contenir les caractères < ou >`); details that only repeat the BFF message keep that message. `tests/projects-text-constraints.test.cjs` pins the pattern to `contracts/openapi.json`.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@<sha>` pinned to a CICD commit (`package_name: projects-front`, `node_version: "24.21.0"`, `cicd_version` = the same sha, each followed by a `# vX.Y.Z` comment so Renovate bumps them together with `dev-dependency-exception.yml`; `tests/cicd-pin.test.cjs` checks they agree) and passes only the `CODECOV_TOKEN` and `N8N_WEBHOOK_SECRET` secrets plus the release-journal ones (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`, org secrets used by CICD to commit `RELEASE_JOURNAL.md` on `main` after each release). It runs on `pull_request`, `workflow_dispatch` and on `push` to `main` only, so a PR branch no longer runs the pipeline twice (MAIR-436). The workflow token is read-only by default (`permissions: contents: read`); only the `CICD` job gets `contents`/`packages`/`id-token: write`, the cap the reusable workflow needs for its release jobs (dev image push + cosign signature, prod tag). `tests/workflow-permissions.test.cjs` (identical in the eight fronts) pins both rules. A separate read-only `required_security_scan` job runs Semgrep and Gitleaks under the legacy required check name. The reusable pipeline runs `npm ci` → `npm run lint` + `npm audit --omit=dev --audit-level=high` (blocking; the full audit is report-only) + Semgrep/Gitleaks → `npm run build` + `npm test` (Codecov) → on `main`, builds `Dockerfile` with the token as the BuildKit secret `node_auth_token` (never a build arg), scans it with Trivy, signs it with cosign and pushes `ghcr.io/mairie360/projects-front:dev-<sha>`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (exact Node 24.21.0) runs `contracts:check` and `test:contracts` on every PR and on pushes to `main`.
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5001`, `CMD node server.js`.

## Local Docker dev stack

`docker-compose.yml` (with `development.Dockerfile`, which runs `npm run dev` as a non-root user and reads `NODE_AUTH_TOKEN` as a build secret) starts Postgres + Liquibase + Redis (`dev-latest` GHCR images), `project-api` (3001), `bff-project` (4001, `ghcr.io/mairie360/bff-project:<contract package version>`, overridable with `BFF_PROJECT_IMAGE`) and this front on host port **5001 → container 3000**, with `docker compose watch` syncing `src/`. Core API and BFF User are not in this stack (Core is commented out), so BFF_Project cannot resolve sessions there without extra services. `nginx.conf` is a leftover and nothing references it.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Core API, BFF User (a dependency of BFF_Project only; the front service is only wired to `bff-project`), BFF_Project and its dependencies; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (classic spider + AJAX spider `-j`, which renders the page in a headless browser so the BFF contract routes fetched by the bundle are scanned too, + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run; since MAIR-516 the server-error rule (100000) is no longer ignored, so a 5xx relayed by the proxy fails the scan. Rule 10031 (user-controllable attribute) is out of scope only for the root `/?view=kanban|grid|table` URL: those fixed values match Tailwind classes such as `grid`, so it flagged a false positive whenever the spider reached `?view=grid`; any other URL or parameter is still scanned (`tests/zap-rules.test.cjs`).
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js`: a `reads` scenario (pages, `/health`, `/projects-page` through the proxy, the path the page uses) and a `writes` scenario (MAIR-516, `POST` then `DELETE /projects`), both with a JWT minted from `JWT_SECRET`; strict status checks and per-endpoint thresholds fail the run.
- Test user is id 2 (seeded in `init-test.sql` with the `User` and `Admin` roles, so project creation answers instead of 403); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.

## End-to-end journeys (MAIR-603)

`e2e/` holds the Playwright user journeys the prod promotion runs (`e2e_tests` job of `promote-prod.yml`, action `e2e/fronts` of mairie360/CICD, MAIR-602) on the verified `staging-<sha>` image: a front without `e2e/*.spec.ts` or `e2e_test.sh` fails that job. Not part of `npm test`.

- `./e2e_test.sh` → `docker-compose-e2e.yml`: the performance stack with a `playwright` service (`mcr.microsoft.com/playwright`, same version as the `@playwright/test` pinned in `e2e/package.json`, `tests/e2e-policy.test.cjs` checks it) in place of k6. It copies `e2e/`, runs `npm ci` there (public registry, no `NODE_AUTH_TOKEN`) and `npx playwright test`, then tears the stack down. The report lands in `e2e-report/` (HTML, `results.json`, traces and videos of the failed journeys; gitignored, written as root by the container). `TARGET_IMAGE` tests a published front image.
- Local iterations: `npm run e2e:install` once (Chromium), then `E2E_FRONT_URL=http://localhost:5001/ docker compose -f docker-compose-e2e.yml up -d projects-front` and `E2E_BASE_URL=http://localhost:5001 npm run e2e` (or `npx --prefix e2e playwright test --config e2e/playwright.config.ts --ui`). `E2E_FRONT_URL` matters: the same-origin proxy refuses browser writes whose `Origin` is not `PROJECT_FRONT_URL`.
- Sessions: `e2e/support/session.ts` signs an `accessToken` cookie with the stack's `JWT_SECRET` for the seeded users of `init-test.sql` (user 2 as `Admin`, user 3 as `User`): the BFF reads the role from the token's `role` claim, as Login issues it, not from `user_roles`. Journeys (`e2e/projects.spec.ts`): create a project (title, description, due date, main assignee), add a task (title + assignee), rename and delete it as the manager; the member sees no "Nouveau projet" and gets 403 on `POST /projects`; without a cookie `/` answers 307 to `/api/auth/resume`. One worker, serial: the journeys share the seeded database. The texts asserted are the French UI ones (`Titre*`, `Créer le projet`, `Actions pour <titre>`, …): keep them in sync when a label changes.

## Pull request reviewers

Every PR requests a review from the whole team, minus its author: `CarolinHugo`, `LAURETbenjamin`, `MathTek` and `Quentintnrl` (`gh pr create … --reviewer CarolinHugo,LAURETbenjamin,MathTek`). `.github/CODEOWNERS` makes GitHub request them automatically as well.

## Promotion to staging and prod (MAIR-494)

A push to `main` only releases dev (`cicd.yml` stops at `release-dev`). Staging and prod are manual:
`gh workflow run promote-staging.yml -R mairie360/Projects_Web_Service` (main's newest commit) or `gh workflow run promote-staging.yml -R mairie360/Projects_Web_Service -f sha=SHA` (a given commit), then the same with `promote-prod.yml`
(environments `Staging` / `Prod`). Staging refuses a commit without `dev-<sha>` and a green main run, and runs
the ZAP and k6 stacks on that image; prod refuses one without `staging-<sha>` and tags the version semantic-release computes
for that commit. `cicd.yml`, `promote-staging.yml` and `promote-prod.yml` pin the same mairie360/CICD release.
