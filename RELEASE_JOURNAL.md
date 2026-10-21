# Journal des releases — Projects_Web_Service

<!-- release-journal-state {"dev": "b462ef029f277aff6a54af58f3be99a1b1420109", "prod": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "prod_tag": "v1.2.0", "staging": "214ddfaa83c4ac1a4d35677e675f1e8b111a2ec4", "updated": {"dev": "2026-10-21 18:07 UTC", "prod": "2026-10-21 11:15 UTC", "staging": "2026-10-21 11:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.2.0 | `214ddfa` | 2026-10-21 11:15 UTC |
| staging | — | `214ddfa` | 2026-10-21 11:12 UTC |
| dev | — | `b462ef0` | 2026-10-21 18:07 UTC |

## Ajouté sur main depuis la dernière release prod (v1.2.0)

#### Changements de comportement
- Le retour après création d'un projet s'affiche désormais dans une alerte intégrée de la lib (`Alert`, rôle status/alert, fermable) au lieu d'un toast autonome, qui n'est plus annoncé hors d'un `ToastProvider`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- L'état vide du board affiche le composant `DataState` de la lib. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Les boutons : l'ancien drapeau `primary` devient le style `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La confirmation de suppression passe par la modale `Confirm` de la lib, en variante danger, selon la maquette Figma décrite dans la PR. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Technique
- `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 dans `package.json` (la description de la PR cite 1.0.1). La barre latérale vient de `@mairie360/lib-components/shell` ; les fichiers locaux `accessible-shell`, `desktop-navigation` et `sidebar-preference` sont supprimés.
- Découpage de `ProjectsWorkspace` et `ProjectDetailModal` en dossiers par zone, avec tests co-localisés et convention d'arbre vérifiée par des tests. Le diff est tronqué : le détail des comportements reste à confirmer.

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Le retour après création d'un projet s'affiche désormais dans une alerte intégrée de la lib (`Alert`, rôle status/alert, fermable) au lieu d'un toast autonome, qui n'est plus annoncé hors d'un `ToastProvider`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- L'état vide du board affiche le composant `DataState` de la lib. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- Les boutons : l'ancien drapeau `primary` devient le style `solid` par défaut ; les anciens boutons secondaires gardent `variant="outline" tone="neutral"`. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))
- La confirmation de suppression passe par la modale `Confirm` de la lib, en variante danger, selon la maquette Figma décrite dans la PR. (MAIR-608, [#309](https://github.com/mairie360/Projects_Web_Service/pull/309))

#### Technique
- `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 dans `package.json` (la description de la PR cite 1.0.1). La barre latérale vient de `@mairie360/lib-components/shell` ; les fichiers locaux `accessible-shell`, `desktop-navigation` et `sidebar-preference` sont supprimés.
- Découpage de `ProjectsWorkspace` et `ProjectDetailModal` en dossiers par zone, avec tests co-localisés et convention d'arbre vérifiée par des tests. Le diff est tronqué : le détail des comportements reste à confirmer.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
