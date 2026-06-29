# README BFF - Module Projets

Ce document décrit le BFF attendu pour alimenter le front du module **Projets** de Mairie360.

Le rôle du BFF est de préparer les données dont le front a besoin pour afficher la page Projet, ses trois vues **Kanban / Grille / Table**, les filtres, les fiches projet et les tâches. Le front doit recevoir des objets prêts à consommer, sans devoir reconstruire les agrégats métier ou appeler plusieurs APIs pour une seule interaction.

## Objectifs

- Fournir un contrat unique entre le front Projects et les APIs métier.
- Normaliser les statuts, priorités, assignés, étiquettes et dates.
- Préparer les agrégats utilisés par les cartes projet : progression, total de tâches, tâches terminées.
- Retourner les options nécessaires aux selects : statuts, priorités, membres, étiquettes.
- Centraliser les droits d'action : créer, modifier, dupliquer, supprimer, ajouter ou modifier une tâche.
- Exposer une spec OpenAPI pour générer les types TypeScript côté front via `@mairie360/bff-project-openapi`.

## Sources de données possibles

Le BFF peut agréger plusieurs services :

- API Project : projets, tâches, statuts, priorités, échéances.
- API Core : utilisateur courant, permissions, mairie active.
- API Users / Directory : membres assignables et avatars.
- API Documents, si nécessaire plus tard : pièces jointes liées aux projets ou tâches.

Le front ne doit pas appeler ces APIs directement. Il appelle uniquement le BFF.

## Endpoints techniques déjà présents

```http
GET /health
GET /check_apis
```

Ces endpoints servent uniquement à vérifier la santé du BFF et sa connexion aux APIs amont.

## Endpoint principal de la page Projet

```http
GET /projects-page
```

### Query parameters

| Paramètre | Type | Exemple | Description |
| --- | --- | --- | --- |
| `q` | string | `archives` | Recherche dans le titre, la description et les labels. |
| `status` | enum | `todo` | `all`, `todo`, `in-progress`, `review`, `done`. |
| `priority` | enum | `high` | `all`, `high`, `medium`, `low`. |
| `view` | enum | `kanban` | `kanban`, `grid`, `table`. |
| `page` | number | `1` | Page courante pour la vue table ou grille. |
| `limit` | number | `50` | Nombre de projets retournés. |

### Réponse

```json
{
  "page": {
    "title": "Projets",
    "subtitle": "Gérez vos projets municipaux avec des vues Kanban, tableau et grille",
    "defaultView": "kanban",
    "views": [
      { "value": "kanban", "label": "Kanban" },
      { "value": "grid", "label": "Grille" },
      { "value": "table", "label": "Table" }
    ]
  },
  "filters": {
    "search": "archives",
    "status": "all",
    "priority": "all",
    "statuses": [
      { "label": "Tous les statuts", "value": "all" },
      { "label": "À faire", "value": "todo" },
      { "label": "En cours", "value": "in-progress" },
      { "label": "En révision", "value": "review" },
      { "label": "Terminé", "value": "done" }
    ],
    "priorities": [
      { "label": "Toutes les priorités", "value": "all" },
      { "label": "Haute", "value": "high" },
      { "label": "Moyenne", "value": "medium" },
      { "label": "Basse", "value": "low" }
    ]
  },
  "options": {
    "members": [
      { "label": "Marie Dubois", "value": "user-1", "name": "Marie Dubois", "avatarUrl": null },
      { "label": "Pierre Martin", "value": "user-2", "name": "Pierre Martin", "avatarUrl": null }
    ],
    "labels": [
      { "label": "Infrastructure", "value": "Infrastructure" },
      { "label": "Urgent", "value": "Urgent" }
    ]
  },
  "summary": {
    "totalProjects": 6,
    "projectsByStatus": {
      "todo": 2,
      "in-progress": 2,
      "review": 1,
      "done": 1
    },
    "projectsByPriority": {
      "high": 3,
      "medium": 2,
      "low": 1
    }
  },
  "kanban": {
    "columns": [
      { "status": "todo", "label": "À faire", "projectIds": ["project-2", "project-6"], "count": 2 },
      { "status": "in-progress", "label": "En cours", "projectIds": ["project-1", "project-5"], "count": 2 },
      { "status": "review", "label": "En révision", "projectIds": ["project-4"], "count": 1 },
      { "status": "done", "label": "Terminé", "projectIds": ["project-3"], "count": 1 }
    ]
  },
  "projects": [
    {
      "id": "project-1",
      "title": "Rénovation de la bibliothèque municipale",
      "description": "Modernisation de l'espace lecture et installation de nouveaux équipements numériques",
      "status": "in-progress",
      "statusLabel": "En cours",
      "priority": "high",
      "priorityLabel": "Haute",
      "responsible": {
        "id": "user-1",
        "name": "Marie Dubois",
        "avatarUrl": null
      },
      "assignees": [
        { "id": "user-1", "name": "Marie Dubois", "avatarUrl": null },
        { "id": "user-2", "name": "Pierre Martin", "avatarUrl": null }
      ],
      "labels": ["Infrastructure", "Urgent"],
      "progress": 65,
      "dueDate": "2024-12-15",
      "createdAt": "2024-09-01T08:00:00.000Z",
      "tasks": {
        "total": 12,
        "completed": 8
      },
      "permissions": {
        "canView": true,
        "canEdit": true,
        "canDuplicate": true,
        "canDelete": true,
        "canCreateTask": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 6,
    "hasNextPage": false
  }
}
```

## Détail d'un projet

```http
GET /projects/{projectId}
```

Cet endpoint est appelé quand le front ouvre une carte projet ou clique sur `Modifier`. Il doit retourner le projet complet avec ses tâches.

```json
{
  "project": {
    "id": "project-1",
    "title": "Rénovation de la bibliothèque municipale",
    "description": "Modernisation de l'espace lecture et installation de nouveaux équipements numériques",
    "status": "in-progress",
    "priority": "high",
    "responsible": { "id": "user-1", "name": "Marie Dubois", "avatarUrl": null },
    "assignees": [
      { "id": "user-1", "name": "Marie Dubois", "avatarUrl": null },
      { "id": "user-2", "name": "Pierre Martin", "avatarUrl": null }
    ],
    "labels": ["Infrastructure", "Urgent"],
    "progress": 65,
    "dueDate": "2024-12-15",
    "createdAt": "2024-09-01T08:00:00.000Z",
    "tasks": { "total": 12, "completed": 8 },
    "permissions": {
      "canEdit": true,
      "canDelete": true,
      "canCreateTask": true,
      "canEditTask": true
    }
  },
  "taskItems": [
    {
      "id": "task-1",
      "title": "Préparer le dossier administratif",
      "status": "done",
      "statusLabel": "Terminé",
      "priority": "high",
      "priorityLabel": "Haute",
      "responsible": { "id": "user-1", "name": "Marie Dubois", "avatarUrl": null },
      "assignees": [
        { "id": "user-1", "name": "Marie Dubois", "avatarUrl": null },
        { "id": "user-2", "name": "Pierre Martin", "avatarUrl": null }
      ],
      "labels": ["Infrastructure"],
      "dueDate": "2024-12-15",
      "completed": true,
      "createdAt": "2024-09-01T08:00:00.000Z",
      "updatedAt": "2024-09-03T11:30:00.000Z"
    }
  ]
}
```

## Mutations projet

### Créer un projet

```http
POST /projects
```

```json
{
  "title": "Aménagement du parc central",
  "description": "Installation de nouveaux jeux pour enfants et création d'un parcours santé",
  "status": "todo",
  "priority": "medium",
  "responsibleId": "user-2",
  "assigneeIds": ["user-2", "user-4"],
  "labels": ["Espaces verts", "Loisirs"],
  "dueDate": "2025-03-20",
  "taskItems": [
    {
      "title": "Cadrer le besoin avec les services",
      "status": "todo",
      "priority": "medium",
      "assigneeIds": ["user-2"],
      "labels": ["Espaces verts"],
      "dueDate": "2025-03-20"
    }
  ]
}
```

Réponse attendue : `201 Created` avec le même format que `GET /projects/{projectId}`.

### Modifier un projet

```http
PATCH /projects/{projectId}
```

Le payload accepte les mêmes champs que la création, mais tous les champs sont optionnels.

Réponse attendue : `200 OK` avec le projet recalculé.

### Dupliquer un projet

```http
POST /projects/{projectId}/duplicate
```

Le BFF doit créer un nouveau projet avec :

- un nouvel `id`,
- un nouveau `createdAt`,
- le titre suffixé avec `(copie)` si aucun titre n'est fourni,
- des tâches copiées avec de nouveaux IDs.

### Supprimer un projet

```http
DELETE /projects/{projectId}
```

Réponse attendue : `204 No Content`.

## Mutations tâche

### Ajouter une tâche

```http
POST /projects/{projectId}/tasks
```

```json
{
  "title": "Informer les habitants",
  "status": "todo",
  "priority": "medium",
  "responsibleId": "user-2",
  "assigneeIds": ["user-2", "user-4"],
  "labels": ["Communication"],
  "dueDate": "2025-03-20"
}
```

Réponse attendue : `201 Created` avec :

- la tâche créée,
- le résumé projet recalculé : `tasks.total`, `tasks.completed`, `progress`.

### Modifier une tâche

```http
PATCH /projects/{projectId}/tasks/{taskId}
```

Même payload que la création, champs optionnels.

Réponse attendue : `200 OK` avec la tâche modifiée et le résumé projet recalculé.

### Changer le statut d'une tâche

```http
PATCH /projects/{projectId}/tasks/{taskId}/status
```

```json
{
  "status": "done"
}
```

Le BFF doit synchroniser :

- `completed = true` si `status = done`,
- `completed = false` pour les autres statuts,
- la progression du projet.

### Supprimer une tâche

```http
DELETE /projects/{projectId}/tasks/{taskId}
```

Réponse attendue : `204 No Content` ou `200 OK` avec le résumé projet recalculé.

## Modèles de données

### Enums

```ts
type ProjectStatus = 'todo' | 'in-progress' | 'review' | 'done';
type ProjectPriority = 'high' | 'medium' | 'low';
type ViewMode = 'kanban' | 'grid' | 'table';
```

### Personne assignable

```ts
type Person = {
  id: string;
  name: string;
  avatarUrl: string | null;
};
```

### Projet pour carte / table / kanban

```ts
type ProjectListItem = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  statusLabel: string;
  priority: ProjectPriority;
  priorityLabel: string;
  responsible: Person;
  assignees: Person[];
  labels: string[];
  progress: number;
  dueDate: string;
  createdAt: string;
  tasks: {
    total: number;
    completed: number;
  };
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDuplicate: boolean;
    canDelete: boolean;
    canCreateTask: boolean;
  };
};
```

### Tâche

```ts
type ProjectTask = {
  id: string;
  title: string;
  status: ProjectStatus;
  statusLabel: string;
  responsible: Person;
  assignees: Person[];
  priority: ProjectPriority;
  priorityLabel: string;
  labels: string[];
  dueDate: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
};
```

## Règles de préparation côté BFF

- Les dates envoyées au front sont au format ISO. Pour les champs `input[type="date"]`, le front utilise la partie `YYYY-MM-DD`.
- `progress` est un entier entre `0` et `100`.
- `progress = round(tasks.completed / tasks.total * 100)`. Si `tasks.total = 0`, alors `progress = 0`.
- `tasks.completed` est le nombre de tâches avec `completed = true`.
- Une tâche est considérée terminée si son statut est `done`.
- Le `responsible` doit toujours être inclus dans `assignees` pour un projet.
- Les listes `assignees` et `labels` doivent être dédupliquées.
- Les options de select doivent être triées en français côté BFF.
- Les statuts Kanban doivent toujours être retournés dans cet ordre : `todo`, `in-progress`, `review`, `done`.
- Les textes visibles des statuts et priorités doivent être en français.

## Format d'erreur

Tous les endpoints doivent retourner un format d'erreur stable.

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Le projet demandé est introuvable.",
    "details": []
  }
}
```

Codes recommandés :

- `PROJECT_NOT_FOUND`
- `TASK_NOT_FOUND`
- `VALIDATION_ERROR`
- `FORBIDDEN`
- `UPSTREAM_UNAVAILABLE`

## Mapping avec le front actuel

Le front actuel utilise les champs suivants :

- `projects[]` pour les vues Kanban, Grille et Table.
- `project.tasks.total`, `project.tasks.completed` et `project.progress` pour les compteurs et barres de progression.
- `project.taskItems` ou le résultat de `GET /projects/{projectId}` pour afficher et modifier les tâches.
- `options.members` pour les selects `Assigné principal` et `Assignés`.
- `options.labels` pour le select multiple `Étiquettes`.
- `filters.statuses` et `filters.priorities` pour les filtres de la page.

## Critères d'acceptation

- La page Projet peut s'afficher avec une seule requête initiale `GET /projects-page`.
- Ouvrir une carte projet charge les tâches via `GET /projects/{projectId}`.
- Créer, modifier, dupliquer ou supprimer un projet met à jour les données affichées.
- Ajouter, modifier ou terminer une tâche recalcule la progression et les compteurs du projet.
- Les selects multi-valeurs reçoivent toutes leurs options depuis le BFF.
- Les labels affichés au front sont en français.
- Le front n'a pas besoin d'appeler directement les APIs Core, Project ou Users.
