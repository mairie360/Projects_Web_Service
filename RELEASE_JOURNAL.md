# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "be8d1b1c23834b168ad69207862dc1b8958860a7", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-03 15:01 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `be8d1b1` | 2026-11-03 15:01 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Nouveautés
- Pour la création d'un projet, la confirmation s'affiche en alerte intégrée (`Alert`, variante succès) de la lib. La suppression d'un projet passe par une modale de confirmation en style danger, le chargement affiche un squelette, et le tableau vide utilise l'état `DataState`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Changements de comportement
- Les retours de page utilisent désormais l'`Alert` de la lib (rôle status/alert, fermable). Un `Toast` utilisé hors d'un `ToastProvider` n'est plus annoncé aux lecteurs d'écran. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La barre latérale repliable, la barre supérieure et le pied de page viennent de `@mairie360/lib-components/shell` : le sidebar local et la préférence de barre latérale locale sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks docker de dev, ZAP et k6 : `AUTH_RATE_LIMIT_ENABLED` était transmis avec des antislashs (« \"false\" »), donc la limite de connexion de BFF User restait active et pouvait répondre 429. Maintenant la valeur est « false » et la limite est désactivée dans ces stacks de test. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- Dépendances et runtime : Next.js 16.4.2, Node 24.22.1 (Dockerfiles et CI), follow-redirects 1.16.2, TypeScript et Vitest mis à jour, `@mairie360/lib-components` passe à 1.0.3 selon le diff ; la description de la PR #309 cite 1.0.1. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309), [#314](https://github.com/mairie360/Projects_Web_Service/pull/314), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313), [#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- CICD épinglé de v4.4.3 à v5.3.0 dans les workflows, avec des stacks RGPD et RGAA ajoutés au dépôt. (MAIR-771, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317), [#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#329](https://github.com/mairie360/Projects_Web_Service/pull/329))
- `postinstall`, `prebuild` et `pretest` ne consultent plus le service d'avis npm (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326)) ; le contrôle distant passe par `npm run audit:upstream` dans un workflow planifié. Backport de Zod vendorisé avec validation bornée des collections, sous contrôle d'intégrité (diff tronqué, comportement détaillé non vérifié). ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- Composants de l'espace projets déplacés sous `src/components/ProjectsWorkspace` avec tests co-localisés ; checklist RGPD ajoutée aux PR (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Pour la création d'un projet, la confirmation s'affiche en alerte intégrée (`Alert`, variante succès) de la lib. La suppression d'un projet passe par une modale de confirmation en style danger, le chargement affiche un squelette, et le tableau vide utilise l'état `DataState`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Changements de comportement
- Les retours de page utilisent désormais l'`Alert` de la lib (rôle status/alert, fermable). Un `Toast` utilisé hors d'un `ToastProvider` n'est plus annoncé aux lecteurs d'écran. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La barre latérale repliable, la barre supérieure et le pied de page viennent de `@mairie360/lib-components/shell` : le sidebar local et la préférence de barre latérale locale sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks docker de dev, ZAP et k6 : `AUTH_RATE_LIMIT_ENABLED` était transmis avec des antislashs (« \"false\" »), donc la limite de connexion de BFF User restait active et pouvait répondre 429. Maintenant la valeur est « false » et la limite est désactivée dans ces stacks de test. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- Dépendances et runtime : Next.js 16.4.2, Node 24.22.1 (Dockerfiles et CI), follow-redirects 1.16.2, TypeScript et Vitest mis à jour, `@mairie360/lib-components` passe à 1.0.3 selon le diff ; la description de la PR #309 cite 1.0.1. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309), [#314](https://github.com/mairie360/Projects_Web_Service/pull/314), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313), [#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- CICD épinglé de v4.4.3 à v5.3.0 dans les workflows, avec des stacks RGPD et RGAA ajoutés au dépôt. (MAIR-771, [#327](https://github.com/mairie360/Projects_Web_Service/pull/327), [#317](https://github.com/mairie360/Projects_Web_Service/pull/317), [#312](https://github.com/mairie360/Projects_Web_Service/pull/312), [#329](https://github.com/mairie360/Projects_Web_Service/pull/329))
- `postinstall`, `prebuild` et `pretest` ne consultent plus le service d'avis npm (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326)) ; le contrôle distant passe par `npm run audit:upstream` dans un workflow planifié. Backport de Zod vendorisé avec validation bornée des collections, sous contrôle d'intégrité (diff tronqué, comportement détaillé non vérifié). ([#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- Composants de l'espace projets déplacés sous `src/components/ProjectsWorkspace` avec tests co-localisés ; checklist RGPD ajoutée aux PR (MAIR-295, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
