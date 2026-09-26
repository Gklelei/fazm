# FAZM V2 Audit — Executive Summary

**Repo:** `gklelei/fazm` — a Next.js 16 (App Router) + React 19 + Prisma 7 (PostgreSQL) + better-auth football academy management system. Single-tenant (one academy per deployment). ~368 TypeScript/TSX files under `src/`, feature-organized under `src/Modules/<Domain>/`.

This audit is **read-only research**. Nothing has been changed in the codebase. All findings below reference real files and line numbers; anything not fully traced end-to-end is explicitly marked POSSIBLE rather than CONFIRMED. Full detail lives in the numbered reports in this folder; an actionable, estimateable task list is in `V2_BACKLOG.md`.

## Overall architectural assessment

The codebase is **better than a typical "vibe-coded" CRUD app** in several respects: a consistent module-per-domain layout, real Zod validation shared between client and server in most flows, correct use of Prisma transactions for the trickiest workflows (training-session overlap checks, attendance upserts, discount application), and a working audit-log system. It is **not production-hardened**: authorization is implemented ad hoc per server action/route with no central enforcement point, roughly 1 in 4 of the ~54 audited server actions/API routes has a missing or under-scoped auth check, there is no test suite at all, no schema migration history exists (the app has been run via `prisma db push`), and money is partly stored as floating point with at least one confirmed lost-update race in payment recording. The dominant theme across every audit area is the same: **good patterns exist in the codebase already, but are applied inconsistently** — a fix in most cases is "make everything follow the pattern the best examples already use," not a rewrite.

**Recommendation: do not rewrite from scratch.** The module boundaries, the domain model (especially the assessment/template system and the finance/subscription model), and the shared validation approach are solid foundations. V2 should be an incremental hardening and consolidation effort, phased by risk (see `13-v2-roadmap.md`), not a rebuild.

## Top 10 technical problems

1. **No centralized authorization.** No `middleware.ts` exists anywhere; every server action and API route independently calls `auth.api.getSession()` (or forgets to). Several call it and never check the result (`UpdateAthleteAction`, the invoice-PDF route), and two write actions have **no auth check of any kind** (`CreateAssesmentMetricsAction`, `CreateBatchWithSchedule`).
2. **Zero automated tests, zero CI.** No test framework, no `.github/workflows`, 0% coverage on the codebase's highest-risk logic (payments, coupons, attendance, onboarding date math).
3. **No Prisma migration history.** `prisma/migrations` does not exist; the schema has evidently been synced with `db push`, which is unsafe for production schema evolution (can silently drop columns/data).
4. **Confirmed money-losing race condition.** `CreateTransaction.ts` reads an invoice's balance before opening its `$transaction` and computes the new balance from that stale read — two concurrent payments against the same invoice will lose one payment's contribution to `Invoice.amountPaid`.
5. **Coupon usage limits are not enforced for subscriptions.** `ApplyCoupon.ts` checks `usageLimit`/`timesUsed` but never increments `timesUsed`, and does the whole check-then-write without a transaction — a limited-use coupon can be reused indefinitely on subscriptions (contrast with `ApplyDiscounts.ts`, which does this correctly for invoices).
6. **Money stored as `Float`.** `Finance.amountPaid` and `Expenses.amount` are `Float` while every sibling monetary field correctly uses `Decimal(10,2)` — rounding drift risk in exactly the tables that must reconcile.
7. **Duplicated, drifting billing/date-math logic in three places.** The same "next billing date" / prorating helpers are hand-copied across `OnBoarding.ts`, `cron-jobs/subscriptions/route.ts`, and `src/cron/tasks.ts`, and it's unclear which of the two parallel cron mechanisms (`node-cron` worker process vs. HTTP `cron-jobs/*` endpoints) is actually the one running in production.
8. **No error boundaries anywhere.** Zero `error.tsx`/`global-error.tsx` files exist at any route segment; an unhandled error in any Server Component hits Next.js's default unstyled error page for the whole app.
9. **One severe pagination regression.** `transactions/page.tsx` loads the entire `Finance`/`Athlete`/`Invoice` tables unpaginated (the `take`/`orderBy` lines are commented out) and does search/pagination client-side over the full dataset — every sibling list page does this correctly server-side.
10. **A parallel, drifting hand-written type layer.** Root `global.d.ts` (~313 lines) duplicates the Prisma schema by hand, contains a duplicate `Athlete` interface with a duplicate field, string-literal enum values with stray leading whitespace that can never match real data, and a frontend `AppRole` union (`SideBarItems.tsx`) that includes a role (`STAFF`) that doesn't exist in the database and omits one that does (`DOCTOR`).

## Top 5 security risks

1. **CRITICAL — `UpdateAthleteAction` has a no-op auth check.** It calls `getSession()` but never checks the result or the role; any request (authenticated or not) can overwrite any athlete's full profile, including medical data and guardian records, given an arbitrary `athleteId`.
2. **CRITICAL — Two write-capable server actions have no authentication at all.** `CreateAssesmentMetricsAction` and the entire `Settings/Batches/Ui/server.ts` file (batch + bulk training-session creation) never call `getSession()`. Both are reachable directly as Next.js server-action endpoints regardless of UI wiring.
3. **CRITICAL — The invoice PDF endpoint is unauthenticated.** `/api/finance/invoice/[id]/pdf` calls `getSession()` but never checks it before rendering and returning a PDF containing an athlete's name, contact details, and financial balances.
4. **CRITICAL — Unauthenticated file upload/delete.** `/api/files/upload` has no auth check and no file-type/size limit (stored-XSS and disk-fill risk); its `DELETE` handler is also unauthenticated and can remove other users' uploaded ID documents given a guessable filename.
5. **CRITICAL (configuration-dependent) — One cron endpoint fails open.** `cron-jobs/activity/route.ts`'s auth guard is `if (!secret) return;` — if `CRON_SECRET` is ever unset in a deployment, this mass-deactivation endpoint becomes fully public. Also HIGH: roughly a dozen other server actions/routes (invoice creation/status, training-session creation, athlete/staff/finance read endpoints, bulk export) check only "is there a session" with no role or ownership check, meaning any authenticated account — including whatever the lowest-privilege role turns out to be — can read or mutate data far outside its intended scope. See `02-security-audit.md` for the full list (16 authorization findings, plus the client-settable `role` field in `better-auth`'s config).

## Most important database problems

- **Lost-update race** in payment recording (`CreateTransaction.ts`) — see above.
- **Coupon usage-limit bypass** on subscriptions (`ApplyCoupon.ts`) — see above.
- **Racy, `count()`-based sequence numbers** for invoice numbers and receipt numbers — protected only incidentally by a unique constraint, which aborts the whole enclosing transaction on collision rather than retrying.
- **No migration history** — `prisma/migrations` doesn't exist; schema changes are unreviewable and unreproducible from source control.
- **Inconsistent FK targets** — most relations to `Athlete`/`staff` target the business key (`athleteId`/`staffId`) rather than the primary key (`id`), while a few target `id` — two parallel identities per entity that must stay in sync, and less efficient joins.
- **Two fully unbounded `findMany` queries** on ever-growing tables: the transactions page (see below) and the audit-log query (`getAuditLogs.ts`), neither of which paginates.
- **Missing indexes** on FK columns used in joins/filters across `training`, `attendance`, and `Assessment`.

## Most important dead-code findings

- **`src/generated/prisma` (39 files) is committed to git** despite the `.gitignore` exclusion being present but commented out — this is Prisma's generated client output and should never be tracked.
- **Two parallel cron systems** (`src/cron/worker.ts` + `tasks.ts` vs. `api/cron-jobs/*` HTTP endpoints) implement overlapping/duplicated business logic; it's unclear which is actually deployed.
- **Likely-dead dependencies** with zero usages found: `csv-parser`, `@stepperize/react`, `react-resizable-panels`, `use-debounce` (a hand-rolled equivalent, `src/utils/Debounce.ts`, is used instead) — plus `yarn` incorrectly listed as a runtime `dependency`.
- **Three duplicate loading-spinner components**, no shared currency/date formatter, and two competing alert/toast systems (`sweetalert2` in 39 files vs. `sonner` in 9).
- The dead/no-op `ChangePassword` server action in `src/Modules/Auth/Auth.ts` (see security report A2) — not currently called from anywhere.

## Highest-value V2 improvements

1. Introduce one enforced authorization layer (a `requireRole()`/`requireSession()` helper used at the top of literally every server action and route handler, or route-group middleware) instead of the current copy-pasted, frequently-incomplete per-file check.
2. Fix the two confirmed financial-correctness bugs (payment race, coupon usage-limit bypass) and switch `Float` money fields to `Decimal`.
3. Stand up a real migration history before any further schema changes, and add the missing indexes/constraints identified in `04-database-audit.md`.
4. Add a baseline test suite (Vitest + a Postgres test container) starting with the highest-risk workflows: payment reconciliation, coupon redemption, attendance upserts, athlete onboarding date math, and role-boundary tests for the IDOR findings above.
5. Consolidate the duplicated billing/date-math and the two cron mechanisms into one; add root `error.tsx`/`global-error.tsx`; fix the `transactions` page pagination regression.
6. Clean up the dependency and type-safety debt: remove dead dependencies, delete `src/generated/prisma` from git, replace the hand-written `global.d.ts` DTOs with the `satisfies Prisma.XArgs` pattern already used correctly in 6 other modules, and fix the `AppRole` drift bug in `SideBarItems.tsx`.

## Recommended first implementation phase

**Phase 0 — Safety and critical vulnerabilities**, covering items 1–4 in the security findings above (auth gaps on `UpdateAthleteAction`, the two fully-unauthenticated actions, the invoice PDF route, the file-upload endpoint, and the fail-open cron guard) plus the two financial-correctness bugs (payment race, coupon bypass). None of this requires schema changes or architectural rework — it is targeted, low-risk fixes to existing files — and it closes the exposure that matters most (arbitrary data mutation/exfiltration and real money loss) before any other V2 work begins. See `13-v2-roadmap.md` for the full phase breakdown and `V2_BACKLOG.md` for individually estimated tasks.
