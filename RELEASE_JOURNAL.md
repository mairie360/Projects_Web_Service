# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "3329c04488ec643aba217b76a96fc4febc7ada41", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-02 23:03 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `3329c04` | 2026-11-02 23:03 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Changements de comportement
- La coque de l'application (barre latérale, barre supérieure, pied de page) vient désormais de `@mairie360/lib-components/shell`. Les fichiers locaux `desktop-navigation.tsx`, `accessible-shell.tsx` et `sidebar-preference.ts` sont supprimés. (MAIR-578, MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Les messages de retour de page utilisent désormais le `Alert` de la lib (rôle status/alert, fermable). Un `Toast` autonome placé hors d'un `ToastProvider` n'est plus annoncé. Le bouton `primary` retiré devient le `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. Le tableau de bord vide utilise `DataState`. La confirmation de création de projet passe par le composant `CreateProjectFeedback`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Dans les stacks docker de dev, ZAP et k6 (`docker-compose.yml`, `docker-compose-security.yml`, `docker-compose-performance.yml`), `AUTH_RATE_LIMIT_ENABLED` était transmis avec des antislashs. BFF User lisait le texte `\"false\"`, sa limite de tentatives de connexion restait active et les connexions répétées pouvaient répondre 429. Maintenant la valeur est `false` et la limite est bien désactivée. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- CI : `cicd.yml`, `gdpr-pr.yml`, `promote-staging.yml`, `promote-prod.yml` et `dev-dependency-exception.yml` passent sur mairie360/CICD v5.2.2 (contrôles RGPD), avec des tests qui verrouillent ce pin. (MAIR-771, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327))
- `npm ci` n'interroge plus le service d'avis npm : `postinstall`, `prebuild` et `pretest` ne lancent que le contrôle local, et `npm run audit:upstream` tourne chaque jour dans `upstream-advisories.yml`. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Mise à jour de `follow-redirects` en 1.16.2 (GHSA-mrwp-f3q8-3g9p) dans le lock, avec un test qui le vérifie. ([#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- Ajout de la checklist RGPD sur les PR (`gdpr-pr.yml`, appel de `gdpr-pr-cicd.yml` en v4.12.2) et de sa règle Renovate. (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235))
- Mises à jour Renovate : mairie360/CICD v4.5.0 puis v4.12.0, dépendances TypeScript (`@testing-library/user-event`, `@types/node`, `@vitest/coverage-v8`, `jsdom`, `playwright-core`, `vitest`). ([#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313))
- Runtime Node.js 24.22.1 (Dockerfiles, CI, `contracts.yml`) et Next.js / eslint-config-next en 16.4.2. ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- Verrouillages de dépendances réparés, copie vendored de Zod 3 avec validation bornée des collections, provenance des bundles et de la baseline de performance. ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- Passage au moteur RGAA (`accessibility_test.sh`, `docker-compose-accessibility.yml`, `init-accessibility.sql`, `rgaa.yaml`) et au pin mairie360/CICD v5.1.1. (MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Découpage de `ProjectsWorkspace` en dossiers par composant, avec une convention et des tests qui la vérifient. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- La coque de l'application (barre latérale, barre supérieure, pied de page) vient désormais de `@mairie360/lib-components/shell`. Les fichiers locaux `desktop-navigation.tsx`, `accessible-shell.tsx` et `sidebar-preference.ts` sont supprimés. (MAIR-578, MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Les messages de retour de page utilisent désormais le `Alert` de la lib (rôle status/alert, fermable). Un `Toast` autonome placé hors d'un `ToastProvider` n'est plus annoncé. Le bouton `primary` retiré devient le `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. Le tableau de bord vide utilise `DataState`. La confirmation de création de projet passe par le composant `CreateProjectFeedback`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Dans les stacks docker de dev, ZAP et k6 (`docker-compose.yml`, `docker-compose-security.yml`, `docker-compose-performance.yml`), `AUTH_RATE_LIMIT_ENABLED` était transmis avec des antislashs. BFF User lisait le texte `\"false\"`, sa limite de tentatives de connexion restait active et les connexions répétées pouvaient répondre 429. Maintenant la valeur est `false` et la limite est bien désactivée. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- CI : `cicd.yml`, `gdpr-pr.yml`, `promote-staging.yml`, `promote-prod.yml` et `dev-dependency-exception.yml` passent sur mairie360/CICD v5.2.2 (contrôles RGPD), avec des tests qui verrouillent ce pin. (MAIR-771, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327))
- `npm ci` n'interroge plus le service d'avis npm : `postinstall`, `prebuild` et `pretest` ne lancent que le contrôle local, et `npm run audit:upstream` tourne chaque jour dans `upstream-advisories.yml`. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Mise à jour de `follow-redirects` en 1.16.2 (GHSA-mrwp-f3q8-3g9p) dans le lock, avec un test qui le vérifie. ([#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- Ajout de la checklist RGPD sur les PR (`gdpr-pr.yml`, appel de `gdpr-pr-cicd.yml` en v4.12.2) et de sa règle Renovate. (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235))
- Mises à jour Renovate : mairie360/CICD v4.5.0 puis v4.12.0, dépendances TypeScript (`@testing-library/user-event`, `@types/node`, `@vitest/coverage-v8`, `jsdom`, `playwright-core`, `vitest`). ([#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313))
- Runtime Node.js 24.22.1 (Dockerfiles, CI, `contracts.yml`) et Next.js / eslint-config-next en 16.4.2. ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- Verrouillages de dépendances réparés, copie vendored de Zod 3 avec validation bornée des collections, provenance des bundles et de la baseline de performance. ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- Passage au moteur RGAA (`accessibility_test.sh`, `docker-compose-accessibility.yml`, `init-accessibility.sql`, `rgaa.yaml`) et au pin mairie360/CICD v5.1.1. (MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Découpage de `ProjectsWorkspace` en dossiers par composant, avec une convention et des tests qui la vérifient. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-02 23:03 UTC | dev | — | `3329c04` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41540174278) |
| 2026-11-02 20:01 UTC | dev | — | `a0f7eec` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41513031355) |
| 2026-11-02 18:21 UTC | dev | — | `ecb0212` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41470585937) |
| 2026-10-23 13:12 UTC | dev | — | `ff7d225` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39957552979) |
| 2026-10-21 18:07 UTC | dev | — | `b462ef0` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39647876873) |
| 2026-10-21 11:15 UTC | prod | v1.2.0 | `214ddfa` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39590396889) |
| 2026-10-21 11:12 UTC | staging | — | `214ddfa` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39589804908) |
| 2026-10-21 11:07 UTC | dev | — | `214ddfa` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39587884074) |
| 2026-10-21 10:57 UTC | dev | — | `6e41d95` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39585067611) |
| 2026-10-21 10:55 UTC | dev | — | `a944d2b` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39584933340) |
| 2026-10-21 10:19 UTC | dev | — | `9140af0` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39582544762) |
| 2026-10-21 10:18 UTC | dev | — | `763a15b` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39582583438) |
| 2026-10-21 01:46 UTC | dev | — | `6bb9873` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39528247539) |
| 2026-10-20 19:11 UTC | staging | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 19:05 UTC | dev | — | `8bfd374` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39479143216) |
| 2026-10-20 13:50 UTC | dev | — | `ad806b5` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39432343564) |
| 2026-10-20 12:27 UTC | dev | — | `f10d3cf` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39421336820) |
| 2026-10-19 22:51 UTC | dev | — | `955a3f3` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39336712798) |
| 2026-10-19 22:16 UTC | dev | — | `8653776` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39332768131) |
| 2026-10-19 20:15 UTC | dev | — | `5f16d85` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/39316013718) |
<!-- release-journal-history:end -->
