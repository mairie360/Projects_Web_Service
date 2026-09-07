# Projects_Web_Service — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Enable municipal project and task tracking through Kanban, grid and table views. Data and permissions come from BFF Project.

## Audience and value

Staff, project managers and administrators.

Business domain: Projects and tasks.

## Available capabilities

- Project search, filtering, pagination and view switching.
- Project and task creation and editing forms.
- Details, statuses, collaboration and actions available according to BFF permissions.

## Typical workflow

1. Resolve the session with BFF User and load `/projects-page`.
2. Open a project to inspect tasks and allowed actions.
3. Perform a mutation, consume the returned data and reload the relevant context.

## Role within Mairie360

Associated repositories: [BFF_Project](https://github.com/mairie360/BFF_Project).

This repository contains the browser interface and its Next.js adapters. The associated BFF supplies business data and coordinates its sources.

## Data and current state

The module combines Project API and PostgreSQL. The SQL repository handles visibility, membership, projects, tasks and collaboration. Comments and some history use `tasks.custom_fields`; status history can come from `task_history`. With `PROJECT_DB_ACCESS=disabled`, collaboration uses an in-memory fallback lost on restart.

## Scope and limitations

Disabling SQL access changes capabilities and persistence; that mode does not validate a full deployment. Public identifiers and statuses are normalized by helpers, while some project fields are derived from tasks.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
