# Projects_Web_Service — Présentation du module

## Durée de vie de l’ouverture du formulaire de carte (MAIR-459, MAIR-408)

Chaque ouverture d’édition possède une identité transitoire distincte, même pour
le même projet. Les réussites et refus obsolètes ne remplacent pas un autre
formulaire, ne rouvrent pas une fenêtre fermée et n’écrasent pas une nouvelle
création. Cible et champs chargés sont appliqués ensemble : une ouverture en
attente ne recible pas silencieusement le formulaire affiché. Poursuivre son
brouillon, fermer, créer ou soumettre invalide cette ouverture ; les gardes
d’écriture existantes continuent à protéger tous les champs envoyés. L’ouverture
et son annulation n’envoient ni ne rejouent aucune écriture.
La capture d’activité du formulaire inclut les champs locaux de tâche qui ne
mettent pas encore à jour le brouillon du projet. Un changement volontaire de
propriétaire remonte son formulaire afin qu’un brouillon imbriqué non envoyé
ne traverse pas cette frontière ; les mises à jour de la même cible gardent
l’identité du formulaire et ses brouillons.

La fiche reçue doit identifier le projet demandé et des tâches uniques. Un
refus explicite de permission d’édition ou une réponse terminale401/403/navigation
ne fournit pas de formulaire périmé ; un refus courant ferme l’ancien éditeur
de ce projet. Un échec de lecture courant non terminal conserve le repli existant
sur la carte déjà affichée, avec avertissement accessible dans le formulaire.
Il s’agit de consommer les permissions existantes, pas de changer les accès serveur.
Contrat Project0.4.0 publié, clients, authentification et environnements inchangés.
L’ouverture sans garde du prototype est un manque hérité ; sa correction ne
certifie ni les droits/persistances déployés ni la fin de l’audit global.

## Ordre des confirmations projet et tâches (MAIR-408)

Les éditions de projet existant (fiche et carte), déplacements Kanban et clôture/
suspension capturent la révision des confirmations de tâches avant leur requête
contractuelle inchangée. Une réponse projet tardive conserve les vraies tâches
et suppressions confirmées depuis cette révision. Une lecture cohérente
intermédiaire peut enrichir ou retirer ces tâches ; son résultat officiel reste
préservé aussi. Le journal garde seulement la dernière valeur de chaque tâche,
pas un historique de toutes les écritures. Métadonnées, permissions et
statistiques viennent toujours du DTO projet ; aucun compteur n’est déduit des
confirmations partielles. La fiche mêlant des réponses d’âges différents propose
une reprise GET seule, sans renvoyer les écritures acceptées. Les relectures du
catalogue gardent les tâches récentes jusqu’à réconciliation du détail. Une
écriture projet commencée après une confirmation de tâche reste autoritaire.
Création et duplication n’héritent pas des tâches du projet source. Consultations
fermées, rouvertes ou remplacées et gardes de formulaire existantes sont conservées.

Il s’agit d’une régression de mélange de réponses propre au candidat, pas d’un
comportement identique du prototype préservé qui attendait les lectures de détail.
Contrat publié Project0.4.0, API/BFF, authentification, dépendances, environnements
et anciennes versions locales inchangés ; les fixtures ne certifient ni la
persistance déployée ni tous les éléments de l’audit.

## Identité des tâches et de la fiche (MAIR-408)

La confirmation d’une édition ou d’un statut doit identifier la tâche demandée.
Une écriture réussie avec une réponse incohérente n’est pas un refus : aucune
autre ligne n’est remplacée et la cible reste protégée jusqu’à une lecture
cohérente. Une vérification GET est tentée ; son échec permet une reprise GET
explicite, jamais la répétition de l’écriture acceptée. Les brouillons et les
autres tâches restent disponibles sous les verrous de formulaire existants.
Le détail doit correspondre au projet demandé et présenter des identifiants de
tâches uniques et non vides. Une lecture incohérente ou ancienne ne remplace pas
la fiche et ne lève pas l’incertitude. Une lecture cohérente ultérieure, y compris
une réouverture, restitue les données officielles et déverrouille les cibles.
Contrat et données serveur inchangés ; vérifier les valeurs reçues avant une
nouvelle action, car cette lecture ne prouve pas que la saisie a été appliquée.

## Écritures de tâches en attente (MAIR-408)

Statut, suppression et édition d’une même tâche existante partagent une garde
synchrone projet/tâche jusqu’à la confirmation et la fin des relectures. Aucune
commande répétée ou contradictoire ne renvoie d’écriture pendant cette attente ;
les autres tâches et projets restent indépendants. La ligne concernée annonce
l’attente et désactive ses actions de mutation. Un brouillon d’édition reste
disponible, mais ne peut être envoyé pendant une autre écriture sur sa tâche.
Une édition ignorée ne devient jamais une fausse confirmation vidant le formulaire.
La suppression confirmée retire immédiatement sa ligne et annonce la relecture
encore active. Le refus libère la garde pour une nouvelle tentative volontaire ;
un refus de relecture conserve les vraies données confirmées et donne une reprise
GET seule. Fermer puis rouvrir le détail ne contourne pas la garde portée par la
page et ne rouvre pas une consultation abandonnée. Contrat, permissions et
authentification inchangés : ce n’est pas un verrou distribué/backend ni une
garantie de persistance serveur.
Le motif d’un refus reste visible sur sa ligne, y compris après réouverture du
même projet ; une nouvelle tentative efface seulement l’erreur de sa cible.
Les verrous de formulaire partagés conservent les champs envoyés et empêchent
de remplacer un formulaire pendant son enregistrement.

## Tâches confirmées et reprise de la fiche (MAIR-408)

Création, édition et statut acceptés gardent la tâche canonique normalisée et ses
permissions reçues ; une suppression confirmée retire seulement sa cible. Aucun
brouillon n’est appliqué après refus d’écriture. Les confirmations partielles ne
recalculent ni totaux ni progression du projet. Après refus de lecture, la fiche
explique que ces statistiques viennent de la dernière lecture serveur réussie
et propose une reprise GET seule, gardée et accessible au clavier. La réussite
remplace détail et statistiques reçus sans renvoyer une écriture. Les anciennes
lectures de tâches ne peuvent effacer les confirmations récentes ; une ouverture
toujours souhaitée relit après confirmation survenue pendant sa réponse précédente.
Les dialogues fermés ou remplacés restent fermés. Opérations Project0.4.0 publiées
et authentification inchangées, pas certification de persistance backend déployée.

## Durée de vie du détail projet courant (MAIR-408)

Chaque ouverture directe ou par lien possède sa propre identité transitoire.
Une ancienne réussite ou erreur ne remplace pas le détail courant. Fermer
invalide cette consultation, même lorsque le même projet est rouvert. Les
actualisations de tâches et confirmations de projet/cycle de vie ne mettent à
jour que le dialogue toujours courant ; une création volontaire ouvre toujours
son nouveau projet confirmé. Lectures et écritures acceptées ne sont pas
rejouées ; brouillons, permissions et comportement clavier existants restent
inchangés. Ces courses héritées sont distinctes du panneau de collaboration de
tâche et des besoins de persistance backend. Contrat Project0.4.0 publié,
client/proxy/authentification et environnements inchangés.

## Requête courante après une écriture en attente (MAIR-451)

Les lectures implicites suivant une écriture utilisent recherche, statut, priorité,
échéance, vue et page demandée actuellement affichés, pas les valeurs capturées avant
une écriture lente. Les événements de filtre mettent à jour l’instantané transitoire
de façon synchrone ; la lecture temporisée existante suit toujours les contrôles
affichés. Gardes des lectures tardives et réponses confirmées restent inchangées.
Un refus d’actualisation conserve les données confirmées et la reprise GET seule,
sans répéter une écriture acceptée.

Création et duplication effacent volontairement les filtres et reviennent à la
première page après confirmation, mais gardent la vue courante, même changée pendant
l’attente. Le défaut de requête capturée est corrigé sans réintroduire d’optimisme
ancien ni inventer données, permissions, compteurs ou opération backend. Contrat
publié Project0.4.0, authentification, dépendances et environnements inchangés.

## Pages de résultats des projets (MAIR-472)

La navigation Précédent/Suivant est commune aux vues Kanban, Grille et Tableau.
Le numéro, le total et la disponibilité de la page suivante viennent uniquement
des métadonnées BFF validées, jamais du nombre de projets partiellement reçus.
Un changement de page envoie un seul GET existant avec les filtres courants.
Recherche, statut, priorité et échéance repartent à la première page ; un changement
de vue conserve la page demandée. Les lectures en attente bloquent la pagination
et les doubles événements. Une réponse tardive ne remplace pas une requête plus
récente ni une mutation confirmée. Un refus ou une réponse incohérente conserve
la dernière page confirmée et propose un réessai explicite du GET demandé,
sans rejouer aucune mutation.

Le prototype préservé et l’ancien front demandaient toujours la première page,
sans commandes de pagination : il s’agit d’un manque hérité corrigé, pas d’une
fonctionnalité historiquement présente dans la référence. L’opération publiée
0.4.0 reste inchangée. Aucun changement d’environnement, dépendance, API/BFF,
permission ou déploiement. Les fixtures ne certifient pas les résultats ni la
persistance du service déployé ; l’intégration reste soumise à la CI.

## Réouverture de la page protégée après redirection (MAIR-408)

Si une lecture ou une action reçoit une redirection opaque, le front recharge
une seule fois le document protégé courant. Le middleware existant choisit Login
et le chemin de retour, pas la requête de données. Une lecture annulée ne navigue
pas et une action n’est jamais rejouée automatiquement. Un vrai 401 conserve le
logout local ; 403, indisponibilité et panne réseau ne deviennent pas des erreurs
d’authentification. Aucun comportement API/BFF ou de route d’authentification ne
change. Authentification déployée, révocation et persistance restent non certifiées.

## Session courante plutôt que jeton local ancien (MAIR-408)

Les lectures et actions Projects n’utilisent plus les JWT stockés dans le
navigateur. Le cookie de session same-origin reste la seule source automatique
de credentials via le proxy inchangé. Les requêtes ne lisent ni ne migrent le
stockage hérité ; son nettoyage existant au logout est conservé. Cette tranche
frontend ne certifie ni authentification déployée, révocation serveur ni
persistance métier.

## Navigation des modules actifs

Le CSS du front rétablit les cibles de 44px minimum et l’ombre de séparation
de la sidebar de référence, sans recopier la navigation partagée. Dans le tiroir
mobile, la sidebar reste sous Fermer ; le clavier et le retour du focus restent
gérés par l’AppShell publié. Ce style ne simule aucune préférence sauvegardée,
identité utilisateur ou version fictive (MAIR-180).

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
- La barre d’outils passe son sélecteur de vue à la ligne quand la recherche et les filtres ont besoin de place, y compris sur grand écran avec l’échelle de police de la référence.
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

## Visibilité d’une tâche liée

Une URL projet/tâche met en évidence la tâche autorisée et lui donne le focus.
Seul le contenu de la fiche défile : son en-tête et Fermer restent en place sur
ordinateur et mobile. Une tâche arrivée plus tard est ciblée sans ramener la
lecture lors d’un rafraîchissement sans rapport. La navigation normale reste en
haut de la fiche. Les cibles absentes ou invalides gardent l’erreur explicite
existante sans fausse fiche. Correction uniquement frontend ; la recette déployée
Dashboard/multi-rôles reste distincte.

## Défilement des formulaires de fiche

Le panneau extérieur de la fiche projet masque son débordement sans devenir un
conteneur défilant. Seul son corps défile lorsqu’un champ reçoit le focus, y
compris pendant l’édition et la navigation Tab/Maj+Tab. Titre et Fermer restent
visibles sur ordinateur et mobile ; le focus des tâches liées, les sélecteurs
multiples, l’annulation et le retour du focus gardent leur comportement existant.
Aucun changement API/BFF, dépendance, donnée métier ou environnement.

## Reprise des projets confirmés et formulaires en attente

Kanban, grille et tableau conservent les projets reçus après une lecture refusée,
annoncent les statistiques périmées et proposent une reprise GET seule protégée.
Les réponses confirmées de création, duplication et modification sont appliquées
avant le rafraîchissement, jamais remplacées par le brouillon ni annulées par une
lecture ancienne. La reprise ne répète aucune écriture confirmée. La duplication
protège sa source pendant l'écriture et la lecture suivante. Création et édition
depuis une carte protègent champs, tâches imbriquées et fermeture clavier pendant
l'attente, gardent le brouillon après refus et ferment après confirmation. La
recette native en vrai 390×844 couvre ces interactions composées ; voir le README
pour les preuves et gates main/déploiement restants. Le tableau vide du prototype
après lecture refusée est volontairement corrigé. Contrats API/BFF et permissions
inchangés ; aucune donnée de recette publiée.

## Frontières de page et dialogues — MAIR-408

Filtres et vues Kanban/grille/tableau, création/édition des projets, brouillons
de tâches imbriquées et suivi du détail gardent leur comportement existant.
L'état et les commandes ont un seul contrôleur lié à la durée de vie de la page ;
le rendu et les deux dialogues sont des composants stables distincts. Une
actualisation de vue ne réinitialise pas les tâches d'un formulaire ouvert,
la recherche de tâches ou un commentaire non envoyé. Aucun nouvel appel, droit,
source de données ou réglage d'environnement. Audit complémentaire du détail et
intégration restent distincts de ce changement de structure.

## Place dans Mairie360

Dépôts associés: [BFF_Project](https://github.com/mairie360/BFF_Project).

Ce dépôt contient l’interface navigateur et ses adaptateurs Next.js. Le BFF associé fournit les données métier et coordonne leurs sources.

## Données et état actuel

Le module combine Project API et PostgreSQL. Le dépôt SQL gère notamment visibilité, membres, projets, tâches et collaboration. Les commentaires et une partie de l’historique utilisent `tasks.custom_fields`; l’historique de statut peut venir de `task_history`. Avec `PROJECT_DB_ACCESS=disabled`, la collaboration utilise un repli mémoire perdu au redémarrage.

## Périmètre et limites

Désactiver l’accès SQL change les capacités et la persistance; ce mode ne constitue pas une validation d’un déploiement complet. Les identifiants publics et statuts sont normalisés par les helpers, tandis que certains champs de projet sont dérivés des tâches.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
