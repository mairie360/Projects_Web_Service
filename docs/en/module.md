
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
