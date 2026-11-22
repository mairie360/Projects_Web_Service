# Projects_Web_Service — Module overview

## Project page (MAIR-846)

Opening a project (card, row, « Ouvrir le projet ») shows a **project page** in place of the list, no longer the
project dialog (Figma F5 5.1 to 5.11). The page is addressable: `?project=<id>` (and `&tab=<tab>` past the first
tab) is written into the browser history, so a reload or a shared link comes back to it and Back / Forward
follow it; the list stays mounted behind it, with its filters, view and page.

- **Breadcrumb** « ← Projets / #12 » brings the list back and gives the focus to the opener.
- **Header**: status pill opening the status choice (when the project may be managed), priority, labels, title,
  description; « Modifier », « Nouvelle tâche » (opens « Tâches » and the empty task sheet, MAIR-859) and « … » (Dupliquer;
  Supprimer with the confirmation, then back to the list). A duplication of a project without group shows the
  BFF error (400).
- **Indicators**: Avancement (x/y tâches terminées), Échéance (J-xx, « Aujourd’hui » or the delay, in the
  instance time zone), Budget engagé (« Budget non renseigné »: not in the contract yet), Tâches en retard.
- **Tabs**: Vue d’ensemble, Tâches (count), Planning, Équipe (count), Documents, Activité. The tasks stay mounted
  on every tab, so drafts and pending writes survive a tab change; Planning, Équipe, Documents and Activité have
  their own tickets and show a notice meanwhile. A task link (`&task=<id>`) opens « Tâches » and centres the task.
- **Overview**: « Prochaines tâches » (the three open tasks closest to their due date; checking one marks it
  done), « Jalons » and « Activité récente » (not provided by the contract yet: they say so), « Informations »
  (responsible, start, due date, priority, team, group, budget; a project without group shows « Sans groupe » and
  « Choisissez un groupe dans « Modifier » »), with the lifecycle actions (Suspendre, Clôturer).
- **Edit** (C7): « Modifier » opens the project fields in a size m modal (« Modifier le projet · #12 »); the group
  is required as soon as one can be chosen and cannot be removed. Messages show under the fields before anything
  is sent; only the changed fields are sent (`PATCH`), nothing when nothing changed. The success is the toast
  « Modifications enregistrées ». A `204` (the caller saw the project only through the group just replaced) is a
  saved edit too: back to the list with the same toast.

## Collapsible columns, fixed view switch, transitions (MAIR-1134)

- Every column of the projects Kanban and of the task board folds from the chevron of its header (« Replier la colonne
  Terminé »), « Terminé » included: the lib `KanbanColumn` keeps the width and the header and folds the content in
  280 ms. The choice is remembered per browser (`m360-collapsed-projects`, `m360-collapsed-tasks`); a card can still be
  dropped on a folded column, and the « + » of a folded task column unfolds it for the quick add.
- The view switch (Kanban / Grille / Tableau, and Tableau / Liste in the tasks) has its own row, under the search and
  the filters, aligned left: it never moves.
- Changing the view fades and rises the new one in (260 ms); nothing moves under `prefers-reduced-motion`.
- « Modifier » (pencil) sits under « Ouvrir le projet » in the « … » menu of the cards and of the table rows, and first in
  the « … » of the project page header.
- The page subtitle is « Pilotez les projets de votre mairie ».



The module runs on `@mairie360/lib-components` 2.3.0 as published: white frame (Sidebar and Header), no footer,
the 2.3 visuals (action green, rounded pills, white tags, 12 px cards with their shadow, field focus ring, 14 px
modals, toasts bottom right, dark immediate tooltips, round counter on the bell). The local stylesheet no longer
overrides any of them.

## Sortable lists (MAIR-1138)

The lists sort by a click on a column header (lib `DataTable`): the first click sorts ascending, the second descending,
an arrow marks the sorted column and `aria-sort` says it to assistive technologies. Empty values (no due date, no
assignee) always stay last, whatever the direction. The state follows the business order À faire < En cours (< En
revue) < Terminé, the priority Haute < Moyenne < Basse.

- **Task list** of a project (« Tâches » › Liste): Tâche, État, Priorité, Assignée à, Échéance; sorted by due date
  first. No « Début » column: the published contract has no task start date yet (MAIR-1087).
- **Projects table**: every column but the selection and the actions, with the same rendering and rules.
- The « Équipe » tab does not exist yet (MAIR-874): its sort comes with it.

## Project page: « Tâches » tab (MAIR-859)

The « Tâches » tab of the project page (Figma F6, 6.1 to 6.13) shows the project tasks as a **board** or a **list**.

- **Board** (C1): three columns À faire, En cours (« En revue » tasks too), Terminé, each with its count. A card shows
  the title, the « … » menu, the priority, « En retard » (due date past in the instance day, task not done), the
  assignee and the due date; done tasks are struck through. Done tasks the BFF archived are counted under
  « Terminé » (« + 3 tâches terminées »), not listed (MAIR-559).
- **Drag and drop** (C2): a card dropped on another column changes its status (the project status of that category
  when the project has its own statuses). The card waits in its new column while the BFF answers, then the toast
  « Tâche terminée » or « Statut mis à jour » confirms it and the project progress is the refreshed one; a refusal
  puts the card back in its column, with the error toast « Statut non modifié » and the message on the card. A task
  completed here stays in « Terminé », struck through, after the BFF archived it.
- **Keyboard alternative**: « Déplacer vers » in the card « … » menu (À faire, En cours, Terminé), and « État » in
  the task sheet (every project status).
- **Quick add** (C3): the « + » of a column opens a title field; Entrée adds the task in that column with the
  creation defaults (the signed-in agent as assignee), Échap cancels. Without a known agent the task sheet opens
  with the typed title.
- **Task sheet** (C4, C5): a size m `Drawer` opened by a card (« Ouvrir la tâche »), a list row, or « Nouvelle tâche »
  of the page header (empty sheet). Fields: Titre (required: « Donnez un titre à la tâche » under the field before
  any write), État, Priorité, Assignée à, Échéance, Étiquettes; then the follow-up (comments and history) and
  « Supprimer la tâche » with its confirmation. The published contract has no task description nor start date
  (MAIR-1087 is in progress on the back): the sheet shows neither. A refused save keeps every field.
- **List** (C6): a lib `DataTable` — done checkbox (completes or reopens), task, state, priority, assignee, due date.
- **Search and filters** (C7): search on the title and the labels, « Tous les assignés », « Toutes les priorités »,
  and the Tableau / Liste switch; they filter the loaded tasks (the contract has no task query).

## Project creation V2 (MAIR-836)

Figma F3 3.1 to 3.6 of the Projects mockup.

- « Nouveau projet » is a single-column dialog: Titre*, Description, Statut / Priorité /
  Groupe*, Responsable / Échéance*, Équipe / Étiquettes. A label that is not proposed yet is
  typed in « Nouvelle étiquette » and added with Entrée (it never submits the dialog).
- « Créer le projet » checks the fields first: « Le titre est obligatoire. », « Le groupe est
  obligatoire. », « La date d’échéance est obligatoire. » and, without responsible nor team member,
  « Choisissez un responsable ou un membre de l’équipe. » show under their field, the first
  field in error gets the focus and nothing is sent. Markup (`<`, `>`) in the title or the
  description is refused the same way. Échap, the close button and « Annuler » close without
  creating anything.
- The group hint reads « Tous les membres du groupe verront le projet. Seuls vos groupes sont
  proposés. ». A BFF refusal (a group deleted meanwhile answers 404) shows the error in the
  dialog, which stays open with every field.
- The « + » of a Kanban column opens the dialog with that status (MAIR-829).
- After the creation the first unfiltered page is reloaded, the card shows in its column and the
  toast « Projet créé » names it; the project sheet no longer opens by itself.
- Open point (ticket C5): the mockup has no template picker nor initial tasks; both stay after the
  mockup fields until decided.

## Table selection and bulk deletion (MAIR-833)

Figma F1 1.2 to 1.5 of the Projects mockup.

- Columns: Clé, Projet (with its labels), Statut, Priorité, Responsable, Échéance (« En retard »
  replaces a past due date, which stays readable on hover and by screen readers), Progression,
  actions. Every column but the actions sorts the loaded page, both directions (the contract has
  no sort parameter; projects without a due date stay last).
- A checkbox per row and « Tout sélectionner » in the header (mixed state for a partial
  selection). Projects the agent cannot delete cannot be selected. A selected row gets the
  accent surface; checking a row never opens it.
- While projects are selected, a bar announces « n projets sélectionnés » with « Désélectionner »
  and « Supprimer ». The selection only covers the loaded page and is reset when the page, a
  filter, the search or the view changes.
- « Supprimer » asks « Les n projets sélectionnés et leurs x tâches seront supprimés. Cette action
  est irréversible. » (« Confirmer la suppression »). The front then sends one
  `DELETE /projects/{projectId}` per project (no bulk route in the contract), shows the toast
  « n projets supprimés » naming them and reloads the page. A refused project stays on the page
  and selected, with an error naming it and the BFF reason.

## Project list V2 (MAIR-829)

Figma F1 (Kanban), F2 (grid), F4 (card menu) of the Projects mockup.

- **Card**: project key (`#14`), « … » menu, title (opens the project sheet), two-line
  description, labels, priority, « En retard » when the due date is past in the instance
  time zone and the project is not done, due date, progress, team avatars and
  « x/y tâches ». The grid card also shows the status. The card no longer adds tasks nor
  lists recent ones: tasks are managed from the project sheet.
- **Kanban columns**: the header shows the status, the project count and a « + » that
  opens the creation form with that status. Dropping a card highlights the target column
  and dims the dragged card.
- **Card menu** (« … »): Ouvrir le projet, Dupliquer, « Changer le statut » (single choice
  among À faire / En cours / En revue / Terminé, same PATCH as a drop), Supprimer (with
  confirmation). « Modifier » is gone: the project sheet edits the project. The mockup's
  « Suspendu » status is not in the BFF_Project contract and is not offered.
- A successful status change is confirmed by the lib toast « Statut mis à jour »; a refusal
  keeps the card in place and shows the error.
- A search or a filter without result shows « Aucun projet à afficher » with
  « Réinitialiser les filtres », which reloads the unfiltered page. An empty page without
  filter keeps the empty Kanban columns.

## Project groups (MAIR-880)

Every new project belongs to a **group** whose current and future members see it
(BFF_Project `GET /project-groups`, `groupId` required on `POST /projects`).

- The creation form has a required « Groupe » field listing the groups the agent may
  link. A single group is preselected; with several, the agent must choose
  (« Le groupe est obligatoire. »); with none, the field explains « Aucun groupe
  disponible » and nothing is sent. A refused read is shown on the field.
- The inline edit can move the project to another group. A project created before
  groups (detail `group: null`) keeps no group: the edit then omits `groupId`, since the
  contract refuses `null`.
- When the new group removes the agent's access, BFF_Project saves the change and answers
  `204`: the project leaves the page, its detail closes and a message says it now belongs
  to a group the agent is not a member of.
- The detail shows « Groupe » (or « Aucun groupe »).

## Projects V2 on lib-components 2 (MAIR-828)

The page now pins `@mairie360/lib-components@2.1.0` and draws every reusable
piece from it instead of local copies:

- **Frame:** the lib 2 `AccessibleShell` (desktop navigation band, sidebar only in
  the mobile drawer, full-width footer, logout confirmed in « Se déconnecter ? »).
  The theme is always light (lib MAIR-933): the appearance cookie only keeps the density.
- **Statuses and priorities:** `StatusBadge` / `PriorityPill` with the lib colours
  and labels. The `review` status now reads « En revue » (was « En révision »).
  `project-card-meta.ts` maps project statuses to lib ones (`projectStatusBadge`,
  `projectStatusLabel`); the local colour tables (`statusConfig`, `priorityConfig`,
  `labelColors`, `statusMeta`…) are gone.
- **People and progress:** `Avatar`, `AvatarStack`, `ProgressMeter`, `TagList`.
- **Fields:** `TextField`, `TextArea`, `SelectField`, `MultiSelect` (an always
  visible checkbox list with chips, no more popup) and `DateField`. The text
  constraints (`NO_MARKUP_PATTERN`, `reportMarkupValidity`) are still applied.
- **Page:** `PageHeader` (with `CreateButton`), the toolbar's `SearchField`,
  `FilterSelect` (status, priority), `DateField` and `SegmentedControl`
  (Kanban / grid / table, a radio group), the table view on `DataTable`, the
  pagination on `Pagination` (« 1 – 50 sur 85 projets », « Précédent » / « Suivant »),
  the card menu on `DropdownMenu`, the first paint on `Skeleton` columns.
- **Feedback:** project and task deletions are confirmed in `ConfirmModal`. A write
  whose receipt is unconfirmed stays an `ErrorAlert` with its verification button
  (it lasts until the verification answers, so it is not a toast).

No BFF call or contract changes.

## Security scan scope (ZAP rule 10031)

ZAP rule 10031 flags a URL parameter value found in an HTML attribute. `view`,
`status` and `priority` only accept the enum values of `src/lib/project-page-query.ts`
(`grid` is also a Tailwind class on every page, and the filter values are the
selected options), so the root URL whose query holds nothing but those enum values
is out of scope for that rule in `.zap/rules.tsv`. Every other URL and parameter
(search text, page, any unknown value) is still scanned by 10031;
`tests/zap-rules.test.cjs` pins that scope and fails if the contract enums change.

## Per-project task statuses and project templates (MAIR-567)

Each project has its own task statuses (name, colour, category To do / In
progress / Done, order), read from `GET /projects/{projectId}/statuses`. The
project sheet shows the Kanban columns and status selectors built from them. Managers (Responsable) and administrators can add,
rename, recolour, recategorise, reorder or delete a status (deletion asks for the
target status of its tasks), and manage project templates; creating a project can
start from a template whose statuses are previewed first. Every write waits for a
confirmed receipt and a re-read; an unverified write keeps the draft and asks for
a fresh read.

Reads stay minimal (MAIR-526): the sheet passes the tasks of the detail it already
loaded, so opening a project reads `GET /projects/{projectId}` once, then the
statuses and archived tasks once.
Write preflights and confirmations always read the current detail.

Workflow writes go through the page controller (MAIR-570) and share the task
write guards: a task move is refused while that task has a write in flight or
awaits verification, statuses are not saved while a task write of the project is
in flight, and no task write (status, edit, deletion, creation) starts while the
project statuses are being saved. Such a refusal sends nothing and is shown as a
plain message, not as an unverified write; after a confirmed write the controller
re-reads the sheet and the page.

Since MAIR-859 the tasks are moved on the three-column board of the « Tâches »
tab (one column per category, the move takes the project's first status of that
category); the statuses panel only reads the statuses (the sheet's « État ») and
lets the managers set them up. A new task without an explicit choice takes the
project's first status of its category; the list checkbox moves a task to the
first « Terminé » status, or back to the first « À faire ».

## Keyboard entry from Table (MAIR-310)

Every Table project title is a named native button announcing its detail dialog.
Tab exposes visible focus; Enter/Space or a pointer click invoke the existing
detail callback once, without bubbling into the row. Clicking elsewhere on an
authorized row remains available; action-menu controls remain independent.
An explicit received `canView: false` disables both title and row opening,
without changing server permissions or unrelated menu permissions. The existing
named dialog, keyboard containment, Escape/Close and return to a still-present
opener remain unchanged. Refused GETs do not fabricate a detail; deliberate retry
still uses the published GET. No API/BFF/contract/environment change is required.

## Functional stabilization composition (6 October 2026)

This candidate retains the functional work covered by the existing project,
task, draft, read-recovery, pagination and packaging tickets. It composes the
independent nested-task identity correction without the deferred table-keyboard
entry and task-picker naming/focus commits. Those RGAA tickets remain open;
their historical mixed candidate is not rewritten or considered delivered.
Main's published CI4.1.1 reference and version input are adopted without RGAA
parameters or weakened checks. The existing Node24.21.0 packaging and blocking
scanner jobs are retained. Protected integration and exact-main/current-local
verification remain required; this composition is not a deployment or proof
of backend authorization, persistence or global accessibility.

## Text constraints from the BFF contract (MAIR-514)

The BFF refuses `<` and `>` in every project, task and comment text, and a comment
holds at most 2 000 characters. The project title, description, task titles and
comment inputs now carry those rules, so the browser refuses the value with a
French hint before any request. When the BFF still answers 400 with field details,
the alert lists the refused fields ("Titre : ne doit pas contenir les caractères
< ou >") instead of a generic message; a specific BFF message is kept as is.

## Task primary-assignee ownership (MAIR-408)

Nested project tasks and the project-detail task form deduplicate assignees
without sorting IDs. New selections retain their first selected member as the
primary. Editing initializes with the received responsible first, then the
other supplied assignees, even if their array places that responsible elsewhere
or does not repeat it. Editing unrelated fields or adding another member does
not reassign the task. Explicit removal selects the next remaining member;
clearing every selection retains the existing project-responsible fallback.
The existing payload uses the resolved order, with no local task IDs. These
frontend rules do not change backend authorization or assignment policy.

## Nested-task deadline ownership (MAIR-408)

A new task with no date choice follows the project's current deadline, including
after typing its year through intermediate native values. Choosing a task date
or explicitly clearing it makes that date independent of later project edits.
Editing an existing task preserves its own date (including an empty date), ID
and creation date. Canceling that edit starts a new unchosen date default without
altering the existing task. Already-added tasks do not follow later project-date
changes. The submitted contract body contains only the resolved string dates;
no private default marker or local task identity is transmitted.

## Independent nested task drafts (MAIR-408)

The project form allocates each new nested task a local identity distinct from
all tasks already in that form, including when the clock repeats or moves
backwards. Toggling or editing one task does not affect another task; editing
retains its identity and creation date. These are presentation-only keys, not
server identities: the existing project payload still sends task fields without
local IDs. Received task identities, write guards, permissions and canonical
confirmation rules remain unchanged. No API/BFF/contract change is required.

## Uncertain new-task receipts (MAIR-408)

Task creation from a card or the detail verifies a non-empty ID distinct from
task IDs observed for that project before dispatch and previously confirmed
creations. A never-consulted card first reads a coherent detail baseline via the
existing GET; unavailable, foreign or repeated-ID baseline sends no POST and
retains the retryable draft. A concurrent detail read may already show the legitimate new ID;
that alone is not a collision. An accepted incoherent receipt never replaces
an existing task or invents counters. The task draft is retained, including
later input edits, across closing/reopening and view remounts for this page's
lifetime. Pending creation is guarded per project, including its follow-up GET;
a skipped callback rejects rather than clearing another form's draft.

Persistent accessible feedback disables only new task creation in that project.
Existing task edits/status/deletion and other projects remain independent of
that uncertainty and still obey received permissions. A guarded inspection
uses the existing project detail GET; refused, foreign or repeated-task details
cannot replace the displayed tasks. Coherent inspection applies received data,
but neither a successful GET nor a matching title identifies the accepted
creation. The warning and POST guard remain: Project0.4.0 has no creation-request
correlation for an empty/reused task ID. There is no automatic mutation replay,
durable recovery after reload, invented identity or API/BFF/environment change.

## Read-only recovery of a distinct new receipt (MAIR-408)

When an accepted creation/copy identifies a distinct new project but supplies
incoherent task IDs, keep that receipt's ID and offer a guarded detail GET. A
coherent matching detail (including a current consultation of that project)
resolves only its captured uncertainty and applies the received data. Refusal,
foreign/duplicate-task details or an abandoned consultation cannot resolve it.
Earlier reads do not clear a later receipt. Two accepted new writes claiming one
pending ID lose that attribution; neither can be confirmed from a matching row.
Known, empty or source-ID collisions still offer catalogue-only inspection and
remain uncertain. No field/title matching or mutation replay is used.

After creation verification, the open form keeps its latest fields and unsent
nested task but remains unable to POST. Its verified feedback receives focus;
explicit Close dismisses this accepted creation draft before a new blank form.
A recovery after closing never reopens the form or replaces another editor or
consultation. A verified copy releases only its source for a new deliberate
duplication; the verification itself performs no write. Page totals/options
remain server page data, not inferred from the new card. These are page-lifetime
frontend guarantees, not backend persistence/session durability or proof of
global uniqueness. Existing Project0.4.0 client, contract and API/BFF are unchanged.

## Uncertain creation and duplication receipts (MAIR-408)

Before inserting a new project, the front checks its non-empty ID against IDs
already observed before dispatch (including a duplication's source), and
requires unique non-empty task IDs. An incoherent accepted response does not
replace any existing card/detail or discard the creation draft. Repeated creation
or duplication of that source cannot send another POST. Unrelated project edits
remain independent; closing and reopening creation retains its known draft.
An intervening GET may legitimately display this request's new project before
its POST response arrives; that observation alone is not a collision. An ID
already confirmed by another creation/duplication still cannot be reused.
The creation warning receives focus when the accepted write finishes; later
catalogue retries do not steal focus from continued draft editing.
Blocked form submission is visually muted. Kanban/grid/table keep a disabled
“Copie à vérifier” source action, distinct from pending duplication, without
altering the received server permissions or blocking other projects.

Persistent feedback offers a guarded catalogue GET, never a write replay. A
successful catalogue or matching submitted fields cannot identify an accepted
creation whose receipt reused an existing ID: the published contract has no
request correlation/idempotency receipt for this case. The warning stays honest,
without inventing a new ID or confirming another user's similarly titled row.
This is page-lifetime protection, not durable recovery across browser reloads.
Distinct new IDs with incoherent nested tasks now use the qualified detail-GET
recovery described above; catalogue-only recovery does not complete that case. Unknown
remote IDs never seen by this page cannot be certified globally unique by a
consumer. No client/contract/API/BFF or environment changes are introduced.

## Existing-project receipt identity (MAIR-408)

Inline/card edits, Kanban status changes and close/review verify the requested
project ID and unique non-empty task IDs before applying a successful receipt.
An incoherent accepted response never replaces another card, the current detail
or the retained draft. Its target remains explicitly unverified and these project
writes cannot be repeated until a coherent GET of that project succeeds.

Accessible recovery remains in the card form, detail and persistent workspace
notice after closing. Verification sends one GET, not another write, and preserves
the current draft. Failed/foreign reads and catalogue refreshes cannot clear
uncertainty. Reads begun before the uncertain receipt cannot unlock it; unrelated
projects and newer detail selections remain independent. Received edit/close
permissions are consumed without changing server access. Creation/duplication
receipt identity and collision handling remain separate work, not certified by
this existing-target guard. No client, contract, API/BFF or environment changes.

## Card-form opening lifetime (MAIR-459, MAIR-408)

Each card edit opening owns a distinct transient identity, even for the same
project ID. Obsolete successes and refusals cannot replace another editor, reopen
a dismissed form or overwrite a new creation. Target and loaded fields are
committed together: a waiting replacement cannot silently retarget the form
already displayed. Continuing its draft, closing, creating or submitting
invalidates the pending opening; existing write locks still protect every saved
field. No write is sent by an opening or replayed by its cancellation.
Form-level activity capture includes local nested-task fields that do not yet
update the project draft. A deliberate project-owner change remounts its form
to prevent another project's unsent nested draft from crossing that boundary;
ordinary same-owner updates keep the form identity and its drafts.

The received detail must identify the requested project and unique task IDs.
An explicitly denied card/detail edit permission or terminal 401/403/navigation
does not supply a stale editor; a newly denied current project closes its older
editor. A current non-terminal read failure preserves the existing displayed-card
fallback with an accessible in-form warning that fresh data could not be read.
This is frontend consumption of existing permissions, not a server access change.
Published Project0.4.0, clients, authentication and environments are unchanged.
The preserved prototype's unguarded opening is an inherited gap; correcting it
does not certify deployed rights/persistence or complete the broader module audit.

## Project/task confirmation ordering (MAIR-408)

Existing-target project edits (detail and card), Kanban moves and close/review
requests capture the current task confirmation revision before sending their
unchanged contract operation. Their late responses retain actual task receipts
and deletion tombstones confirmed since that revision. An intervening coherent
GET may refine or remove those tasks; that official result is retained too.
The per-task journal keeps only its latest value, not a log of every write.
Project metadata, permissions and statistics still come from the project DTO;
no counter is inferred from the partial task overlay. Mixed-age detail exposes
an explicit GET-only recovery without replaying either accepted write, and
catalogue refreshes keep the newer tasks until coherent detail reconciliation.
Project writes begun after a task confirmation remain authoritative over it.
Creation and duplication do not inherit source task history. Closed, reopened
or replaced consultation lifetimes and existing form guards remain unchanged.

This corrects a candidate receipt-mixing regression, not identical behavior in
the preserved prototype that waited for detail reads. Published Project0.4.0,
API/BFF, authentication, dependencies, environments and old local versions are
unchanged; fixture checks do not certify deployed persistence or all audit items.

## Task and detail identity (MAIR-408)

Editing/status receipts must identify the requested task. A successful write
with an inconsistent receipt is not a refusal: no unrelated row is replaced,
and the affected task is protected until a coherent detail read verifies it.
One verification GET is attempted; failure offers explicit GET-only recovery,
never a replay of the accepted write. Drafts and other task actions remain
available under the existing shared saving-form locks. Detail reads must name
the requested project and contain unique, non-empty task IDs. Inconsistent or
older reads cannot replace the consultation or release uncertainty. A later
coherent read, including reopening the project, restores official data and
unlocks its affected tasks without changing contract operations or server data.
Verification does not certify that the service applied the user's submitted
values; inspect the authoritative returned data before another action.

## Pending task writes (MAIR-408)

Status, deletion and editing of the same existing task share a synchronous
project/task guard through confirmation and follow-up reads. Repeated or
conflicting commands cannot submit a second write while it is active; other
tasks and projects remain independent. The affected row shows an accessible
busy status and disables its mutation controls. An existing edit draft remains
available, but cannot be submitted during another write to that task. A skipped
edit is never treated as a confirmation that could clear its form. Confirmed
deletion removes its row immediately and announces the remaining read activity.
Refusal releases the guard for a deliberate retry; a refused follow-up read
retains the actual confirmed data and offers only GET recovery. Closing and
reopening a detail does not bypass the page-owned guard or reopen an abandoned
consultation. Published contract operations, permissions and authentication are
unchanged; this is not distributed/backend locking or a persistence guarantee.
Write refusals remain visible on their task row, including after reopening the
same project; a new deliberate attempt clears only that task's error. Shared
form locks still protect submitted fields and prevent replacing a saving form.

## Confirmed tasks and detail recovery (MAIR-408)

Accepted creation, editing and status responses keep the normalized canonical
task and its received permissions visible; confirmed deletion removes only its
target. No draft is applied on a refused write. Partial task confirmations do
not recalculate project totals or progress. After a refused detail read, the
dialog explains that those statistics belong to the last successful server read
and offers a guarded keyboard-accessible GET-only retry. Recovery replaces the
detail and server statistics without resubmitting a write. Older task reads cannot
erase newer confirmations; a still-current opening rereads after a task confirmed
while its earlier response was pending. Closed/replaced dialogs stay closed.
The published Project0.4.0 operations and authentication remain unchanged. This
isolated frontend behavior does not certify durable backend persistence.

## Current project detail lifetime (MAIR-408)

Each direct or deep-link opening has its own transient selection identity. A
slower previous success or error cannot replace the current detail. Closing
invalidates that lifetime, including when the same project is reopened. Task
refreshes and confirmed project/lifecycle updates only update the still-current
dialog; intentional creation still opens its confirmed new project. Reads and
accepted writes are not replayed, and existing task drafts, permissions and
keyboard behavior remain unchanged. This corrects inherited selection races,
not the independent task collaboration panel or all backend persistence needs.
Published Project0.4.0, client/proxy/authentication and environments are unchanged.

## Current query after a pending write (MAIR-451)

Implicit post-write catalogue reads use the search, status, priority, deadline,
view and requested page currently displayed, not values captured before a slow
write. Query events update the transient snapshot synchronously; the existing
debounced read still follows the displayed controls. Late-read guards and confirmed
responses remain unchanged. A refused refresh keeps confirmed data and its GET-only
recovery; no accepted write is repeated.

Creation and duplication deliberately clear filters and return to page one after
confirmation, but keep the current view, including when it changed while pending.
This closes a captured-query defect without reproducing old optimistic state or
inventing records, permissions, counters or backend operations. Published Project
0.4.0, authentication, dependencies and environments are unchanged.

## Archived task counts (MAIR-569)

A done task is archived by BFF_Project (MAIR-502): the project detail only lists
the active tasks, while `tasks.total` / `tasks.completed` and the progress still
include the archived ones. Since the published Project contract 1.0.0, each
project also carries `tasks.active` and `tasks.archived` (MAIR-559). The detail
and edit counters show `completed/total` followed by the number of archived
tasks (`3/4 · 3 tâches archivées`), and the edit form keeps counting the archived
tasks when its listed tasks change, instead of recomputing the summary and the
progress from the active tasks alone. The new task status and project template
routes (MAIR-566) are declared by the contract but not used by this front yet.

## Project result pages (MAIR-472)

Previous/Next navigation is shared by Kanban, Grid and Table. The page number,
total and next-page availability come only from validated BFF pagination metadata;
the partial received array is not a global count. A page click sends one existing
GET with the current filters. Search, status, priority and deadline changes reset
to page one; view changes preserve the requested page. Pending reads disable paging
and repeated events, and late responses cannot overwrite a newer query or confirmed
mutation. A refused or inconsistent read retains the last confirmed page and exposes
an explicit GET-only retry for the requested page. No mutation is replayed.

Both the preserved prototype and the prior front lacked paging controls and always
requested page one: this is an inherited gap correction, not historical reference
parity. The existing published 0.4.0 operation is unchanged. No environment, dependency,
API/BFF, permission or deployment change is required. Fixture validation does not
certify the deployed service's results or persistence; integration still requires CI.

## Reopening the protected page after a redirect (MAIR-408)

When a read or action receives an opaque redirect, the frontend reopens the
current protected document once. Existing middleware owns the Login destination
and return path, not the data request. An aborted read does not navigate and an
action is never replayed automatically. A real 401 keeps existing local logout;
403, unavailable-service and network errors do not become authentication errors.
No API/BFF or authentication-route behavior changes. Deployed authentication,
server revocation and durable data remain outside this isolated verification.

## Current session instead of stale local tokens (MAIR-408)

Project reads and actions no longer use stored browser JWTs. The existing
same-origin cookie session remains the sole automatic credential source through
the unchanged proxy. Legacy storage is neither read nor migrated by requests;
its existing logout cleanup is preserved. This frontend slice does not prove
deployed authentication, server-side revocation or business-data persistence.

## Active-module navigation

The frontend consumer restores the reference sidebar's minimum 44px targets
and separating shadow without copying shared navigation. In the mobile drawer,
the sidebar stays below the published Close button; its keyboard and focus
behavior remain owned by AppShell. No saved appearance preference, user identity
or fictitious version is supplied by this styling (MAIR-180).

Desktop and mobile menus omit the archived E-mails and Files modules, matching
the local presentation. The remaining module order and administrator visibility
are unchanged; Settings remains available through the shared AppShell.
Attachments and business documents inside active modules are not removed.

## One account destination

Profile access now opens **Settings**. Existing `/profile` bookmarks and subpaths
redirect to the configured Settings frontend for authenticated visitors. The
sidebar keeps Settings without a duplicate Profile entry. If Settings is not
configured correctly, those bookmarks return an uncached 503; no demo identity
or simulated save is shown.

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Enable municipal project and task tracking through Kanban, grid and table views. Data and permissions come from BFF Project.

## Audience and value

Staff, project managers and administrators.

Business domain: Projects and tasks.

## Available capabilities

- Project search, filtering, pagination and view switching.
- The page and shared navigation use the reference's default 17px root scale and system font; the header remains rem-based (68px by default), and standard small-text tokens are preserved. No saved appearance preference or user identity is simulated.
- The toolbar wraps its view selector when the search and filters need more space, including at wide desktop widths with the reference font scale.
- Project and task creation and editing forms.
- Details, statuses, collaboration and actions available according to BFF permissions.

## Typical workflow

1. Load `/projects-page` from BFF_Project, which also returns the user's role and permissions.
2. Open a project to inspect tasks and allowed actions.
3. Perform a mutation, consume the returned data and reload the relevant context.

## Confirmed task comments

Task follow-up ignores responses for a previously selected or closed task.
A same-project refresh preserves the open follow-up and its unsent draft.
Only one comment submission can be pending; refused writes retain the draft
for retry. A successful POST contributes the actual returned comment immediately,
without inventing its author, identifier or date. If the subsequent GET fails
or temporarily omits that comment, the confirmed entry stays visible once.
The accessible error distinguishes a saved comment from a failed refresh;
**Actualiser le suivi** retries only the read, never the confirmed POST.
Read-only tasks still expose comments/history without a composer.

This is an intentional correction to the inherited reference behavior, tracked
by MAIR-446 / issue #204. No API/BFF, existing client/proxy/route/contract,
dependency, permission or environment change is required. Local copied-state
QA does not certify deployed persistence or authorization.

## Responsive search and filters

Search, status, priority, deadline and view controls stack on phones. Search
has its own row before `xl`; the view toggle joins the toolbar only at `2xl`.
At that boundary, search can shrink below its intermediate-screen minimum
while retaining at least 240px, leaving a gap between deadline and view controls
with the desktop sidebar visible. Search, filtering and view changes retain
their existing behavior; no business data, environment or API/BFF changes.

## Deadline presentation

Project cards, the table, task editors and project details share the same date
formatter. Empty or whitespace-only deadlines display **Sans échéance**;
non-empty malformed or impossible calendar dates display **Échéance invalide**.
Valid `YYYY-MM-DD` dates retain their `DD/MM/YYYY` or `DD/MM` presentation without
time-zone conversion. Formatting never replaces or saves a business date and
does not change the existing task search, filters, permissions or status actions.
There are no new environment variables, dependencies or API/BFF requirements.

## Responsive task headings

Task titles in project details and the project task editor use the available
width on phones; their permitted actions sit on a separate row. Long names,
including unbroken words, wrap rather than overlap controls. From the small
desktop breakpoint, titles and actions share a compact row. Follow, Edit,
delete confirmation and status permissions are unchanged. This presentation
change neither writes data nor requires environment, dependency or API/BFF changes.

## Responsive task follow-up

The Follow panel uses one bounded column on phones and two columns on large
screens. Comment authors, dates, complete messages and history entries wrap,
including unbroken text; comment line breaks are preserved. The comment field
and Send button stack on phones and share a row from the small breakpoint.
Submission, stored text and existing `canComment` permissions are unchanged.
No API/BFF, dependency or environment change is required.

## Keyboard-accessible project forms

New project and card-menu Edit open named modal dialogs. Focus enters the form,
Tab/Shift+Tab stay inside its controls, and Escape or Close dismiss without
saving and restore the still-present opener (the card Actions button after Edit).
Escape first dismisses an open
assignee/label multi-select and returns focus to its trigger, preserving choices.
Creation, editing, permissions and existing published requests are unchanged;
no API/BFF, dependency or environment changes are required.

## Linked task visibility

Since MAIR-846 the project is a page: the linked task opens « Tâches » and is centred with `scrollIntoView`.

A project/task URL highlights and focuses the selected authorized task. Only
the detail body scrolls to the task; the header and Close control stay in place
on desktop and mobile. Later task arrival is handled without pulling the reader
back on an unrelated refresh. Ordinary project navigation still starts at the top.
Invalid or missing targets keep the existing explicit error without a fake detail.
This is a frontend-only change; deployed Dashboard/role acceptance remains separate.

## Detail form scrolling

Superseded by MAIR-846 (the project is a page, its edit a lib `Modal`); kept for history.

The project detail's outer panel clips overflow without becoming a scroll
container. Only its body scrolls when a field receives focus, including during
editing and Tab/Shift+Tab navigation. The title and Close action stay visible
on desktop and mobile; linked-task focus, multi-selects, cancellation and focus
restoration retain their existing behavior. No API/BFF, dependency, business
data or environment change is required.

## Confirmed project recovery and pending forms

Kanban, grid and table retain received projects when a refresh fails, announce
stale page statistics and offer a guarded GET-only retry. Confirmed create,
duplicate and edit responses are applied before refreshing, never replaced
with submitted drafts or undone by an older read. Recovery never repeats a
confirmed write. Duplication protects its source through the write and follow-up
read. New-project/card-edit forms protect fields, nested tasks and keyboard
dismissal while pending, retain drafts after refusal and close only after
confirmation. Native 390×844 fixture QA covered these composed interactions;
see the README for exact evidence and remaining main/deployment gates. The
preserved reference's failed-refresh blank board is deliberately corrected.
API/BFF contracts and permissions are unchanged; fixture data is never published.

## Page and dialog boundaries — MAIR-408

List filters and Kanban/grid/table, project creation/editing, nested task drafts
and detail follow-up keep their existing behavior. State and commands have a
single page-lifetime controller; the view and two dialogs are stable, separate
components. A background view refresh must not reset an open form's nested tasks,
task search or an unsent comment. No new request, permission, data source or
environment setting is introduced. Further detail-workflow audit and integration
remain separate from this structural change.

## Role within Mairie360

Associated repositories: [BFF_Project](https://github.com/mairie360/BFF_Project).

This repository contains the browser interface and its Next.js adapters. The associated BFF supplies business data and coordinates its sources.

## Data and current state

The module combines Project API and PostgreSQL. The SQL repository handles visibility, membership, projects, tasks and collaboration. Comments and some history use `tasks.custom_fields`; status history can come from `task_history`. With `PROJECT_DB_ACCESS=disabled`, collaboration uses an in-memory fallback lost on restart.

## Scope and limitations

Disabling SQL access changes capabilities and persistence; that mode does not validate a full deployment. Public identifiers and statuses are normalized by helpers, while some project fields are derived from tasks.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.


## Shared visual direction — MAIR-547

Approved light option 1: shared tokens and font, accessible navigation, and preserved business layouts. See the [visual QA](../qa/design-qa.md) for evidence, checks, and RGAA limitations.
