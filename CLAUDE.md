# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 15 (App Router, React 19, TypeScript, Tailwind 4) web service for Mairie360 hosting the project & task management module (list/kanban views, tasks, comments, collaboration). The browser only talks to this app's own origin, and the Next.js server talks to **one service only: BFF_Project**. It goes through BFF_Project's published contract, and BFF_Project calls BFF User itself. This front must never call BFF User or any other BFF directly. UI building blocks come from the private package `@mairie360/lib-components`. Docs are bilingual: `docs/en|fr/module.md` (functional) and `docs/en|fr/technical.md` (routes, config, troubleshooting) — update both languages together. `BFF.md` / `BACKEND.md` contain *proposed* backend needs; the published contract package is the source of truth for implemented behaviour.

## Commands

Private `@mairie360/*` packages come from GitHub Packages: `.npmrc` reads `NODE_AUTH_TOKEN`, so export a token with `read:packages` before installing or building images.

```bash
npm ci
npm run dev -- --port 5001         # needs BFF_Project reachable, see "BFF URL" below
npm run build && npm run start -- --port 5001
npm run lint                             # next lint (next/core-web-vitals + next/typescript)
npm test                                 # node:test on tests/*.test.cjs + lcov in coverage/lcov.info (what CI runs)
npm run test:contracts                   # same tests, no coverage
node --test --enable-source-maps --test-name-pattern="<name>" tests/bff-project-client.test.cjs   # single test
```

Tests are plain CommonJS `node:test` files (no Jest/Vitest, no DOM) matching `tests/*.test.cjs`. The 60% coverage threshold (lines/branches/functions) only counts modules a test loads; `network-contract.test.cjs` loads every `src/**/*.ts`, and `projects-page-html.test.cjs` loads the `.tsx` UI, which therefore counts too (its many handlers are what keeps the function ratio near the threshold: cover new interactions there). `--enable-source-maps` makes coverage report TypeScript lines, which also counts type-only lines as uncovered, so the percentages are lower than without it.

- `tests/support/typescript.cjs` (`requireTs`) is the shared loader: a `.ts` hook with inline source maps that resolves the `@/*` alias. `proxy.test.cjs` and `security-headers.test.cjs` still use their own inline hook and stub `global.fetch`.
- `tests/support/{openapi-contract,contract-mock-server}.ts` are **verbatim copies** of the BFF helpers (`../../BFFs/BFF_*/tests/support/`); keep them identical. They are type-checked by `next build` because the tsconfig includes `**/*.ts`.
- `front-harness.cjs` starts one real HTTP mock, for BFF_Project, driven by `contracts/openapi.json`. It also replaces `global.fetch` and `global.window`:
  - same-origin paths go to the real `src/app/**/route.ts` handlers, which it discovers the way the App Router does;
  - absolute URLs may only target the mock (`allowUpstream` adds an extra one, e.g. a closed port).

  `violations()` (checked in `afterEach`) collects contract mismatches, undeclared query params, cookies forwarded to the BFF and blocked calls. Orval only types successes (`2XX`), so error replies must go through `harness.errorReply(status, body)`. It marks them `outOfContract` but still validates the body against the published `ApiError` model.
- `network-contract.test.cjs` walks the TypeScript AST of `src/` and forbids network primitives other than `fetch`. It allows `fetch` only in three places:
  - `forwardToBff`, which may only be called by the catch-all route's `proxyBffRequest`;
  - `requestBff`;
  - `logoutAndReload`, which posts to the local `/api/auth/logout`.

  The only route files allowed are the catch-all and that local logout route, which must not import the proxy. Every `requestBff` path+method (templates built from `${encodeURIComponent(x)}`) must match the contract, and `ProjectsPageQuery` keys must equal the declared query params. `bff-project-client.test.cjs` then checks that every consumed operation was exercised against the mock. A new client call must be written as `requestBff(literal or template, { method: 'LITERAL' })` or it fails the static analysis.
- `package-contract.test.cjs` checks that:
  - the package is pinned to an exact `X.Y.Z`, installed and locked at that version;
  - it is the only `@mairie360/bff-*-openapi` dependency;
  - `contracts/openapi.json` equals the rebuild from the package;
  - every `docker-compose*.yml` uses `bff-project:<that version>` (never a `../BFF_Project` build);
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
npm install --save-exact @mairie360/bff-project-openapi@X.Y.Z   # bump: published releases only, never 0.0.0-dev/staging
npm run contracts:sync      # (= contracts:generate) rebuild contracts/openapi.json from the installed package
npm run contracts:check     # fail if the version isn't exact X.Y.Z, installed != package.json, a second bff-*-openapi exists, or the snapshot is stale
```

These commands run offline. After a bump, also move the `bff-project` image tags in the `docker-compose*.yml` files to the same version (`package-contract.test.cjs` enforces it), then adapt the client.

## Architecture

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` pins this behaviour.
- **BFF URL** — `BFF_PROJECT_BASE_URL` → `PROJECT_BFF_URL` → `NEXT_PUBLIC_BFF_PROJECT_BASE_URL` (fallback `http://localhost:4001`); resolved at request time on the server.
- **Session** — there is no session adapter. The shell's session comes from BFF_Project's `access` block (`role`, `scope`, `can*`) in `GET /projects-page`:
  - `src/app/page.tsx` derives it from the page response it already loads (`authSessionFromAccess`);
  - `src/app/profile/page.tsx` uses `useAuthSession()`, which calls `GET /projects-page?limit=1`.

  The published contract has no identity (name, e-mail), so the header shows the role label.
- **Logout** — `logoutAndReload()` (`src/lib/auth-token.ts`) posts to the local `src/app/api/auth/logout/route.ts`, which only clears the `accessToken` cookie on `COOKIE_DOMAIN` (`src/lib/access-token-cookie.ts`, shared with the middleware). It then clears `localStorage` and reloads, and the middleware redirects to Login. The session is not revoked server-side: BFF_Project's contract has no logout route. The client calls it on any 401.
- **Auth gate** — `src/middleware.ts` redirects every page request (matcher excludes `/api`, `/_next/static`, `/_next/image` and paths with a dot) to `LOGIN_FRONT_URL` when the `accessToken` cookie is missing or its JWT `exp` is past, clearing the cookie on `COOKIE_DOMAIN`. It only decodes the payload; signature validation is the BFF/Core's job. Note that the catch-all data routes (e.g. `/health`) also pass through it. For authenticated requests it also sets a per-request nonce `Content-Security-Policy` (built in `src/lib/content-security-policy.ts`, forwarded to Next.js via request headers), which is why `src/app/layout.tsx` forces dynamic rendering: a prerendered page would carry no nonce and its scripts would be blocked. Any new external origin (images, fonts, browser-side API calls) must be added to that policy.
- **Client calls** — pages call same-origin paths (e.g. `/projects-page`, `/projects/*`) through clients that parse `{ error: { message } }` / `{ message }` bodies into typed errors and, when no Authorization header is set, add a Bearer token stored in `localStorage` (`mairie360.auth.jwt`, see `src/lib/auth-token.ts`); in normal use the proxy relies on the cookie.
- `src/app/page.tsx` orchestrates views and forms; `src/lib/bffProjectClient.ts` adapts the OpenAPI contract to the presentation model (`src/types/project.tsx`) and `src/lib/projectPageState.ts` centralises page-state updates.
- `src/components/project/` implements forms, modals, task editor and views; `src/components/project-card/` + `Kanban.tsx` / `ProjectCard.tsx` render cards. `src/lib/appShell.ts` / `navigation.ts` build the shell.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile), `poweredByHeader: false` and static security headers on every route (`tests/security-headers.test.cjs` pins them, and the ZAP baseline fails without them), and inlines the `*_FRONT_URL` values at **build time** (defaults `https://<module>.dev.mairie360-eip.fr/`), so changing them requires a rebuild.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@v2.3.1` (`package_name: projects-front`, `node_version: "23"`, `cicd_version: v2.3.1`, `secrets: inherit`); keep the `@ref` and `cicd_version` identical when bumping. Up to the dev release it runs: `npm ci` → `npm run lint` + `npm audit --audit-level=high` (high/critical advisories block) → `npm run build` → `npm test --if-present` (uploads `coverage/lcov.info` to Codecov) → on `main`, builds `Dockerfile` with `NODE_AUTH_TOKEN` as build-arg and pushes `ghcr.io/mairie360/projects-front:dev-<sha>` / `dev-latest`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (Node 22) runs `contracts:check` and `test:contracts` on every push/PR.
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5001`, `CMD node server.js`.

## Local Docker dev stack

`docker-compose.yml` (with `development.Dockerfile`, which runs `npm run dev` as a non-root user and reads `NODE_AUTH_TOKEN` as a build secret) starts Postgres + Liquibase + Redis (`dev-latest` GHCR images), `project-api` (3001), `bff-project` (4001, `ghcr.io/mairie360/bff-project:<contract package version>`, overridable with `BFF_PROJECT_IMAGE`) and this front on host port **5001 → container 3000**, with `docker compose watch` syncing `src/`. Core API and BFF User are not in this stack (Core is commented out), so BFF_Project cannot resolve sessions there without extra services. `nginx.conf` is a leftover and nothing references it.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Core API, BFF User (a dependency of BFF_Project only; the front service is only wired to `bff-project`), BFF_Project and its dependencies; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (spider + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run.
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js` (pages, `/health`, `/projects-page` through the proxy) with a JWT minted from `JWT_SECRET`; thresholds fail the run.
- Test user is id 2 (seeded in `init-test.sql`); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.

## Pull request reviewers

Every PR requests a review from the whole team, minus its author: `CarolinHugo`, `LAURETbenjamin`, `MathTek` and `Quentintnrl` (`gh pr create … --reviewer CarolinHugo,LAURETbenjamin,MathTek`). `.github/CODEOWNERS` makes GitHub request them automatically as well.
