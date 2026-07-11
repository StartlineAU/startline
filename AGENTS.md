# Startline

Next.js 15 (App Router) fitness event discovery platform. Three portals:

| Route | Domain | Purpose |
|---|---|---|
| `(user)/` | startlineau.com | Public event browsing |
| `organiser/` | organiser.startlineau.com | Event management |
| `admin/` | organiser.startlineau.com | Approvals, org management |

## Development

- **Package manager:** pnpm 11.10.0
- **Dev:** `pnpm dev` (Turbopack). **Build:** `pnpm build` (standalone `next.config.ts`). `@/*` → root.
- **Docker:** PostgreSQL 15 on :5432 + Mailpit (SMTP :1025, UI :8026). Start: `docker compose up -d`.
- **Worktree?** Check via `git worktree list`. If yes, Docker infra runs on main checkout — just `pnpm dev`, no `docker compose up`.
- App runs in Docker as `app` service (port 3000). Prisma Studio as `prisma-studio` service (port 5555).

## Auth (Cognito)

JWT verification in `middleware.ts` via `jose`. Tokens in Cognito-managed cookies. Only Cognito group: `admins`. Authorisation at DB level (Prisma).

`lib/amplify-server.ts` session helpers:
- `getUserSession()` — upserts User by cognitoSub
- `getOrganiserSession()` — User → Organiser via userId
- `getAdminSession()` — only if `admins` group

### Seed users

All share password `Password123!`. `pnpm prisma:seed` is idempotent.

| Email | Notes |
|---|---|
| `admin@startline.test` | Admin group |
| `organiser@startline.test` | User + verified Organiser (Apex Endurance Events) |
| `user@startline.test` | User only |

Old Cognito users from previous seeds not auto-removed.

## Domain routing

`middleware.ts` routes by hostname in production. Dev mode (`NODE_ENV=development`) skips all domain checks — everything at `localhost:3000`. Protects path lists: `ORGANISER_PROTECTED`, `ADMIN_PROTECTED`.

## Database

PostgreSQL 15, Prisma ORM. Singleton client `lib/prisma.ts` (uses `PrismaPg` adapter). Binary target `rhel-openssl-3.0.x` for Lambda.

## Stripe Connect

Express for organiser payouts. Amounts in integer cents. Platform fee (`lib/platform-fee.ts`): 3.95% + $1.45. `feeStructure`: "athlete" adds fee to total, "organiser" absorbs it.

## Infrastructure

Terraform in `terraform/` — plan on PR, apply on push to main. App deploys via AWS Amplify: `non-production` → staging, `production` → live.

## Design

Read `design/design.md` before any UI work. Key rules:
- Dark-only. One accent: `#B3E153`. Blue/amber/red = status semantics only.
- Chakra Petch (headings, uppercase + wide tracking), Inter (body).
- Lucide icons only. No emoji.
- Text on green = `#141414`, never white.
- Machined shadow (`2px 2px 0 #B3E153`) on primary CTA only.
- Status `APPROVED` → "Published" to organisers.
- shadcn/ui via `components/ui/`. `cn()` from `lib/utils.ts` (clsx + tailwind-merge).

## Testing

| Command | What |
|---|---|
| `pnpm lint` | ESLint (next lint) |
| `pnpm test` | Vitest unit tests (`src/__tests__/`) |
| `pnpm test:watch` | Vitest watch |
| `pnpm test:e2e` | Playwright e2e (`e2e/`, needs PostgreSQL running) |

- Vitest: `globals: true`, `DATABASE_URL` defaults to port 5432.
- Playwright: Chromium, auto-starts `pnpm dev -p 3000`. Auth via non-production Cognito pool.
- **Every new feature MUST include E2E tests.** Use `e2e/helpers.ts`. API tests via `page.evaluate()` + `fetch()`.
- Conditional assertions (`if (await locator.isVisible())`) for seed-data-dependent tests.
- **Pre-commit:** `pnpm lint && pnpm test && pnpm test:e2e` — 0 errors/warnings required.

## GitHub

Use `gh` CLI (MCP fails on private `StartlineAU/startline`).

**PRs:** Link issues (`Closes #N`), follow `.github/PULL_REQUEST_TEMPLATE.md`. CI runs lint/test/e2e (informational, does not block merge).

**Issues:** Use `.github/ISSUE_TEMPLATE/issue.yml`. Set type: `gh issue edit <N> --repo StartlineAU/startline --type "Bug|Feature|Task"`. Set Priority/Effort via GraphQL:

```
# Get node ID
gh issue view <N> --repo StartlineAU/startline --json id --jq '.id'

# Batch mutation (replace NODE_ID and OPTION_IDs)
gh api graphql -f query='
  mutation {
    p: updateIssueFieldValue(input: { issueId: "<NODE_ID>", issueField: { fieldId: "IFSS_kgDOAnp8Qg", singleSelectOptionId: "<PRI>" } }) { issue { number } }
    e: updateIssueFieldValue(input: { issueId: "<NODE_ID>", issueField: { fieldId: "IFSS_kgDOAnp8RQ", singleSelectOptionId: "<EFF>" } }) { issue { number } }
  }'
```

| Field | Options | IDs |
|---|---|---|
| Priority | Urgent / High / Medium / Low | `IFSSO_kgDOBFZBjQ` / `IFSSO_kgDOBFZBjg` / `IFSSO_kgDOBFZBjw` / `IFSSO_kgDOBFZBkA` |
| Effort | High / Medium / Low | `IFSSO_kgDOBFZBkQ` / `IFSSO_kgDOBFZBkg` / `IFSSO_kgDOBFZBkw` |

Priority/Effort in issue body does NOT set GraphQL fields — use mutation above.

## Playwright CLI (browser automation)

Prefer over MCP for browser automation (~76% token savings). `-s=<name>` for isolated sessions.

```
playwright-cli open|goto|snapshot|click|type|fill|select|check/uncheck|screenshot|close
```

Read snapshot `.yml` for element refs. `--headed` for visible browser.

## MCP servers (opencode.json)

| Server | Access |
|---|---|
| stripe | Stripe API via `@stripe/mcp` |
| resend | `resend-mcp` (reads RESEND_API_KEY from `.env`) |
| aws | API via `awslabs.aws-api-mcp-server` (profile `mcp-server`, account `829182232071`, `ap-southeast-2`) |
| cloudflare | `@cloudflare/mcp-server-cloudflare` (account `cae4a54688a0a4c53bda4bd62eb37c35`) |
| terraform | `hashicorp/terraform-mcp-server` via Docker |

## Idempotency

- Prisma client: singleton (`lib/prisma.ts`)
- Stripe: `stripePaymentIntentId` unique constraint on `Registration`
- Resend: use idempotency keys
