# Projects

The **Projects** module of the project — responsible for managing the projects of the Mairie 360 application.

## 🚀 Getting Started

This project is fully containerized for development. You’ll only need **Docker** and **Docker Compose** installed.

## Contrat BFF

Le contrat Backend For Frontend attendu pour ce module est documenté dans [README_BFF.md](./README_BFF.md).

## JWT BFF

Les appels front vers les routes du BFF renvoient automatiquement le JWT stocké dans `localStorage` sous la clé commune `mairie360.auth.jwt`.

### 🐳 Run in Development Mode (with Hot Reload)

1. Make sure Docker and Docker Compose are installed.
2. Start the development environment:

```bash
docker compose up --build --watch
```

1. Open your browser at [http://development.mairie360.fr](http://development.mairie360.fr) to access the application.

Changes to your code will automatically trigger a refresh or the rebuild of the affected services.
