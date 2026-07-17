---
name: nestjs-best-practices
description: Apply NestJS backend best practices from official NestJS documentation. USE WHEN implementing or reviewing NestJS modules, DTO validation, configuration, authentication, and authorization.
---

# NestJS Best Practices

Use this skill to enforce backend practices grounded in official NestJS docs.

## Imported official sources

- See `references/OFFICIAL_BEST_PRACTICES.md` for direct source links and imported guidance basis.

## Core practices to apply

- Organize backend by cohesive feature modules and explicit module boundaries (`imports`/`exports`).
- Keep controllers thin; put business logic in providers/services.
- Use DTO classes (not interfaces/type-only imports) for request validation.
- Configure global `ValidationPipe` and prefer secure defaults such as:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`
- Centralize configuration with `@nestjs/config`; keep environment-specific values outside code.
- Implement authentication using dedicated auth modules/services and JWT/session strategy per system requirements.
- Never store plaintext passwords; use one-way salted hashing (for example, bcrypt).
- Implement authorization with guards and explicit metadata/decorators (roles/claims/policies).
- Export only what modules must share; keep internal providers encapsulated.
- Keep security-sensitive material (JWT secrets, credentials) out of source code.

## How to use this skill

When asked to implement or review NestJS code:

1. Follow the official source list in `references/OFFICIAL_BEST_PRACTICES.md`.
2. Apply validation, configuration, auth, and module-boundary practices consistently.
3. Prefer explicit contracts and maintainable module design over ad-hoc patterns.

