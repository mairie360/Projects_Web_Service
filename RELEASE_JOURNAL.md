# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "a0f7eec2b368e69cb4bc3fa7989fe4e3f6d1e3c6", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-02 20:01 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `a0f7eec` | 2026-11-02 20:01 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Changements de comportement
- Le retour affiché après la création d'un projet est désormais une alerte inline de la lib (`Alert`, fermable, rôle status/alert). Un `Toast` isolé hors `ToastProvider` n'est plus annoncé. Le board vide utilise `DataState`, et les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- L'en-tête, la barre latérale et le pied de page viennent de `@mairie360/lib-components/shell` (`AccessibleShell`). Les fichiers locaux `accessible-shell.tsx` et `desktop-navigation.tsx` sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks docker dev, sécurité (ZAP) et performance (k6) : `AUTH_RATE_LIMIT_ENABLED` était transmis avec des guillemets échappés. BFF User lisait le texte `\"false\"`, le rate limit de connexion restait actif et des connexions répétées pouvaient répondre 429. Maintenant la valeur est `"false"` et le rate limit est désactivé. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- Installation : `postinstall`, `prebuild` et `pretest` n'interrogent plus le service d'avis npm. La vérification amont passe dans `npm run audit:upstream`, lancé chaque jour par `.github/workflows/upstream-advisories.yml`. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Dépendances : `follow-redirects` 1.16.2 dans le lock ([#323](https://github.com/mairie360/Projects_Web_Service/pull/323)) ; Next.js 16.4.2, Node 24.22.1 et images Docker épinglées par digest ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314)) ; mises à jour TypeScript et de tests (`@testing-library/user-event`, `vitest`, `jsdom`, `playwright-core`) ([#313](https://github.com/mairie360/Projects_Web_Service/pull/313)) ; `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 dans `package.json` ([#309](https://github.com/mairie360/Projects_Web_Service/pull/309)).
- Workflows CI : mairie360/CICD est épinglé à `82eeb66` (v5.1.1) ; ajout de `ANTHROPIC_WORKSPACE_ID` dans `promote-prod.yml` ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225)). Les bumps Renovate v4.5.0 et v4.12.0 sont antérieurs à ce pin ([#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317)).
- Accessibilité RGAA (MAIR-316) : `rgaa.yaml`, `accessibility_test.sh`, `docker-compose-accessibility.yml` et `init-accessibility.sql` ajoutent une stack de test qui joue les états RGAA et écrit `rgaa-report/` ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225)).
- Checklist RGPD des PR (MAIR-295) : workflow `gdpr-pr.yml` épinglé à mairie360/CICD `v4.12.2`, suivi par Renovate ([#235](https://github.com/mairie360/Projects_Web_Service/pull/235)).
- Zod vendorisé (MAIR-744 et [#315](https://github.com/mairie360/Projects_Web_Service/pull/315)) : `vendor/zod` avec garde d'intégrité, provenance du bundle et baseline de performance. La description annonce une validation bornée des collections. Le diff visible ne montre pas son usage côté front, donc l'effet runtime reste à vérifier. `productionBrowserSourceMaps` n'est activé que dans la CI de mesure.
- Refactor ProjectsWorkspace (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309)) : composants découpés en dossiers, avec convention d'arborescence et tests co-localisés. Le diff est tronqué, donc la liste n'est pas exhaustive.

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Le retour affiché après la création d'un projet est désormais une alerte inline de la lib (`Alert`, fermable, rôle status/alert). Un `Toast` isolé hors `ToastProvider` n'est plus annoncé. Le board vide utilise `DataState`, et les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- L'en-tête, la barre latérale et le pied de page viennent de `@mairie360/lib-components/shell` (`AccessibleShell`). Les fichiers locaux `accessible-shell.tsx` et `desktop-navigation.tsx` sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks docker dev, sécurité (ZAP) et performance (k6) : `AUTH_RATE_LIMIT_ENABLED` était transmis avec des guillemets échappés. BFF User lisait le texte `\"false\"`, le rate limit de connexion restait actif et des connexions répétées pouvaient répondre 429. Maintenant la valeur est `"false"` et le rate limit est désactivé. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- Installation : `postinstall`, `prebuild` et `pretest` n'interrogent plus le service d'avis npm. La vérification amont passe dans `npm run audit:upstream`, lancé chaque jour par `.github/workflows/upstream-advisories.yml`. (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Dépendances : `follow-redirects` 1.16.2 dans le lock ([#323](https://github.com/mairie360/Projects_Web_Service/pull/323)) ; Next.js 16.4.2, Node 24.22.1 et images Docker épinglées par digest ([#314](https://github.com/mairie360/Projects_Web_Service/pull/314)) ; mises à jour TypeScript et de tests (`@testing-library/user-event`, `vitest`, `jsdom`, `playwright-core`) ([#313](https://github.com/mairie360/Projects_Web_Service/pull/313)) ; `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 dans `package.json` ([#309](https://github.com/mairie360/Projects_Web_Service/pull/309)).
- Workflows CI : mairie360/CICD est épinglé à `82eeb66` (v5.1.1) ; ajout de `ANTHROPIC_WORKSPACE_ID` dans `promote-prod.yml` ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225)). Les bumps Renovate v4.5.0 et v4.12.0 sont antérieurs à ce pin ([#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317)).
- Accessibilité RGAA (MAIR-316) : `rgaa.yaml`, `accessibility_test.sh`, `docker-compose-accessibility.yml` et `init-accessibility.sql` ajoutent une stack de test qui joue les états RGAA et écrit `rgaa-report/` ([#225](https://github.com/mairie360/Projects_Web_Service/pull/225)).
- Checklist RGPD des PR (MAIR-295) : workflow `gdpr-pr.yml` épinglé à mairie360/CICD `v4.12.2`, suivi par Renovate ([#235](https://github.com/mairie360/Projects_Web_Service/pull/235)).
- Zod vendorisé (MAIR-744 et [#315](https://github.com/mairie360/Projects_Web_Service/pull/315)) : `vendor/zod` avec garde d'intégrité, provenance du bundle et baseline de performance. La description annonce une validation bornée des collections. Le diff visible ne montre pas son usage côté front, donc l'effet runtime reste à vérifier. `productionBrowserSourceMaps` n'est activé que dans la CI de mesure.
- Refactor ProjectsWorkspace (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309)) : composants découpés en dossiers, avec convention d'arborescence et tests co-localisés. Le diff est tronqué, donc la liste n'est pas exhaustive.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
