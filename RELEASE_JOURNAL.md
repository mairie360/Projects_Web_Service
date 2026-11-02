# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "ecb021288c8458d829ffb19fe46683fb3c0a75d0", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-02 18:21 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `ecb0212` | 2026-11-02 18:21 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Corrections
- Les stacks docker dev, ZAP et k6 transmettent désormais `AUTH_RATE_LIMIT_ENABLED` à BFF User sous la forme `false`. Avant, la valeur arrivait avec des antislashs (`\"false\"`), la limite de débit des connexions restait active et des connexions répétées pouvaient répondre 429. Maintenant, la limite est désactivée dans ces stacks. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Changements de comportement
- La confirmation de création de projet s'affiche avec l'`Alert` de la lib (rôle status/alert, fermable) au lieu d'un toast ; un `Toast` hors `ToastProvider` n'est plus annoncé. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Le tableau vide utilise le composant `DataState` de la lib. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Le bouton `primary` n'existe plus : il est remplacé par le style `solid` par défaut, et les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Technique
- Ajout du contrôle RGAA (`rgaa.yaml`, `accessibility_test.sh`, `docker-compose-accessibility.yml`, `init-accessibility.sql`), moteur mairie360/CICD épinglé en v5.1.1 et passage de `ANTHROPIC_WORKSPACE_ID` dans `promote-prod.yml`. (MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Checklist RGPD des PR (`gdpr-pr.yml`, check `gdpr / GDPR checklist` à rendre obligatoire), dépendances (follow-redirects 1.16.2, Next 16.4.2, Node 24.22.1, Zod vendorisé avec vérifications de provenance du bundle) et mises à jour Renovate de CICD et TypeScript. (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235), [#323](https://github.com/mairie360/Projects_Web_Service/pull/323), [#314](https://github.com/mairie360/Projects_Web_Service/pull/314), [#315](https://github.com/mairie360/Projects_Web_Service/pull/315), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317), [#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313))
- Refactor de l'interface en arbre de composants et shell fourni par `@mairie360/lib-components` (lib 1.0.1), sans changement visible hors des points ci-dessus. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence dev → staging (en dev, pas encore en staging)

#### Corrections
- Les stacks docker dev, ZAP et k6 transmettent désormais `AUTH_RATE_LIMIT_ENABLED` à BFF User sous la forme `false`. Avant, la valeur arrivait avec des antislashs (`\"false\"`), la limite de débit des connexions restait active et des connexions répétées pouvaient répondre 429. Maintenant, la limite est désactivée dans ces stacks. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Changements de comportement
- La confirmation de création de projet s'affiche avec l'`Alert` de la lib (rôle status/alert, fermable) au lieu d'un toast ; un `Toast` hors `ToastProvider` n'est plus annoncé. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Le tableau vide utilise le composant `DataState` de la lib. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Le bouton `primary` n'existe plus : il est remplacé par le style `solid` par défaut, et les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Technique
- Ajout du contrôle RGAA (`rgaa.yaml`, `accessibility_test.sh`, `docker-compose-accessibility.yml`, `init-accessibility.sql`), moteur mairie360/CICD épinglé en v5.1.1 et passage de `ANTHROPIC_WORKSPACE_ID` dans `promote-prod.yml`. (MAIR-316, [#225](https://github.com/mairie360/Projects_Web_Service/pull/225))
- Checklist RGPD des PR (`gdpr-pr.yml`, check `gdpr / GDPR checklist` à rendre obligatoire), dépendances (follow-redirects 1.16.2, Next 16.4.2, Node 24.22.1, Zod vendorisé avec vérifications de provenance du bundle) et mises à jour Renovate de CICD et TypeScript. (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235), [#323](https://github.com/mairie360/Projects_Web_Service/pull/323), [#314](https://github.com/mairie360/Projects_Web_Service/pull/314), [#315](https://github.com/mairie360/Projects_Web_Service/pull/315), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317), [#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313))
- Refactor de l'interface en arbre de composants et shell fourni par `@mairie360/lib-components` (lib 1.0.1), sans changement visible hors des points ci-dessus. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
