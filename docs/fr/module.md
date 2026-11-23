
## Équipe, documents et activité (MAIR-874)

- **Équipe** (C1, Figma F8) : chaque membre avec `UserIdentity`, son rôle (Responsable / Contributeur / Lecteur) et sa
  charge (« n tâches terminées sur m », `ProgressMeter`, tâches actives seulement). Un responsable du projet
  (`canAssignMembers`) change un rôle (liste par membre), retire un membre après confirmation (Project API lui retire ses
  tâches du projet) et ajoute un agent des options de la page avec un rôle. Le propriétaire (le responsable du projet) est
  marqué « Responsable du projet » : ni retrait ni changement de rôle proposés ; un 409 du BFF sur lui est expliqué. Une
  ligne d’état confirme chaque changement, un refus affiche « Équipe non modifiée ».
- **Documents** (C2) : aucun service ne stocke encore les documents : l’onglet est un panneau « indisponible ».
- **Activité** (C3, Figma F10) : « Commentaire » + « Publier » (Ctrl + Entrée), 1 à 2000 caractères après suppression
  des espaces, sans `<` / `>` ; puis tout l’historique (commentaires et changements des tâches, du plus récent au plus
  ancien), 20 par page avec la `Pagination` de la lib, lu quand l’onglet s’affiche. Un commentaire publié relit
  l’historique depuis la première page (et la vue d’ensemble).
