# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "bd3b4e162779d387b524ddba87cec73968e98112", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-04 18:30 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `bd3b4e1` | 2026-11-04 18:30 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Nouveautés
- Nouveau check de PR `gdpr / GDPR checklist` : la section « Personal data » de la description doit être cochée (exactement une case), et un « Oui » exige la ligne `Inventory:`. Il ne bloque la PR qu'une fois marqué requis dans la protection de `main`. (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235))

#### Changements de comportement
- Interface : les retours de page (création de projet, erreurs) passent par le composant `Alert` de la lib (rôle status/alert, fermable). Un `Toast` utilisé hors d'un `ToastProvider` n'est plus annoncé. Le bouton `primary` retiré devient `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. Le tableau vide utilise `DataState`. La barre latérale et la barre du haut viennent de `@mairie360/lib-components/shell` ; les copies locales sont supprimées. Le diff est tronqué : le détail des écrans est à vérifier. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks docker de dev, ZAP et k6 : avant, `AUTH_RATE_LIMIT_ENABLED` était écrit avec des guillemets échappés, BFF User lisait le texte `\"false\"` et gardait son rate limit de login actif (réponses 429 possibles). Maintenant la valeur est `"false"` et le rate limit est désactivé. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))
- Installation des dépendances : avant, `postinstall` interrogeait le service d'avis npm, donc `npm ci` échouait hors ligne ou pendant une panne. Maintenant `postinstall`, `prebuild` et `pretest` ne font que la vérification locale ; la vérification upstream passe par `npm run audit:upstream`, lancé chaque jour par un nouveau workflow hors PR. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))

#### Technique
- Gitleaks : `.gitleaks.toml` remplace `.gitleaksignore` (supprimé) et n'ignore que les digests SHA-256 de `vendor/security-patches.json` ; un test fige la politique. (MAIR-743, [#332](https://github.com/mairie360/Projects_Web_Service/pull/332))
- Simulation RGPD et stack RGAA : nouveaux fichiers `docker-compose-gdpr-simulation.yml`, `gdpr-journey.yaml`, `gdpr-simulation.yaml`, `gdpr_simulation_test.sh` (nettoyage, sauvegarde des logs, JWT) ; stack d'accessibilité `docker-compose-accessibility.yml`, `accessibility_test.sh` et `rgaa.yaml`. (MAIR-497, [#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330) ; MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Pins de mairie360/CICD : v4.5.0 à v4.12.0 (Renovate), v5.1.1 ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225)), v5.2.2 (MAIR-771, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327)), v5.3.0 puis v5.3.1 ([#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330)). `promote-prod.yml` reçoit le secret `ANTHROPIC_WORKSPACE_ID`.
- Node 24.21.0 à 24.22.1 (Dockerfile, development.Dockerfile, CI) et Next 16.3.8 à 16.4.2, digests d'image mis à jour. ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- Dépendances : `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p, [#323](https://github.com/mairie360/Projects_Web_Service/pull/323)) ; mises à jour TypeScript et tests ([#313](https://github.com/mairie360/Projects_Web_Service/pull/313)) ; `@mairie360/lib-components` 1.0.3 ([#309](https://github.com/mairie360/Projects_Web_Service/pull/309)).
- Locks et backport Zod ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315)) : Zod vendorisé dans `vendor/zod` (`file:vendor/zod`, override), validation des collections bornée, gardes d'intégrité et d'avis, baseline de performance. Les source maps de production ne sont générées que dans la CI de mesure.
- Garde-fous CI : workflow `contracts.yml` et check GDPR alignés sur les nouvelles versions ; convention de l'arbre de composants et maquette Figma documentées dans `CLAUDE.md` et `README.md`.

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Nouveau check de PR `gdpr / GDPR checklist` : la section « Personal data » de la description doit être cochée (exactement une case), et un « Oui » exige la ligne `Inventory:`. Il ne bloque la PR qu'une fois marqué requis dans la protection de `main`. (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235))

#### Changements de comportement
- Interface : les retours de page (création de projet, erreurs) passent par le composant `Alert` de la lib (rôle status/alert, fermable). Un `Toast` utilisé hors d'un `ToastProvider` n'est plus annoncé. Le bouton `primary` retiré devient `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. Le tableau vide utilise `DataState`. La barre latérale et la barre du haut viennent de `@mairie360/lib-components/shell` ; les copies locales sont supprimées. Le diff est tronqué : le détail des écrans est à vérifier. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks docker de dev, ZAP et k6 : avant, `AUTH_RATE_LIMIT_ENABLED` était écrit avec des guillemets échappés, BFF User lisait le texte `\"false\"` et gardait son rate limit de login actif (réponses 429 possibles). Maintenant la valeur est `"false"` et le rate limit est désactivé. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))
- Installation des dépendances : avant, `postinstall` interrogeait le service d'avis npm, donc `npm ci` échouait hors ligne ou pendant une panne. Maintenant `postinstall`, `prebuild` et `pretest` ne font que la vérification locale ; la vérification upstream passe par `npm run audit:upstream`, lancé chaque jour par un nouveau workflow hors PR. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))

#### Technique
- Gitleaks : `.gitleaks.toml` remplace `.gitleaksignore` (supprimé) et n'ignore que les digests SHA-256 de `vendor/security-patches.json` ; un test fige la politique. (MAIR-743, [#332](https://github.com/mairie360/Projects_Web_Service/pull/332))
- Simulation RGPD et stack RGAA : nouveaux fichiers `docker-compose-gdpr-simulation.yml`, `gdpr-journey.yaml`, `gdpr-simulation.yaml`, `gdpr_simulation_test.sh` (nettoyage, sauvegarde des logs, JWT) ; stack d'accessibilité `docker-compose-accessibility.yml`, `accessibility_test.sh` et `rgaa.yaml`. (MAIR-497, [#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330) ; MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Pins de mairie360/CICD : v4.5.0 à v4.12.0 (Renovate), v5.1.1 ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225)), v5.2.2 (MAIR-771, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327)), v5.3.0 puis v5.3.1 ([#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330)). `promote-prod.yml` reçoit le secret `ANTHROPIC_WORKSPACE_ID`.
- Node 24.21.0 à 24.22.1 (Dockerfile, development.Dockerfile, CI) et Next 16.3.8 à 16.4.2, digests d'image mis à jour. ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- Dépendances : `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p, [#323](https://github.com/mairie360/Projects_Web_Service/pull/323)) ; mises à jour TypeScript et tests ([#313](https://github.com/mairie360/Projects_Web_Service/pull/313)) ; `@mairie360/lib-components` 1.0.3 ([#309](https://github.com/mairie360/Projects_Web_Service/pull/309)).
- Locks et backport Zod ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315)) : Zod vendorisé dans `vendor/zod` (`file:vendor/zod`, override), validation des collections bornée, gardes d'intégrité et d'avis, baseline de performance. Les source maps de production ne sont générées que dans la CI de mesure.
- Garde-fous CI : workflow `contracts.yml` et check GDPR alignés sur les nouvelles versions ; convention de l'arbre de composants et maquette Figma documentées dans `CLAUDE.md` et `README.md`.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
