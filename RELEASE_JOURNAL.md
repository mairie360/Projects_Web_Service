# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "5866294d54cf71ddede146283f210df8baa31790", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "86e8d0547d293d9afaac92723f94eeeec2e06c58", "updated": {"dev": "2026-11-14 09:35 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-11-12 20:50 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `86e8d05` | 2026-11-12 20:50 UTC |
| dev | — | `5866294` | 2026-11-14 09:35 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

- chore(deps): update mairie360 database schema to v3.4.0 (#342) ([#342](https://github.com/mairie360/Projects_Web_Service/pull/342))
- chore(deps): update ghcr.io/mairie360/project-api docker tag to v1.3.0 (#341) ([#341](https://github.com/mairie360/Projects_Web_Service/pull/341))
- chore(deps): update ghcr.io/mairie360/core-api docker tag to v2.3.0 (#340) ([#340](https://github.com/mairie360/Projects_Web_Service/pull/340))
- chore(deps): update dependency mairie360/cicd to v5.6.0 (#334) ([#334](https://github.com/mairie360/Projects_Web_Service/pull/334))
- fix: MAIR-816 Release dev: align internal versions and deploy ([#337](https://github.com/mairie360/Projects_Web_Service/pull/337))
- feat: MAIR-603 E2E - Parcours utilisateurs Playwright des fronts (#311) ([#311](https://github.com/mairie360/Projects_Web_Service/pull/311))
- fix: MAIR-743 [Audit 30/10] Login, Calendars, Elearning, Projects: branch Gitleaks fingerprints invalid after squash, main likely red (N1) (#332) ([#332](https://github.com/mairie360/Projects_Web_Service/pull/332))
- fix: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#330](https://github.com/mairie360/Projects_Web_Service/pull/330))
- feat: MAIR-497 RGPD - Simulation d'usage et revue IA des logs et de la base avant la prod ([#329](https://github.com/mairie360/Projects_Web_Service/pull/329))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#327) ([#327](https://github.com/mairie360/Projects_Web_Service/pull/327))
- fix: MAIR-744 [Audit 30/10] Login, Calendars, Elearning, Projects : le postinstall interroge le service d'avis npm, npm ci dépend du réseau (N2) (#326) ([#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- fix(deps): bump follow-redirects to 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- fix: MAIR-769 Projects - Corriger AUTH_RATE_LIMIT_ENABLED mal échappé dans les stacks docker ([#321](https://github.com/mairie360/Projects_Web_Service/pull/321))
- feat: MAIR-316 RGAA - Périmètre et états des pages par front (#225) ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#235) ([#235](https://github.com/mairie360/Projects_Web_Service/pull/235))
- chore(deps): update dependency mairie360/cicd to v4.12.0 (#317) ([#317](https://github.com/mairie360/Projects_Web_Service/pull/317))
- fix(security): repair dependency locks and bound Zod validation (#315) ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- chore(deps): update dependency mairie360/cicd to v4.5.0 (#312) ([#312](https://github.com/mairie360/Projects_Web_Service/pull/312))
- chore(deps): update typescript dependencies (#313) ([#313](https://github.com/mairie360/Projects_Web_Service/pull/313))
- fix(security): patch Node.js runtime and toolchain (#314) ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- feat: MAIR-608 Lib UI - Normaliser la charte, les tailles et les composants partagés des fronts ([#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence dev → staging (en dev, pas encore en staging)

- chore(deps): update mairie360 database schema to v3.4.0 (#342) ([#342](https://github.com/mairie360/Projects_Web_Service/pull/342))
- chore(deps): update ghcr.io/mairie360/project-api docker tag to v1.3.0 (#341) ([#341](https://github.com/mairie360/Projects_Web_Service/pull/341))
- chore(deps): update ghcr.io/mairie360/core-api docker tag to v2.3.0 (#340) ([#340](https://github.com/mairie360/Projects_Web_Service/pull/340))
- chore(deps): update dependency mairie360/cicd to v5.6.0 (#334) ([#334](https://github.com/mairie360/Projects_Web_Service/pull/334))

## Différence staging → prod (en staging, pas encore en prod)

- fix: MAIR-816 Release dev: align internal versions and deploy ([#337](https://github.com/mairie360/Projects_Web_Service/pull/337))
- feat: MAIR-603 E2E - Parcours utilisateurs Playwright des fronts (#311) ([#311](https://github.com/mairie360/Projects_Web_Service/pull/311))
- fix: MAIR-743 [Audit 30/10] Login, Calendars, Elearning, Projects: branch Gitleaks fingerprints invalid after squash, main likely red (N1) (#332) ([#332](https://github.com/mairie360/Projects_Web_Service/pull/332))
- fix: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#330](https://github.com/mairie360/Projects_Web_Service/pull/330))
- feat: MAIR-497 RGPD - Simulation d'usage et revue IA des logs et de la base avant la prod ([#329](https://github.com/mairie360/Projects_Web_Service/pull/329))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#327) ([#327](https://github.com/mairie360/Projects_Web_Service/pull/327))
- fix: MAIR-744 [Audit 30/10] Login, Calendars, Elearning, Projects : le postinstall interroge le service d'avis npm, npm ci dépend du réseau (N2) (#326) ([#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- fix(deps): bump follow-redirects to 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- fix: MAIR-769 Projects - Corriger AUTH_RATE_LIMIT_ENABLED mal échappé dans les stacks docker ([#321](https://github.com/mairie360/Projects_Web_Service/pull/321))
- feat: MAIR-316 RGAA - Périmètre et états des pages par front (#225) ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#235) ([#235](https://github.com/mairie360/Projects_Web_Service/pull/235))
- chore(deps): update dependency mairie360/cicd to v4.12.0 (#317) ([#317](https://github.com/mairie360/Projects_Web_Service/pull/317))
- fix(security): repair dependency locks and bound Zod validation (#315) ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- chore(deps): update dependency mairie360/cicd to v4.5.0 (#312) ([#312](https://github.com/mairie360/Projects_Web_Service/pull/312))
- chore(deps): update typescript dependencies (#313) ([#313](https://github.com/mairie360/Projects_Web_Service/pull/313))
- fix(security): patch Node.js runtime and toolchain (#314) ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- feat: MAIR-608 Lib UI - Normaliser la charte, les tailles et les composants partagés des fronts ([#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-14 09:35 UTC | dev | — | `5866294` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/43580477504) |
| 2026-11-14 02:01 UTC | dev | — | `10e7cbe` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/43542695785) |
| 2026-11-13 14:27 UTC | dev | — | `3424335` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/43440998271) |
| 2026-11-13 05:28 UTC | dev | — | `38f9cc8` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/43369964369) |
| 2026-11-12 20:50 UTC | staging | — | `86e8d05` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/43285891074) |
| 2026-11-12 17:17 UTC | dev | — | `86e8d05` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/43264697058) |
| 2026-11-04 21:16 UTC | dev | — | `ed50141` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41912316730) |
| 2026-11-04 18:30 UTC | dev | — | `bd3b4e1` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41884220039) |
| 2026-11-04 18:27 UTC | dev | — | `05d1ba4` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41883519094) |
| 2026-11-03 15:01 UTC | dev | — | `be8d1b1` | [run](https://github.com/mairie360/Projects_Web_Service/actions/runs/41656815345) |
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
