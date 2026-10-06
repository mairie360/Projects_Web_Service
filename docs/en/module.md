# Projects_Web_Service — Module overview

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

A project/task URL highlights and focuses the selected authorized task. Only
the detail body scrolls to the task; the header and Close control stay in place
on desktop and mobile. Later task arrival is handled without pulling the reader
back on an unrelated refresh. Ordinary project navigation still starts at the top.
Invalid or missing targets keep the existing explicit error without a fake detail.
This is a frontend-only change; deployed Dashboard/role acceptance remains separate.

## Detail form scrolling

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
