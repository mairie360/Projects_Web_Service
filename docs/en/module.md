
## Team, documents and activity (MAIR-874)

- **Équipe** (C1, Figma F8): each member with `UserIdentity`, their role (Responsable / Contributeur / Lecteur) and their
  load (« n tâches terminées sur m », `ProgressMeter`, active tasks only). A manager of the project (`canAssignMembers`)
  changes a role (select per member), removes a member after confirmation (their tasks of the project are unassigned by
  Project API) and adds an agent of the page options with a role. The owner (the project's responsible) is marked
  « Responsable du projet » and offered neither removal nor role change; a BFF 409 on them is explained. A status line
  confirms each change, a refusal shows « Équipe non modifiée ».
- **Documents** (C2): no backend stores documents yet: the tab is an « unavailable » panel.
- **Activité** (C3, Figma F10): « Commentaire » + « Publier » (Ctrl + Entrée), 1 to 2000 characters once trimmed, no
  `<` / `>`; then the whole history (comments and task changes, newest first), 20 per page with the lib `Pagination`,
  read once the tab is shown. A published comment reads the history again from the first page (and the overview).

## Closed project, read-only

A closed project (« Terminé », `done`) is read-only. Its page shows the banner « Projet clôturé — lecture seule. » under
the description; « Modifier », « Nouvelle tâche », « Modifier » of « Plus d’actions », the task edits, the milestones,
the team and the Kanban moves are gone, while the tasks, the activity and the milestones stay readable and Dupliquer /
Supprimer stay. Its managers (`permissions.canReopen` of BFF_Project) get « Rouvrir », a menu « Rouvrir le projet en »
(À faire, En cours, En revue, Suspendu) that PATCHes the chosen status; the card menu offers the same choice and a
closed card can be dragged out of « Terminé » by them only. A write refused because the project is closed (BFF `409`
`Project is closed.`) reads « Ce projet est clôturé : il est en lecture seule. Rouvrez-le pour le modifier. »

## Projects list

- Header: title, subtitle, then « Paramètres » and « Nouveau projet » (when allowed). No access scope tag and no
  template management on the list.
- Filters without labels above them: search « Rechercher un projet, une étiquette… », « Tous les statuts », « Toutes
  les priorités » and « Échéance » (En retard / Ce mois-ci / Plus tard, read in the instance day and sent as the
  inclusive `dueBefore` / `dueAfter` bounds of `GET /projects-page`), « Effacer » while one is set.
- Views Kanban / Tableau / Grille; Kanban columns À faire, En cours, En revue, Terminé, Suspendu (`on-hold`), whatever
  the order the BFF lists them in. Projects show their key as `PRJ-<n>` (display only). Cards (Kanban, grid) show the due date as « 30 mars 2027 » (MAIR-1254); the table and the sheet keep « 30/03/2027 ». The list spans the full width.
