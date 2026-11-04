# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "05d1ba46ceb3f76163d818944a6cba605820e1b0", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-11-04 18:27 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `05d1ba4` | 2026-11-04 18:27 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Changements de comportement
- Les messages de retour de page passent par l'`Alert` de la lib (rôle status/alert, fermable). Un `Toast` de la lib utilisé hors d'un `ToastProvider` n'est plus annoncé aux lecteurs d'écran. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La barre latérale et la barre supérieure viennent désormais de `@mairie360/lib-components/shell` (`AccessibleShell`) : les composants locaux `desktop-navigation` et `accessible-shell` ainsi que la préférence de barre latérale locale sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks Docker de test (dev, ZAP, k6) : `AUTH_RATE_LIMIT_ENABLED` était passé avec des antislashs (`\"false\"`), donc BFF User lisait un texte et gardait le rate limit du login actif (réponses 429 possibles). Maintenant la valeur est `false` et le rate limit est désactivé dans ces stacks. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- Dépendances : Next.js passe en 16.4.2, les images Docker et la CI en Node 24.22.1, `@mairie360/lib-components` en 1.0.3 (la PR annonce 1.0.1, le diff pose 1.0.3), `follow-redirects` en 1.16.2, et mises à jour TypeScript/test via Renovate. (MAIR-608, MAIR-771, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309), [#314](https://github.com/mairie360/Projects_Web_Service/pull/314), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313), [#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- Les hooks `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d'avis npm : `npm run audit:upstream` le fait en planifié (`upstream-advisories.yml`). (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Le module zod vendorisé reçoit un backport de validation bornée des collections, et les locks sont réparés ; le diff ne permet pas de décrire son effet côté front. (bbc63e0, [#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- Pins CI : mairie360/CICD passe de v4.5.0 à v4.12.0, puis v5.1.1, v5.2.2 et v5.3.1 ; ajout de la checklist RGPD sur les PR (`gdpr-pr.yml`) et de la simulation RGPD (`gdpr_simulation_test.sh`, `docker-compose-gdpr-simulation.yml`, outillage de test uniquement). (MAIR-295, MAIR-497, MAIR-771, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235), [#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330), [#327](https://github.com/mairie360/Projects_Web_Service/pull/327))
- Tests RGAA et stack d'accessibilité (MAIR-316) et découpe des composants du workspace en dossiers par composant (MAIR-608) : sans effet visible pour les utilisateurs.

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les messages de retour de page passent par l'`Alert` de la lib (rôle status/alert, fermable). Un `Toast` de la lib utilisé hors d'un `ToastProvider` n'est plus annoncé aux lecteurs d'écran. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La barre latérale et la barre supérieure viennent désormais de `@mairie360/lib-components/shell` (`AccessibleShell`) : les composants locaux `desktop-navigation` et `accessible-shell` ainsi que la préférence de barre latérale locale sont supprimés. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Stacks Docker de test (dev, ZAP, k6) : `AUTH_RATE_LIMIT_ENABLED` était passé avec des antislashs (`\"false\"`), donc BFF User lisait un texte et gardait le rate limit du login actif (réponses 429 possibles). Maintenant la valeur est `false` et le rate limit est désactivé dans ces stacks. (MAIR-769, [#321](https://github.com/mairie360/Projects_Web_Service/pull/321))

#### Technique
- Dépendances : Next.js passe en 16.4.2, les images Docker et la CI en Node 24.22.1, `@mairie360/lib-components` en 1.0.3 (la PR annonce 1.0.1, le diff pose 1.0.3), `follow-redirects` en 1.16.2, et mises à jour TypeScript/test via Renovate. (MAIR-608, MAIR-771, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309), [#314](https://github.com/mairie360/Projects_Web_Service/pull/314), [#313](https://github.com/mairie360/Projects_Web_Service/pull/313), [#323](https://github.com/mairie360/Projects_Web_Service/pull/323))
- Les hooks `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d'avis npm : `npm run audit:upstream` le fait en planifié (`upstream-advisories.yml`). (MAIR-744, [#326](https://github.com/mairie360/Projects_Web_Service/pull/326))
- Le module zod vendorisé reçoit un backport de validation bornée des collections, et les locks sont réparés ; le diff ne permet pas de décrire son effet côté front. (bbc63e0, [#315](https://github.com/mairie360/Projects_Web_Service/pull/315))
- Pins CI : mairie360/CICD passe de v4.5.0 à v4.12.0, puis v5.1.1, v5.2.2 et v5.3.1 ; ajout de la checklist RGPD sur les PR (`gdpr-pr.yml`) et de la simulation RGPD (`gdpr_simulation_test.sh`, `docker-compose-gdpr-simulation.yml`, outillage de test uniquement). (MAIR-295, MAIR-497, MAIR-771, [#235](https://github.com/mairie360/Projects_Web_Service/pull/235), [#329](https://github.com/mairie360/Projects_Web_Service/pull/329), [#330](https://github.com/mairie360/Projects_Web_Service/pull/330), [#327](https://github.com/mairie360/Projects_Web_Service/pull/327))
- Tests RGAA et stack d'accessibilité (MAIR-316) et découpe des composants du workspace en dossiers par composant (MAIR-608) : sans effet visible pour les utilisateurs.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
