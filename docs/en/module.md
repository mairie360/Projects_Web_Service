# Projects_Web_Service — Module overview

## Active-module navigation

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

## Role within Mairie360

Associated repositories: [BFF_Project](https://github.com/mairie360/BFF_Project).

This repository contains the browser interface and its Next.js adapters. The associated BFF supplies business data and coordinates its sources.

## Data and current state

The module combines Project API and PostgreSQL. The SQL repository handles visibility, membership, projects, tasks and collaboration. Comments and some history use `tasks.custom_fields`; status history can come from `task_history`. With `PROJECT_DB_ACCESS=disabled`, collaboration uses an in-memory fallback lost on restart.

## Scope and limitations

Disabling SQL access changes capabilities and persistence; that mode does not validate a full deployment. Public identifiers and statuses are normalized by helpers, while some project fields are derived from tasks.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
