# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "ed50141f079b93b886f85a0f9878c4ba5a48bec2", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-04 21:16 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `ed50141` | 2026-11-04 21:16 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Changements de comportement

- Feedback après création d'un projet : il s'affiche désormais avec le composant `Alert` de la lib (fermable, rôle `alert`). Avant, un `Toast` autonome hors `ToastProvider` n'était plus annoncé. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Boutons : le flag `primary`, retiré de `Button`, devient le variant `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Tableau de projets vide : affichage via `DataState` de la lib. La barre latérale et la barre supérieure viennent de `AccessibleShell` de la lib ; les composants locaux `desktop-navigation`, `accessible-shell` et `sidebar-preference` sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections

- Installation `npm ci` hors ligne : avant, `postinstall` interrogeait le service d'avis npm, donc l'installation échouait pendant une panne ou hors réseau. Maintenant, seul le contrôle local tourne ; la vérification upstream est lancée par `npm run audit:upstream` et par un workflow quotidien. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Stacks docker de test (dev, ZAP, k6) : `AUTH_RATE_LIMIT_ENABLED` était transmis avec des guillemets échappés (`\"false\"`), donc le rate limit de connexion de BFF User restait actif et des connexions répétées pouvaient répondre 429. Maintenant la valeur est `false`. Concerne les stacks de test, pas la production. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique

- Tests E2E Playwright des parcours (création, tâches, suppression, droits membre) et stack `docker-compose-e2e.yml` ajoutés, exécutés au moment de la promotion prod ; hors `npm test`. (MAIR-603, [#311](https://github.com/mairie360/Projects_Web_Service/pull/311))
- Gitleaks : `.gitleaks.toml` remplace `.gitleaksignore` et n'ignore que les empreintes SHA-256 du manifeste Zod. (MAIR-743, [#332](https://github.com/mairie360/Projects_Web_Service/pull/332))
- Simulation RGPD d'usage avant prod (stack, script, personas) et corrections du script, avec checklist RGPD sur les PR. (MAIR-497, [#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330) ; MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235))
- Audit d'accessibilité RGAA : `rgaa.yaml`, `accessibility_test.sh` et `docker-compose-accessibility.yml` ajoutés. (MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Découpage de `ProjectsWorkspace` en dossiers de composants et convention d'arborescence, sans changement de rendu prévu dans le diff. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Verrous de dépendances corrigés, backport Zod 3 (`vendor/zod`) avec validation bornée des collections, et mise à jour de `follow-redirects` vers 1.16.2. (#315, [#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- Node.js passé en 24.22.1 et Next.js en 16.4.2 (images de base et lockfiles). (#314)
- Mises à jour de dépendances et de CI : CICD v4.5.0 à v5.3.1 (Renovate et pins), dépendances TypeScript et tests. (#312, #313, #317, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement

- Feedback après création d'un projet : il s'affiche désormais avec le composant `Alert` de la lib (fermable, rôle `alert`). Avant, un `Toast` autonome hors `ToastProvider` n'était plus annoncé. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Boutons : le flag `primary`, retiré de `Button`, devient le variant `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Tableau de projets vide : affichage via `DataState` de la lib. La barre latérale et la barre supérieure viennent de `AccessibleShell` de la lib ; les composants locaux `desktop-navigation`, `accessible-shell` et `sidebar-preference` sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections

- Installation `npm ci` hors ligne : avant, `postinstall` interrogeait le service d'avis npm, donc l'installation échouait pendant une panne ou hors réseau. Maintenant, seul le contrôle local tourne ; la vérification upstream est lancée par `npm run audit:upstream` et par un workflow quotidien. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Stacks docker de test (dev, ZAP, k6) : `AUTH_RATE_LIMIT_ENABLED` était transmis avec des guillemets échappés (`\"false\"`), donc le rate limit de connexion de BFF User restait actif et des connexions répétées pouvaient répondre 429. Maintenant la valeur est `false`. Concerne les stacks de test, pas la production. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique

- Tests E2E Playwright des parcours (création, tâches, suppression, droits membre) et stack `docker-compose-e2e.yml` ajoutés, exécutés au moment de la promotion prod ; hors `npm test`. (MAIR-603, [#311](https://github.com/mairie360/Projects_Web_Service/pull/311))
- Gitleaks : `.gitleaks.toml` remplace `.gitleaksignore` et n'ignore que les empreintes SHA-256 du manifeste Zod. (MAIR-743, [#332](https://github.com/mairie360/Projects_Web_Service/pull/332))
- Simulation RGPD d'usage avant prod (stack, script, personas) et corrections du script, avec checklist RGPD sur les PR. (MAIR-497, [#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330) ; MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235))
- Audit d'accessibilité RGAA : `rgaa.yaml`, `accessibility_test.sh` et `docker-compose-accessibility.yml` ajoutés. (MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Découpage de `ProjectsWorkspace` en dossiers de composants et convention d'arborescence, sans changement de rendu prévu dans le diff. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Verrous de dépendances corrigés, backport Zod 3 (`vendor/zod`) avec validation bornée des collections, et mise à jour de `follow-redirects` vers 1.16.2. (#315, [#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- Node.js passé en 24.22.1 et Next.js en 16.4.2 (images de base et lockfiles). (#314)
- Mises à jour de dépendances et de CI : CICD v4.5.0 à v5.3.1 (Renovate et pins), dépendances TypeScript et tests. (#312, #313, #317, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
