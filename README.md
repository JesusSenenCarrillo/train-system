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

## Docker Compose
```bash
docker compose up --build
```

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
