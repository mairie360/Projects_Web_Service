# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "ff7d225405db8cd017dde15f0ce4366e2a8b6ba9", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-10-23 13:12 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `ff7d225` | 2026-10-23 13:12 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Changements de comportement
- Le retour après création d'un projet s'affiche désormais en `Alert` inline de la lib (rôle status ou alert, fermable) au lieu d'un toast. Un `Toast` de la lib utilisé hors `ToastProvider` n'est plus annoncé aux lecteurs d'écran. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La suppression d'une tâche passe par une modale de confirmation de la lib en variante danger (`TaskDeleteConfirm`). (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Le chargement de l'espace projets affiche des `Skeleton` de la lib, et le tableau vide utilise `DataState`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Les boutons changent d'apparence : le flag `primary` retiré devient la variante `solid` par défaut, et les anciens boutons secondaires prennent la variante outline avec le ton neutral. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La coque de l'application (barre latérale repliable, barre haute, pied de page) vient désormais de `AccessibleShell` de `@mairie360/lib-components/shell`. Les composants locaux `accessible-shell`, `desktop-navigation` et `sidebar-preference` sont supprimés. (MAIR-578, MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Le focus des modales est corrigé par la version de la lib utilisée (mairie360/lib-components#471) et consommé par la fiche projet via `use-dialog-focus`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Technique
- Node.js passe de 24.21.0 à 24.22.1 dans les deux Dockerfile (nouveaux digests d'image), dans les workflows CI et dans les tests de politique CI ; Next.js et eslint-config-next passent de 16.3.8 à 16.4.2. (sans clé Jira, [#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- `@mairie360/lib-components` passe de 0.10.2 à 1.0.3. L'espace projets est découpé en arborescence `ProjectsWorkspace/` (un dossier par composant, tests co-localisés), les anciens fichiers sont supprimés et les scripts de couverture excluent les fichiers de test. Le diff étant tronqué, cette liste s'appuie sur la partie visible. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Le retour après création d'un projet s'affiche désormais en `Alert` inline de la lib (rôle status ou alert, fermable) au lieu d'un toast. Un `Toast` de la lib utilisé hors `ToastProvider` n'est plus annoncé aux lecteurs d'écran. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La suppression d'une tâche passe par une modale de confirmation de la lib en variante danger (`TaskDeleteConfirm`). (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Le chargement de l'espace projets affiche des `Skeleton` de la lib, et le tableau vide utilise `DataState`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Les boutons changent d'apparence : le flag `primary` retiré devient la variante `solid` par défaut, et les anciens boutons secondaires prennent la variante outline avec le ton neutral. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La coque de l'application (barre latérale repliable, barre haute, pied de page) vient désormais de `AccessibleShell` de `@mairie360/lib-components/shell`. Les composants locaux `accessible-shell`, `desktop-navigation` et `sidebar-preference` sont supprimés. (MAIR-578, MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Corrections
- Le focus des modales est corrigé par la version de la lib utilisée (mairie360/lib-components#471) et consommé par la fiche projet via `use-dialog-focus`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Technique
- Node.js passe de 24.21.0 à 24.22.1 dans les deux Dockerfile (nouveaux digests d'image), dans les workflows CI et dans les tests de politique CI ; Next.js et eslint-config-next passent de 16.3.8 à 16.4.2. (sans clé Jira, [#314](https://github.com/mairie360/Projects_Web_Service/pull/314))
- `@mairie360/lib-components` passe de 0.10.2 à 1.0.3. L'espace projets est découpé en arborescence `ProjectsWorkspace/` (un dossier par composant, tests co-localisés), les anciens fichiers sont supprimés et les scripts de couverture excluent les fichiers de test. Le diff étant tronqué, cette liste s'appuie sur la partie visible. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
