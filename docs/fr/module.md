# Projects_Web_Service — Présentation du module

## Navigation des modules actifs

Les menus ordinateur et mobile ne proposent plus les modules archivés E-mails
et Fichiers, comme dans la version locale. L'ordre des autres modules et la
visibilité réservée aux administrateurs restent inchangés ; Paramètres reste
accessible via l’AppShell partagé. Les pièces jointes et documents métier des
modules actifs ne sont pas supprimés.

## Un seul espace compte

Le profil est désormais ouvert dans **Paramètres (Settings)**. Les anciens liens
`/profile` et leurs sous-chemins redirigent vers le front Settings configuré
pour les visiteurs authentifiés. La sidebar conserve Paramètres sans doublon
Profil. Si Settings n’est pas configuré correctement, ces anciens liens renvoient
une erreur 503 non mise en cache ; aucune donnée personnelle de démonstration
ni fausse sauvegarde n’est affichée.

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Permettre le suivi des projets et tâches de la mairie dans des vues Kanban, grille et tableau. Les données et permissions proviennent de BFF Project.

## Public et utilité

Les agents, responsables de projets et administrateurs.

Domaine fonctionnel: Projets et tâches.

## Fonctions disponibles

- Recherche, filtres, pagination et changement de vue des projets.
- La page et la navigation commune reprennent l’échelle racine de 17px et la police système par défaut de la référence ; le header reste dimensionné en rem (68px par défaut), avec les tailles standard des petits textes. Aucune préférence d’apparence sauvegardée ni identité utilisateur n’est simulée.
- Formulaires de création et modification de projets et tâches.
- Détails, statuts, collaboration et actions disponibles selon les permissions du BFF.

## Parcours type

1. Charger `/projects-page` depuis BFF_Project, qui renvoie aussi le rôle et les permissions de l’utilisateur.
2. Ouvrir un projet pour consulter ses tâches et les actions autorisées.
3. Effectuer une mutation puis utiliser les données renvoyées et recharger le contexte concerné.

## Recherche et filtres adaptatifs

Recherche, statut, priorité, échéance et vues sont empilés sur téléphone.
La recherche garde sa ligne avant `xl` ; les vues ne rejoignent la barre qu’à
`2xl`. À ce seuil, la recherche peut descendre sous sa largeur minimale
intermédiaire tout en gardant au moins 240px, ce qui réserve un espace entre
échéance et vues lorsque la sidebar desktop est visible. Recherche, filtres et
vues conservent leur comportement ; aucune donnée métier, variable ou API/BFF
n’est modifiée.

## Présentation des échéances

Les cartes projets, le tableau, les éditeurs de tâches et les fiches projets
utilisent le même formateur de dates. Une échéance vide ou composée d’espaces
affiche **Sans échéance** ; une date non vide malformée ou impossible affiche
**Échéance invalide**. Les dates `YYYY-MM-DD` valides gardent le rendu
`jj/mm/aaaa` ou `jj/mm`, sans conversion de fuseau. Le formatage ne remplace ni
n’enregistre aucune date métier et ne change pas la recherche, les filtres,
les permissions ou les actions de statut des tâches. Aucune nouvelle variable,
dépendance ou évolution API/BFF n’est nécessaire.

## Titres de tâches adaptatifs

Les titres de tâches dans la fiche projet et l’éditeur de tâches utilisent la
largeur disponible sur téléphone ; les actions autorisées sont sur une ligne
distincte. Les noms longs, même sans espaces, se replient sans chevaucher les
contrôles. À partir du petit breakpoint desktop, titres et actions partagent
une ligne compacte. Suivi, Modifier, confirmation de suppression et permissions
de statut sont inchangés. Ce changement de présentation n’écrit aucune donnée
et ne nécessite aucune évolution d’environnement, dépendance ou API/BFF.

## Suivi des tâches responsive

Le panneau Suivi utilise une colonne bornée sur téléphone et deux colonnes sur
grand écran. Auteurs, dates, messages complets et historique reviennent à la
ligne, même sans espaces ; les retours de ligne des commentaires sont conservés.
Le champ et le bouton Envoyer sont empilés sur téléphone, puis partagent une
ligne au petit breakpoint. Envoi, texte enregistré et permissions `canComment`
restent inchangés. Aucun changement API/BFF, dépendance ou environnement.

## Formulaires de projet accessibles au clavier

Nouveau projet et Modifier dans le menu de carte ouvrent des dialogues nommés.
Le focus entre dans le formulaire, Tab/Maj+Tab restent dans ses contrôles et
Échap ou Fermer annulent sans enregistrer puis rendent le focus au déclencheur
encore présent (bouton Actions de la carte après Modifier). Échap ferme d’abord
un sélecteur multiple d’assignés/étiquettes
ouvert et rend le focus à son bouton, sans perdre les choix. Création, édition,
permissions et requêtes publiées restent inchangées ; aucun changement API/BFF,
de dépendance ou d’environnement n’est nécessaire.

## Place dans Mairie360

Dépôts associés: [BFF_Project](https://github.com/mairie360/BFF_Project).

Ce dépôt contient l’interface navigateur et ses adaptateurs Next.js. Le BFF associé fournit les données métier et coordonne leurs sources.

## Données et état actuel

Le module combine Project API et PostgreSQL. Le dépôt SQL gère notamment visibilité, membres, projets, tâches et collaboration. Les commentaires et une partie de l’historique utilisent `tasks.custom_fields`; l’historique de statut peut venir de `task_history`. Avec `PROJECT_DB_ACCESS=disabled`, la collaboration utilise un repli mémoire perdu au redémarrage.

## Périmètre et limites

Désactiver l’accès SQL change les capacités et la persistance; ce mode ne constitue pas une validation d’un déploiement complet. Les identifiants publics et statuts sont normalisés par les helpers, tandis que certains champs de projet sont dérivés des tâches.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
