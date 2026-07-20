---
type: Reference
title: Authentication & Authorisation
description: AWS Cognito-based authentication for the Startline platform — JWT verification, middleware routing, session helpers, and auth bypass modes.
tags: [startline, auth, cognito, jwt, middleware, sessions]
resource: /lib/amplify-server.ts
---

# Auth System

Startline uses **AWS Cognito** for authentication with **JWT verification** via the `jose` library. The only Cognito group is `admins`; authorisation at the record level is handled in Prisma queries.

## Cognito Pool

- Managed via Terraform (per-environment pool in the environment module)
- Production pool with user pool ID and client ID exposed via `NEXT_PUBLIC_COGNITO_USER_POOL_ID` and `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- JWKS endpoint retrieved at runtime from `cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`

## Authentication Flow

1. **Sign-in** through `aws-amplify/auth` (client-side in `SignInModal.tsx`) or Cognito Hosted UI
2. Cognito sets cookies: `LastAuthUser` and `{clientId}.{user}.accessToken`
3. **Middleware** (`middleware.ts`) reads these cookies, verifies the access token JWT using `jose`, and protects organiser/admin routes
4. **Server components** use `getServerSession()` from `/lib/amplify-server.ts` to verify tokens and return session info
5. **Client components** use `AuthContext` from `/context/AuthContext.tsx`

## Middleware Route Protection

Protected path lists defined in `middleware.ts`:

- **`ORGANISER_PROTECTED`**: `/organiser/dashboard`, `/organiser/listings`, `/organiser/profile`, `/organiser/new-listing`, `/organiser/onboarding`, `/organiser/payments`, `/organiser/events`
- **`ADMIN_PROTECTED`**: `/admin/dashboard`, `/admin/events`, `/admin/organisers`, `/admin/reviews`

Unauthenticated access to these paths redirects to `startlineau.com`.

## Auth Bypass

For local development and PR previews, auth can be bypassed by setting `NEXT_PUBLIC_AUTH_BYPASS=true` or `NODE_ENV=development` without a Cognito pool ID. The bypass hard-codes a session as:

- sub: `dev-bypass-organiser`
- email: `organiser@startline.test`
- groups: `["admins"]` — grants both organiser and admin access

## Session Types

`/lib/amplify-server.ts` defines four session types:

| Type | Fields | Use Case |
|---|---|---|
| `ServerSession` | sub, email, groups, phoneNumber?, birthdate? | Raw Cognito token payload |
| `UserSession` | sub (User.id), email, name, phoneNumber?, birthdate? | Athlete site |
| `OrganiserSession` | sub (Organiser.id), email, status, verified | Organiser portal |
| `AdminSession` | sub (Admin.id), email, name | Admin portal |

## Seed Users

Defined in `/prisma/seed.ts`. All share password `Password123!`:

| Email | Role | Notes |
|---|---|---|
| `admin@startline.test` | Admin | In `admins` Cognito group |
| `organiser@startline.test` | Organiser | Linked to "Apex Endurance Events", verified |
| `user@startline.test` | User | No organiser profile |

## Athlete Account Creation

When a guest registers for an event, an athlete Cognito user is created automatically via `/lib/athlete-accounts.ts`. This uses `AdminCreateUser` with a suppressed temporary password, so the athlete can set their password on first login.

## Related

- [Architecture](/openwiki/architecture/overview.md) — how middleware routes and protects portals
- [Domain & Data Model](/openwiki/domain/data-model.md) — User, Admin, and Organiser entities
