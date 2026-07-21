# Train System Nx Monorepo

Este proyecto es una demo full-stack para un sistema de replanificación ferroviaria con Nx, Angular, NestJS y PostgreSQL.

## Requisitos
- Node.js 22+
- npm 10+
- Docker + Docker Compose (opcional)

## Instalación local
```bash
npm install
npm run start:backend
npm run start:frontend
```

For local backend runs, create or edit `.env.local` in the repo root with `DB_HOST=localhost`.

## Docker Compose
```bash
docker compose up --build
```

Docker Compose keeps using the existing `.env` values, so it can still point the backend at the containerized `postgres` service.

## Endpoints principales
- GET /api/routes
- GET /api/trains
- GET /api/stations
- POST /api/incidents
- POST /api/reroute
- GET /api/reroute/:id

## Seed
```bash
npm run seed
```
