# --- Étape 1 : Build ---
FROM node:23-bookworm-slim AS builder
WORKDIR /usr/src/projects
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Étape 2 : Runtime ---
FROM node:23-bookworm-slim AS runner
WORKDIR /app

RUN apt update && apt install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Création d'un utilisateur non-root
RUN useradd --system --uid 1001 nextjs
USER nextjs

# On copie uniquement le dossier standalone et les assets statiques
COPY --from=builder /usr/src/projects/public ./public
COPY --from=builder /usr/src/projects/.next/standalone ./
COPY --from=builder /usr/src/projects/.next/static ./.next/static

# Le serveur standalone génère un fichier server.js
CMD ["node", "server.js"]