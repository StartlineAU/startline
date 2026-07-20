# Startline

Next.js 15 (App Router) fitness event discovery platform. Three portals:

| Route | Domain | Purpose |
|---|---|---|
| `(user)/` | startlineau.com | Public event browsing |
| `organiser/` | organiser.startlineau.com | Event management |
| `admin/` | organiser.startlineau.com | Approvals, org management |

## Development

- **Package manager:** pnpm 11.11.0
- **Dev:** `pnpm dev` (Turbopack). **Build:** `pnpm build` (standalone `next.config.ts`). `@/*` → root.
- **Docker:** PostgreSQL 15 on :5432 + Mailpit (SMTP :1025, UI :8026). Start: `docker compose up -d`.
- **Worktree?** Check via `git worktree list`. If yes, Docker infra runs on main checkout — just `pnpm dev`, no `docker compose up`.
- App runs in Docker as `app` service (port 3000). Prisma Studio as `prisma-studio` service (port 5555).

## Auth (Cognito)

JWT verification in `middleware.ts` via `jose`. Tokens in Cognito-managed cookies. Only Cognito group: `admins`. Authorisation at DB level (Prisma).

Production Cognito pool (managed via Terraform). Users created by `prisma/seed.ts` via `AdminCreateUser` + `AdminSetUserPassword` per seed user, plus `AdminAddUserToGroup` for admin only.

### Account model

Every user has a **User** record (created on first login). Users can optionally create an **Organiser** profile (1:1). Organiser records can be verified (auto-publish events) or unverified (admin approval needed). See `lib/amplify-server.ts` for session helpers.

All seed users share password `Password123!`.

| Email | Notes |
|---|---|
| `admin@startline.test` | Admin (`admins` group) |
| `organiser@startline.test` | User + Organiser (Apex Endurance Events, verified) |
| `user@startline.test` | User only |

Old Cognito users from previous seeds not auto-removed — delete manually or via Terraform reset.

`middleware.ts` routes by hostname in production. Dev mode (`NODE_ENV=development`) skips all domain checks — everything at `localhost:3000`. Protects path lists: `ORGANISER_PROTECTED`, `ADMIN_PROTECTED`.

PostgreSQL 15 via Docker on port **5432**. Prisma ORM, singleton client in `lib/prisma.ts`. Schema targets `rhel-openssl-3.0.x` for Lambda/RHEL.

Mailpit on SMTP **1025**, web UI **8026** for local email testing.

## Design


Connect Express for organiser payouts. Payments via `api/organiser/stripe/`. Money in integer cents. Platform fee (`lib/platform-fee.ts`): 3.95% + $1.45; `feeStructure` determines who absorbs it.

## Environment variables

All secrets in AWS Secrets Manager, loaded by `.envrc` + direnv. **No `.env` file.**

| Secret | Contents |
|---|---|---|
| `startline/ci-bootstrap` | CI/CD bootstrap (amplify PAT, cloudflare token, resend key, DO token, gitleaks license) |
| `startline/prod/app` | Prod env vars (Cognito IDs, Stripe live keys, S3 creds, etc.) |
| `startline/staging/app` | Staging env vars (non-prod Cognito, RDS, S3) — created by Terraform |

`.envrc` at repo root fetches from SM and exports to shell. Hardcoded local constants (Docker Postgres URL, Mailpit SMTP).

**Dev setup:** `brew install direnv`, hook into shell, `direnv allow` in worktree. Or whitelist at `~/.config/direnv/direnv.toml`:
```toml
[whitelist]
prefix = ["/Users/Lachlan/"]
```

**Key rotation:** Update the SM secret, trigger an Amplify rebuild. No code changes, no TF runs.

**CI:** Composite action at `.github/actions/load-env/` — assumes OIDC role, fetches bootstrap + app secrets, exports as env vars. Used by all workflows.

## Git worktrees

All worktrees under `~/.herdr/worktrees/startline/`. Docker infra (PostgreSQL, Mailpit) runs on the main checkout — worktrees connect to it. **Never run `docker compose up` in a worktree.** Just `pnpm dev`.

## Terraform + Amplify CI/CD

Infra in `terraform/`:

Terraform uses a unified state. `main` is the sole source of truth — only pushed to `main` triggers Terraform apply.

| Workflow | Trigger | Scope |
|---|---|---|
| `terraform-plan.yml` | PR to `main` | Plan both environments |
| `terraform-apply.yml` | Push to `main` | Apply both environments |

`ci.yml` runs lint, typecheck, build, test, e2e on PRs (non-blocking, informational). App deploys via Amplify on push to `main` (staging) or `prod` (production) via the `deploy.yml` workflow.

### Environments

Two environments managed by Terraform (`main.tf` → `local.environments`). PR previews enabled on both branches:

| Environment | Branch | Build behavior |
|---|---|---|
| `prod` | `prod` | Migrate, no seed |
| `staging` | `main` | Migrate + seed |
| PR to `main` | preview | Staging resources, auth bypass |
| PR to `prod` | preview | Prod resources, auth bypass |

The `ENV` env var is set per Amplify branch (`prod` → `prod`, `main` → `staging`). PR previews inherit the target branch's `ENV` value. The build spec uses `$ENV` to select the Secrets Manager secret (`startline/$ENV/app`).

## Design system

Authoritative reference at **`design/design.md`**. Consult for any UI work.

Non-negotiables:
- **Dark only.** `color-scheme: dark`. No light surfaces.
- **One accent.** Signal green `#B3E153` (`--color-primary`) only brand hue. Blue/amber/red = status semantics.
- **Chakra Petch for structure, Inter for prose.** Structural chrome = uppercase + wide tracking; body = sentence case Inter.
- **No emoji. Lucide line icons only.**
- **Text on `#B3E153` is always `#141414` (dark ink)** — never white.
- **"Machined" shadow** (`box-shadow: 2px 2px 0 #B3E153`) on single primary CTA per view only.
- **Status labels:** `APPROVED` renders as "Published" to organisers. Use shared status object.

## shadcn/ui

Dark theme only. CSS vars in `app/globals.css`. Primary green `#B3E153`. Use `npx shadcn@latest add <component>` to add. Use `cn()` from `lib/utils.ts` for class merging.

## Next.js

Next.js 15 with Turbopack. `@/*` maps to project root. CSP in `next.config.ts`.

## Testing

```bash
pnpm lint         # ESLint (next lint)
pnpm test         # Vitest unit tests
pnpm test:watch   # Vitest watch mode
pnpm test:e2e     # Playwright (requires Docker PostgreSQL running)
```

- Unit tests in `src/__tests__/`, e2e in `e2e/`.
- Vitest: `globals: true`, `DATABASE_URL` defaults to port 5432.
- Playwright: Chromium, auto-starts `pnpm dev -p 3000`.
- **Every new feature MUST include E2E tests.**

## Playwright CLI (for AI browser automation)

Prefer `playwright-cli` over MCP for browser automation.

```bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
playwright-cli open [url]
playwright-cli snapshot
playwright-cli click <ref>
```

Use `-s=<name>` for isolated sessions (e.g., `-s=customer`, `-s=organiser`). Pass `--headed` for visible browser.

## GitHub

Use `gh` CLI — the MCP `server-github` fails for this private org repo.

**`main` and `prod` are protected.** Never push directly — always use a PR.

### Pre-commit gate

Before staging/committing — run ALL CI checks locally:
```bash
npx prisma generate          # required before typecheck
pnpm lint        # 0 errors, 0 warnings
pnpm typecheck   # 0 errors
pnpm test        # all tests pass
pnpm test:e2e    # all pass (needs Docker PostgreSQL running)
```

### PR conventions

Scan open GitHub issues, link related. Use `Closes #N`, `Fixes #N`, `Related to #N`. Follow `.github/PULL_REQUEST_TEMPLATE.md`. CI runs lint/test/e2e (informational, does not block).

### Issue conventions

Use labels, native issue type (Bug/Feature/Task), Priority/Effort via GraphQL (field IDs in code section below). Use milestone, project, cross-reference related issues.

Configured in `opencode.json`: stripe, resend, aws, cloudflare. Skills listed below.

## README accuracy

`README.md` has several known inaccuracies. Do not treat it as authoritative — cross-reference with this file and the actual codebase:

- **License:** README says MIT, actual `LICENSE` file is All Rights Reserved.
- **Secret name:** README says `startline/nonprod/app`, actual name is `startline/staging/app`.
- **`.envrc`:** README says it exists at root fetching SM secrets — it does not exist in the repo (gitignored). Devs load env vars another way (direnv + local config).
- **Scripts table:** Missing `typecheck`, `prisma:generate`, `test:watch`, `stripe:*`, `start`, `test:registration`, `staging:db:start`.
- **`prisma:migrate`:** README says "Apply Prisma migrations" — the script actually runs `prisma migrate dev` (dev-only, creates migrations), not `prisma migrate deploy`.
- **Site state:** README describes a live event browsing platform; the site is currently in waitlist mode.
- **Admin domain:** Implies three separate domains; admin actually shares `organiser.startlineau.com` as a path prefix.

## Idempotency

- Prisma client singleton in `lib/prisma.ts`.
- Stripe payment intents: `stripePaymentIntentId` unique on `Registration`.
- Resend email sends: use idempotency keys.
