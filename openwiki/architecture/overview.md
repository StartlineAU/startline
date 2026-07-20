---
type: Reference
title: Architecture
description: Three-portal architecture of the Startline platform — athlete site, organiser portal, and admin portal — built with Next.js 15 App Router and hosted on AWS Amplify.
tags: [startline, architecture, nextjs, app-router, portals, aws-amplify]
resource: /middleware.ts
---

# Architecture Overview

Startline uses a single Next.js 15 codebase with **three portals** served under different domains via middleware-based routing.

## Portal Structure

| Portal | Domain | App Route Directory | Purpose |
|---|---|---|---|
| **Athlete Site** | `startlineau.com` | `/app/(user)/` | Public event browsing, search, registration, reviews |
| **Organiser Portal** | `organiser.startlineau.com` | `/app/organiser/` | Event management, onboarding, listings, payments, dashboard |
| **Admin Portal** | `organiser.startlineau.com/admin` | `/app/admin/` | Event approval, organiser management, analytics, audit log |

The organiser landing page (`/organiser-landing/`) is served at the root of the organiser domain via URL rewriting in `middleware.ts`.

## Domain Routing

Routing between portals is handled by [middleware.ts](/middleware.ts). In **production**, the middleware inspects the `Host` header and routes requests accordingly:

- `startlineau.com` → athlete site (default)
- `organiser.startlineau.com` → organiser portal, with `/` rewritten to `/organiser-landing`
- Protected paths (defined in `ORGANISER_PROTECTED` and `ADMIN_PROTECTED` arrays) require valid Cognito JWT tokens

In **development mode** (`NODE_ENV=development` or `NEXT_PUBLIC_AUTH_BYPASS=true`), all domain checks are skipped and everything runs on `localhost:3000`. This also enables auth bypass for PR previews on Amplify.

## Hosting & Build

- **Hosting**: AWS Amplify with `standalone` output mode (`next.config.ts`)
- **Build spec**: Defined in Terraform (`terraform/main.tf`) — runs `pnpm install`, `prisma generate`, fetches secrets from AWS Secrets Manager, runs migrations, seeds (non-prod only), then builds
- **Output**: Standalone `.next` directory deployed by Amplify

## Key Infrastructure Components

- Docker Compose for local development: PostgreSQL 15 (`:5432`), Mailpit (SMTP `:1025`, UI `:8025`), app (`:3000`), Prisma Studio (`:5555`)
- Git worktrees for parallel development — Docker infra runs on the main checkout only
- Content security policy configured in `next.config.ts` — Stripe scripts white-listed

## Related

- [Auth System](/openwiki/auth/overview.md) — how middleware protects routes with Cognito
- [Domain & Data Model](/openwiki/domain/data-model.md) — entities that flow through the portals
- [Infrastructure & CI/CD](/openwiki/infrastructure/terraform.md) — Terraform provisioning and deployment
