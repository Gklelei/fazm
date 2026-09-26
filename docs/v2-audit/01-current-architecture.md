# 01 — Current Architecture

## Stack

- **Framework:** Next.js 16.1.0, App Router, React 19.2.3 — a bleeding-edge major-version combination (see `08-dependencies.md` for the risk note).
- **Database:** PostgreSQL via Prisma 7.2.0 (`prisma-client` generator, output committed to `src/generated/prisma` — see `03-dead-code.md`).
- **Auth:** `better-auth` 1.4.7 with the Prisma adapter, email+password only.
- **Data fetching (client):** `@tanstack/react-query` v5.
- **Forms:** `react-hook-form` + `zod` via `@hookform/resolvers`.
- **UI:** Tailwind v4 + shadcn/ui (Radix primitives) + `lucide-react`.
- **Misc:** Cloudinary (`next-cloudinary`) for image storage, `mailtrap` for email, `node-cron` for background jobs, `@react-pdf/renderer` + `jspdf`/`jspdf-autotable` for PDFs (two parallel approaches — see below), `xlsx`/`papaparse`/`csv-parser` for exports (three overlapping libraries).

## Repository layout

```
src/
  app/
    (auth)/          sign-in, sign-up, res-password — each independently session-gated
    (home)/           the protected app: academy, assesments, coupons, expenses,
                       expenses-categories, fees, guardians, invoices, mail, players,
                       sessions, settings, staff, stats, transactions
    (server)/api/     19 route handlers: better-auth catch-all, athlete, export,
                       finance (invoice PDF, transaction record), files/upload,
                       health, mail, settings/utils, stats, user/role,
                       cron-jobs/* (6 endpoints)
  Modules/<Domain>/   business logic, one folder per domain (see below)
  components/         shared UI incl. shadcn primitives (components/ui/*)
  lib/                auth.ts, auth-client.ts, prisma.ts, audit.ts, mailtrap.ts, utils.ts
  hooks/, utils/       shared hooks and helper functions (some duplicated — see 03)
  cron/               worker.ts + tasks.ts — a standalone node-cron process
  generated/prisma/   Prisma client output (should not be in git)
prisma/schema/        9 split .prisma files (no prisma/migrations directory)
```

### Domain modules (`src/Modules/`)

| Module | Covers |
|---|---|
| `Auth` | sign-in/sign-up forms, password reset trigger |
| `Users` | Athletes (`AthletesOnboarding`, `AthletesProfile`), Staff (`stafff`) |
| `Guardions` (sic) | Guardian views |
| `Trainings` | Sessions, `Assesments` (assessment templates/scoring) |
| `Finances` | Invoices, transactions/payments, subscription fees |
| `Expenses` | Expense entries and categories |
| `Coupons` | Discount codes |
| `Settings` | `AuditLogs`, `Batches` (cohorts/schedules), training locations, drills, academy config |
| `academy` | Single-row tenant/org settings |
| `DashBoard` | Homepage widgets |
| `analytics` | Finance-related hooks/aggregation |
| `Mail` | Transactional email templates |
| `Seed` | Dev/seed scripts (papaparse-based) |
| `UserProfile` / `Context` | Current-user profile modal, session context provider |

Each module generally follows: `ui/` (client components) → `Server/` (`"use server"` actions) → Prisma. Validation schemas live in a `Validators`/`Validation` subfolder and are largely **shared** between the client form (`zodResolver`) and the server action (`Schema.parse(...)`) — a good pattern already in place for most create/edit flows (e.g. `CreateInvoiceSchema`).

## How a feature actually flows (traced examples)

**Athlete onboarding:** `app/(home)/players/create/page.tsx` (thin) → `AthletesOnboardingForm.tsx` (client, 454 lines) → `Modules/Users/AthletesOnboarding/Server/OnBoarding.ts` (`AthleteOnboardingAction`, 359 lines). All the interesting logic — atomic athlete-ID sequencing, invoice-number generation, prorated first-invoice billing, next-billing-date computation — lives correctly inside the server action, wrapped in `db.$transaction`. The date-math helpers (`nextMonthlyBillingDate`, `clampToDay`, `daysInMonth`, `calculateAge`, etc.) are defined inline in this file rather than a shared module, and are **re-implemented from scratch** (not imported) in `api/cron-jobs/subscriptions/route.ts` — see `03-dead-code.md` A7.

**Invoice creation:** `app/(home)/invoices/create/page.tsx` queries Prisma **directly from the route file** (`db.athlete.findMany(...)`) — the one place in the sampled flows that skips the module boundary — before handing off to `CreateInvoice.tsx` (client, 456 lines) → `Modules/Finances/Invoices/Server/CreateAthleteInvoice.ts`.

**Training session creation:** same thin-route → fat-client-component → dedicated-server-action shape, consistently applied. `CreateTrainingSession.ts` correctly wraps a raw-SQL overlap check plus the athlete-connect and create steps in one `$transaction`.

## Server action / API response shape

Inconsistent. Most server actions return an `ActionResult`-shaped `{ success: boolean; message: string }`, but this type is **re-declared locally in at least 7 separate files** rather than imported from one shared definition, and `OnBoarding.ts` uses a structurally different shape (`{ status: "SUCCESS" | "ERROR"; successMessage/errorMessage }`). API routes are similarly inconsistent: some return `{ error }`, some `{ ok: false, error }`, some a raw-string `Response`, some `NextResponse` with plain text instead of JSON. See `07-code-quality.md` and `12-v2-architecture.md` for the proposed consolidation.

## Cron / background jobs

Two parallel, apparently-duplicated mechanisms exist for the same recurring jobs (subscription expiry, overdue invoices, athlete deactivation, training-status updates, age recalculation):

1. `src/cron/worker.ts` + `src/cron/tasks.ts` — a standalone `node-cron` process, started via `npm run cron` (`tsx src/cron/worker.ts`).
2. `src/app/(server)/api/cron-jobs/*/route.ts` — six HTTP endpoints guarded by a `CRON_SECRET` bearer-token check, apparently meant to be invoked by an external scheduler (e.g. Vercel Cron).

Which of these is actually running in production is not evident from the code alone and should be confirmed before V2 work proceeds — see `13-v2-roadmap.md` Phase 2.

## Authentication/authorization architecture

There is **no `middleware.ts`** anywhere in the repository. The only centralized gate is `app/(home)/layout.tsx`, which does a server-side `auth.api.getSession()` call and redirects to `/sign-in` if there's no session — this covers "is the user logged in" for the entire protected UI tree, but does **no role check**, so every authenticated user of any role can navigate to every page. Below that layout, every server action and API route independently repeats its own `getSession()` call (or, in a meaningful number of cases documented in `02-security-audit.md`, omits or under-scopes it). There is no shared `requireRole()`/`requireSession()` helper — the pattern is copy-pasted per file, which is the direct cause of the inconsistency documented in the security audit.

## Testing / CI

No test framework, no test files, no CI configuration exist anywhere in the repository (see `09-testing-strategy.md`).
