# 13 — V2 Roadmap

Incremental migration, not a rewrite. Each phase is independently shippable and, where possible, deployable without the phases after it. Detailed, estimable tasks for every phase live in `V2_BACKLOG.md`; this document gives the sequencing and rationale.

---

## Phase 0 — Safety and critical vulnerabilities

**Objective:** close every CRITICAL/HIGH security and financial-correctness finding before any other V2 work begins, since these represent active exposure (arbitrary data mutation, PII exfiltration, real money loss) rather than technical debt.

**Areas/files affected:** `UpdateAthleteAction.ts`, `CreateAssesmentMetricsAction.ts`, `Settings/Batches/Ui/server.ts`, `api/finance/invoice/[id]/pdf/route.tsx`, `api/files/upload/route.ts`, `cron-jobs/activity/route.ts`, `src/lib/auth.ts` (role field), `CreateTransaction.ts`, `ApplyCoupon.ts`, plus the ~12 HIGH-severity missing-role-check findings in `02-security-audit.md` (B2-B5, B10-B12, B14).

**Proposed changes:** add the missing/no-op session and role checks; set `input: false` on the `role` additionalField (or add a `databaseHooks` override) in `better-auth` config; add file-type/size limits and an auth check to the upload endpoint; fix the fail-open cron guard to fail closed; fix the payment-reconciliation race by re-reading the invoice balance inside the transaction; fix coupon redemption to be atomic and usage-limit-enforcing.

**Dependencies:** none — these are localized fixes to existing files, no schema migration required (the `Float`→`Decimal` money-type fix is schema-touching and is deliberately deferred to Phase 3, since it needs a migration).

**Risks:** tightening authorization may reveal that some current (even if unintended) cross-role access is relied upon by an existing workflow — each fix should be verified against how the affected page/feature is actually used before shipping.

**Migration concerns:** none for the auth fixes. The `better-auth` `role` field change should be tested against the sign-up and staff-creation flows to confirm no regression.

**Testing required:** for each authorization fix, add the corresponding API/role-boundary test from `09-testing-strategy.md` *before* or alongside the fix, so the fix is provably closing the gap. For the two financial-correctness fixes, add the DB-integration tests (concurrent-payment test, concurrent-coupon-redemption test) from the same report.

**Definition of done:** every CRITICAL and HIGH finding in `02-security-audit.md` has either a shipped fix with a passing regression test, or an explicit written justification for why it's not being fixed now (per audit rule — never weaken security to simplify architecture, so "not now" should be rare and reasoned).

---

## Phase 1 — Repository cleanup

**Objective:** remove dead code and repo-hygiene issues that don't require behavior changes, to reduce noise before deeper work.

**Areas/files affected:** `.gitignore`, `src/generated/prisma`, `package.json`, `src/Modules/Auth/Auth.ts` (`ChangePassword`).

**Proposed changes:** remove `src/generated/prisma` from git tracking (uncomment the `.gitignore` line, `git rm -r --cached`); remove `yarn`, `csv-parser`, `@stepperize/react`, `react-resizable-panels`, `use-debounce`, `axios` from dependencies after a final targeted verification grep each; move `tsx` (pending cron-mechanism decision in Phase 2), `@types/pg`, `papaparse` to `devDependencies`; delete or fix `ChangePassword`.

**Dependencies:** the `tsx` dependency move depends on the cron-mechanism decision in Phase 2 — sequence that specific item after Phase 2 starts, or confirm the deployment target first.

**Risks:** low — these are subtractive, verifiable changes. Re-run the build after each dependency removal.

**Migration concerns:** none.

**Testing required:** `npm run build` / `next build` succeeds after each removal; smoke-test the app still runs (`prisma generate` still works after untracking `src/generated/prisma`).

**Definition of done:** `git ls-files src/generated` is empty, `package.json` has no zero-usage dependencies, `ChangePassword` is either removed or fixed-and-tested.

---

## Phase 2 — Architecture foundations

**Objective:** put the "make the good pattern mandatory" changes in place before adding more features on top of the inconsistent patterns.

**Areas/files affected:** new `src/lib/authz.ts`, `src/lib/api-response.ts`, `src/lib/billing.ts`, `src/types/ActionResult.ts`; every server action and API route (incrementally migrated onto the new shared helpers); `src/cron/*` and `api/cron-jobs/*` (consolidate to one mechanism); root `error.tsx`/`global-error.tsx`.

**Proposed changes:** see `12-v2-architecture.md` sections 1–3 in detail. Critically, **first confirm with whoever owns deployment which cron mechanism is actually running in production** — this is a blocking question, not a technical decision this audit can make from the code alone.

**Dependencies:** Phase 0 should be complete first, since Phase 0's per-file auth fixes are the natural first users of the new `requireSession`/`requireRole` helpers (introduce the helper, then use it for the Phase 0 fixes, rather than writing one-off fixes now and refactoring them again later — sequence Phase 0 and the start of Phase 2 together if timeline allows).

**Risks:** touching every server action/route is a wide-blast-radius change even though each individual edit is small; do it as a tracked checklist (one PR per module, not one giant PR) to keep review tractable.

**Migration concerns:** none schema-related. The cron consolidation needs a cutover plan (run both in parallel briefly, confirm parity, then remove the old one) rather than a hard swap.

**Testing required:** the role-boundary tests from Phase 0 should continue passing after the refactor (this phase should not change behavior, only consolidate the implementation) — treat any test failure here as a real regression.

**Definition of done:** every server action/route uses the shared `requireSession`/`requireRole` helper and the shared `ActionResult`/`apiError` types; exactly one cron mechanism remains; root and key-route `error.tsx` boundaries exist.

---

## Phase 3 — Database / data integrity

**Objective:** close the schema-level correctness and scalability gaps identified in `04-database-audit.md`.

**Areas/files affected:** `prisma/schema/*.prisma`, `prisma/migrations` (newly created), `Finance.amountPaid`, `Expenses.amount`, FK definitions across `Athlete`/`staff`-related models, missing indexes.

**Proposed changes:** baseline a migration history (`prisma migrate dev --create-only`, hand-reviewed against the live schema, then adopt `prisma migrate deploy` in CI); add missing indexes; make `onDelete` explicit everywhere; migrate `Float` money fields to `Decimal(10,2)` (requires a data-backfill migration, not just a schema change, to avoid precision loss on existing rows); normalize FK targets onto primary keys (`Athlete.id`, `staff.id`) — this is the highest-risk single change in this phase and should be done as its own reviewed migration, separate from the others.

**Dependencies:** Phase 0's financial-correctness fixes should already be in place (they don't require the `Decimal` migration to be correct, but doing the `Decimal` migration on top of already-correct transaction logic is safer than doing both at once).

**Risks:** the FK-target normalization and the `Float`→`Decimal` conversion are genuine schema migrations against what appears to be a live production database with no prior migration history — both should be done with a tested rollback plan and ideally a staging-environment dry run, since this audit cannot confirm production data volume or downtime tolerance.

**Migration concerns:** this phase is the one place in the roadmap where "verify against the live database before applying" is not optional — establishing migration history for the *first* time on an existing production database requires care to avoid Prisma treating existing objects as needing to be recreated.

**Testing required:** DB-integration tests from `09-testing-strategy.md` should be run against a staging copy of production data (not just a fresh seed) to catch any migration issue specific to real data shape.

**Definition of done:** `prisma/migrations` exists and is the source of truth for schema changes going forward; money fields are `Decimal`; the highest-traffic FK joins are indexed; a rollback plan exists and was tested for the FK-normalization migration specifically.

---

## Phase 4 — Backend/API improvements

**Objective:** apply the remaining N+1/pagination/consistency fixes identified across the audits that don't require a schema change.

**Areas/files affected:** `src/app/(home)/transactions/page.tsx`, `Settings/AuditLogs/api/getAuditLogs.ts`, `src/cron/tasks.ts` (N+1 loops), `api/export/route.ts` (typed `where` clauses), `api/stats/route.ts`, `api/athlete/[id]/route.ts` (status codes).

**Proposed changes:** paginate the transactions page and the audit-log query server-side; replace the N+1 per-item loops in cron tasks with `updateMany`/set-based queries; type the `where`-clause builders against `Prisma.XWhereInput` instead of `any`; fix the HTTP-200-on-unauthorized bug.

**Dependencies:** none beyond Phase 2's shared `apiError` helper being available to use for the status-code fix.

**Risks:** low — these are behavior-preserving-or-improving fixes to existing endpoints.

**Migration concerns:** none.

**Testing required:** the API/role tests from Phase 0 plus new tests confirming pagination behavior (page size, ordering, cursor correctness) on the fixed endpoints.

**Definition of done:** no `findMany` without `take`/`skip` remains on the tables identified as unbounded; the identified `any`-typed `where` clauses are properly typed.

---

## Phase 5 — Frontend/UX improvements

**Objective:** close the consistency gaps in `05-nextjs-react-audit.md` and `10-ux-review.md`.

**Areas/files affected:** `players` (`AthletesData.tsx` → SSR+initialData pattern), the shared table component (`filterFn`/`mapRow` generics), a new shared `FormModal`, empty-state component, and formatter module (`src/lib/format.ts`), the `AppRole`/`SideBarItems.tsx` drift fix, per-route `loading.tsx`/`error.tsx` for the currently-missing segments, `next/dynamic` for `@react-pdf/renderer` components, `staleTime`/`gcTime` on the global `QueryClient`.

**Proposed changes:** see `12-v2-architecture.md` section 7 and `10-ux-review.md`'s recommendations in full.

**Dependencies:** Phase 2's root `error.tsx` should exist first as the pattern to extend per-route.

**Risks:** low, mostly additive/consolidating UI work; the biggest risk is scope creep (audit rule: no unnecessary enterprise abstractions) — keep the shared components minimal and driven by the actual duplication found, not speculative flexibility.

**Migration concerns:** none.

**Testing required:** manual QA pass across the affected pages (this is UI-behavior work, best verified by actually running the app per the UX review's flagged assumption that no browser testing was done during the audit itself); consider a small number of Playwright smoke tests for the migrated `players` page given its traffic.

**Definition of done:** `players` matches the `invoices` SSR pattern; the shared table component has zero `any` in its filter/row-mapping props; `AppRole` matches the real `ROLES` enum; the previously-missing `loading.tsx`/`error.tsx` files exist for the routes named in `10-ux-review.md`.

---

## Phase 6 — Testing and observability

**Objective:** stand up the test pyramid from `09-testing-strategy.md` and close the logging gaps from the audit prompt's observability concerns (structured logging, audit-log completeness).

**Areas/files affected:** new test infrastructure (Vitest config, Postgres test container setup), `src/lib/audit.ts` and its call sites (add audit logging for login/logout/role-change events, and for the actions found to skip it when unauthenticated — once Phase 0 has fixed those to require auth, they should also log).

**Proposed changes:** implement the pyramid described in `09-testing-strategy.md`, prioritized as written there (unit → DB/integration → API/role → thin E2E); add missing audit-log entries for security-sensitive events not currently logged.

**Dependencies:** ideally sequenced alongside Phase 0 (tests for the fixes as they're made) rather than strictly after every other phase — this ordering note also appears in Phase 0's "testing required" section.

**Risks:** low for the test infrastructure itself; adding audit logging to more call sites is low-risk but should not be added to the transaction that performs the business write (per the audit's finding that current audit logging already happens outside the transaction — keep it that way rather than coupling it in, unless a compliance requirement specifically demands atomicity between the audit record and the business write).

**Migration concerns:** none.

**Testing required:** N/A — this phase *is* the testing work.

**Definition of done:** CI runs unit + DB-integration + API tests on every PR; the highest-risk workflows named in `09-testing-strategy.md` have test coverage; login/logout and role-change events are audit-logged.

---

## Phase 7 — New V2 functionality

**Objective:** the additive domain-model changes identified in `11-domain-review.md` as genuinely valuable given current scope — not a speculative feature list.

**Areas/files affected:** new `Guardian` entity + join table (replacing per-athlete-duplicated guardian rows), new `Season`/`BillingPeriod` entity (replacing the free-text `billingCycle` string), `Athlete.dateOfBirth` converted to `DateTime` with derived `age`, a `CoachBatchAssignment` join table for batch-scoped staff permissions.

**Proposed changes:** each of these is a schema-additive change with a data-migration component (backfilling `Guardian` records from existing duplicated `AthleteGuardian` rows is the most involved — it requires a de-duplication pass on name/email/phone before creating shared records, which should be done as a reviewed, reversible script rather than an in-place migration).

**Dependencies:** Phase 3's migration-history baseline must exist first, since these are exactly the kind of schema changes that need reviewable migrations.

**Risks:** the `Guardian` de-duplication backfill is genuinely risky (matching "is this the same parent" heuristically across existing rows can produce false merges) — do it as an assisted/manual-review process for the first pass, not a fully automated migration, and keep the old per-athlete columns temporarily rather than dropping them until the new data is verified.

**Migration concerns:** as above — this phase has the highest data-migration risk in the roadmap and should not be rushed.

**Testing required:** the batch-scoped role assignment directly enables the ownership checks deferred in Phase 0's `requireOwnership` helper — add tests for "a coach can only access their assigned batches" once this ships.

**Definition of done:** guardians are represented as shared entities with no data loss from the migration; billing periods are structured data; DOB is a real date type; coaches can be scoped to specific batches and the authorization layer enforces it.

---

## Phase 8 — Optimization and production hardening

**Objective:** the remaining performance items that are lower-priority than the correctness/security work in earlier phases.

**Areas/files affected:** dashboard caching (`unstable_cache`), reference-data caching (academy settings, batches/locations/drills dropdowns), image delivery normalization (`next/image`/Cloudinary transforms), version pinning for the bleeding-edge dependency stack (`08-dependencies.md`).

**Proposed changes:** add `unstable_cache` with tag-based invalidation for the dashboard's 13-query load and for rarely-changing reference data; normalize image display through `next/image`/Cloudinary; pin exact versions for `next`/`react`/`react-dom`/`@prisma/client`/`prisma`.

**Dependencies:** none blocking — this phase can happen in parallel with Phase 7 if resourcing allows, since it touches different files.

**Risks:** cache invalidation bugs (stale data shown after a mutation) are the main risk — tie every cache tag explicitly to the mutation(s) that should invalidate it, and test that path specifically.

**Migration concerns:** none.

**Testing required:** a test (or manual check) confirming that editing academy settings/reference data invalidates the corresponding cache within the expected TTL.

**Definition of done:** the dashboard and reference-data pages are measurably faster on repeat visits without serving stale data after a mutation; dependency versions are pinned.
