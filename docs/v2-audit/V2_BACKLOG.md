# V2 Backlog

Priority: P0 = critical, P1 = high, P2 = medium, P3 = optional.
Complexity: XS / S / M / L / XL (relative sizing, not hours/days).

---

### FAZM-001 — Fix no-op auth check in `UpdateAthleteAction`
**Area:** Security / Authorization
**Problem:** `src/Modules/Users/AthletesProfile/EditUserProfile/Server/UpdateAthleteAction.ts` calls `getSession()` but never checks the result or role before overwriting any athlete's full profile.
**Solution:** Add `requireRole()`/session-null check before the `db.athlete.update` call; reject with an `ActionResult` failure if unauthorized.
**Priority:** P0
**Risk:** Low (behavior-preserving for legitimate callers)
**Complexity:** XS
**Dependencies:** None

### FAZM-002 — Add authentication to `CreateAssesmentMetricsAction`
**Area:** Security / Authorization
**Problem:** `src/Modules/Trainings/Assesments/server/CreateAssesmentMetricsAction.ts` has no `getSession()` call at all — fully unauthenticated write.
**Solution:** Add session + role check.
**Priority:** P0
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-003 — Add authentication to `Settings/Batches/Ui/server.ts`
**Area:** Security / Authorization
**Problem:** Entire file (batch creation + bulk training-session generation) has no auth import at all.
**Solution:** Add session + role check to every exported action in the file.
**Priority:** P0
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-004 — Fix unauthenticated invoice PDF endpoint
**Area:** Security / Authorization
**Problem:** `src/app/(server)/api/finance/invoice/[id]/pdf/route.tsx` calls `getSession()` but never checks the result before rendering/returning a PDF with PII and financial data.
**Solution:** Return 401 if no session; add role/ownership check.
**Priority:** P0
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-005 — Lock down `/api/files/upload` endpoint
**Area:** Security
**Problem:** No auth check, no file-type/size limit on upload; `DELETE` handler also unauthenticated with guessable filenames.
**Solution:** Require session on both `POST` and `DELETE`; add an allowed-MIME-type list and a max file size; consider randomizing filenames instead of `Date.now()-<name>`.
**Priority:** P0
**Risk:** Medium (may need to coordinate with whatever currently calls this unauthenticated, if anything legitimate does)
**Complexity:** S
**Dependencies:** None

### FAZM-006 — Fix fail-open cron guard in `cron-jobs/activity`
**Area:** Security
**Problem:** `assertCronAuth` in `cron-jobs/activity/route.ts` does `if (!secret) return;` — becomes fully public if `CRON_SECRET` is unset.
**Solution:** Fail closed like the other 5 cron endpoints (`if (!CRON_SECRET || token !== CRON_SECRET) return 401`).
**Priority:** P0
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-007 — Make `role` field non-client-settable in better-auth config
**Area:** Security / Authentication
**Problem:** `src/lib/auth.ts` defines `additionalFields.role` with `input: true`, allowing a raw API call to `/api/auth/sign-up/email` or `/update-user` to set an arbitrary role.
**Solution:** Set `input: false` and only ever set `role` server-side (already done correctly in `CreateStaffAction.ts` — verify no other legitimate flow relies on client-supplied role).
**Priority:** P0
**Risk:** Medium (verify staff creation and any admin-role-assignment flow still works)
**Complexity:** S
**Dependencies:** None

### FAZM-008 — Fix payment-recording lost-update race
**Area:** Database / Finance correctness
**Problem:** `src/Modules/Finances/Server/CreateTransaction.ts` reads the invoice balance before the `$transaction` starts and computes the new balance from that stale snapshot — concurrent payments lose data.
**Solution:** Re-fetch the invoice (or use a conditional/decrement-based update) inside the transaction.
**Priority:** P0
**Risk:** Medium (touches core finance write path — needs the concurrent-payment integration test from FAZM-036 alongside it)
**Complexity:** M
**Dependencies:** FAZM-036 (test should exist to verify the fix)

### FAZM-009 — Fix coupon usage-limit bypass on subscriptions
**Area:** Database / Finance correctness
**Problem:** `ApplyCoupon.ts` checks `usageLimit`/`timesUsed` but never increments `timesUsed`, and runs the check-then-write without a transaction.
**Solution:** Mirror the correct pattern in `ApplyDiscounts.ts` — atomic `updateMany` guarded by `timesUsed: {lt: usageLimit}` inside a `$transaction`.
**Priority:** P0
**Risk:** Medium
**Complexity:** M
**Dependencies:** FAZM-037 (concurrent-redemption test)

### FAZM-010 — Add missing role checks to remaining HIGH-severity authorization gaps
**Area:** Security / Authorization
**Problem:** `EditInvoiceStatus`, `CreateAthleteInvoice`, `CreateTrainingSession`, `DeleteMetric`/`UpadateAssesmentMetric`, `api/athlete/[id]`, `api/athlete/athletes-all`, `api/export`, `api/finance/transaction/record/[id]` all check only "is there a session" with no role/ownership check (see `02-security-audit.md` B2-B5, B10-B12, B14).
**Solution:** Add appropriate role checks per action, using the shared `requireRole()` helper once FAZM-020 lands (or inline in the meantime if this needs to ship before Phase 2).
**Priority:** P1
**Risk:** Medium (verify legitimate lower-privilege flows aren't broken)
**Complexity:** L (many small edits across ~8 files)
**Dependencies:** None (can precede FAZM-020, but should be redone using the shared helper once it exists)

### FAZM-011 — Fix HTTP 200-on-unauthorized bug in `api/athlete/[id]`
**Area:** Security / API correctness
**Problem:** Returns `{error: "Unauthorized access"}` with no status code (defaults to 200).
**Solution:** Return proper 401/403.
**Priority:** P1
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-012 — Add ownership scoping to `AddAthleteGuardian` and audit `deleteCloudinaryImage`
**Area:** Security / Authorization
**Problem:** Any authenticated user can attach a guardian to any athlete; `deleteCloudinaryImage` is independently callable with no auth.
**Solution:** Add ownership/role check to `AddAthleteGuardian`; add a session check to `deleteCloudinaryImage` even though it's normally only called from an already-authorized flow.
**Priority:** P1
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-013 — Add auth check to `/api/settings/utils`
**Area:** Security
**Problem:** Fully unauthenticated, returns internal org configuration.
**Solution:** Require session.
**Priority:** P2
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-014 — Add role-based route gating at the layout level
**Area:** Security / Architecture
**Problem:** `(home)/layout.tsx` only checks session existence; any authenticated role can navigate to every page.
**Solution:** Add per-route-group or per-page role checks (paired with fixing the `AppRole` drift in FAZM-027).
**Priority:** P1
**Risk:** Medium (needs a clear role-to-route access matrix defined first)
**Complexity:** M
**Dependencies:** FAZM-027

### FAZM-015 — Remove/fix dead `ChangePassword` action
**Area:** Dead code / Security
**Problem:** `src/Modules/Auth/Auth.ts`'s `ChangePassword` is uncalled and non-functional as written.
**Solution:** Remove it, or rewrite correctly (pass `headers()`, use current-session identity only) and wire it up if a self-service password-change feature is wanted.
**Priority:** P2
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-016 — Untrack `src/generated/prisma` from git
**Area:** Dead code / repo hygiene
**Problem:** 39 generated Prisma client files are committed despite a commented-out `.gitignore` rule.
**Solution:** Uncomment the gitignore line, `git rm -r --cached src/generated`, ensure `prisma generate` runs in the build/CI pipeline.
**Priority:** P1
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-017 — Remove zero-usage dependencies
**Area:** Dependencies
**Problem:** `yarn` (as a dependency), `csv-parser`, `@stepperize/react`, `react-resizable-panels`, `use-debounce`, `axios` have zero or near-zero real usages.
**Solution:** Remove after a final targeted grep per package; replace the one `axios` call site with `fetch`.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-018 — Move misplaced dependencies to devDependencies
**Area:** Dependencies
**Problem:** `@types/pg`, `papaparse`, and possibly `tsx` are in `dependencies` but are dev/build/seed-only concerns.
**Solution:** Move `@types/pg` and `papaparse` now; move `tsx` once the cron-mechanism decision (FAZM-021) confirms it isn't needed at runtime.
**Priority:** P3
**Risk:** Low
**Complexity:** XS
**Dependencies:** FAZM-021 (for `tsx` specifically)

### FAZM-019 — Consolidate duplicated billing/date-math helpers
**Area:** Architecture / Dead code
**Problem:** `nextMonthlyBillingDate`/`clampToDay`/`daysInMonth`/`nextBillingByInterval` are hand-copied across `OnBoarding.ts`, `cron-jobs/subscriptions/route.ts`, and `cron/tasks.ts`.
**Solution:** Extract to `src/lib/billing.ts`, update all call sites to import it.
**Priority:** P1
**Risk:** Medium (must preserve exact date-edge-case behavior — add the unit tests from FAZM-035 first or alongside)
**Complexity:** M
**Dependencies:** FAZM-035 (tests to pin current behavior before refactoring)

### FAZM-020 — Introduce shared `requireSession`/`requireRole` authorization helpers
**Area:** Architecture
**Problem:** Every server action/route repeats its own session/role-check logic, inconsistently.
**Solution:** Add `src/lib/authz.ts` with `requireSession()`/`requireRole()`; migrate server actions/routes onto it incrementally (module by module).
**Priority:** P1
**Risk:** Medium (wide blast radius — do as tracked per-module PRs)
**Complexity:** L
**Dependencies:** None (should follow shortly after Phase 0's individual fixes, per `13-v2-roadmap.md`)

### FAZM-021 — Decide and consolidate on one cron mechanism
**Area:** Architecture
**Problem:** Two parallel systems (`cron/worker.ts`+`tasks.ts` vs. `api/cron-jobs/*`) implement overlapping logic; unclear which is deployed.
**Solution:** Confirm with deployment owner which is live; port any logic only present in the other; delete the unused mechanism.
**Priority:** P1
**Risk:** Medium (requires confirming production deployment configuration — see flagged assumption in `12-v2-architecture.md`)
**Complexity:** M
**Dependencies:** A deployment-configuration answer from whoever owns infra (not resolvable from code alone)

### FAZM-022 — Add shared `ActionResult` type and `apiError`/`apiSuccess` helpers
**Area:** Architecture / Code quality
**Problem:** `ActionResult`-shaped type re-declared in 7+ files; API routes return inconsistent error envelopes.
**Solution:** Add `src/types/ActionResult.ts` and `src/lib/api-response.ts`; migrate call sites.
**Priority:** P2
**Risk:** Low
**Complexity:** M
**Dependencies:** None

### FAZM-023 — Add root and per-segment `error.tsx`/`global-error.tsx`
**Area:** Next.js / UX
**Problem:** Zero error boundaries exist anywhere in the app.
**Solution:** Add a root `error.tsx` and `global-error.tsx`; add per-segment ones for the data-heavy routes named in `05-nextjs-react-audit.md`/`10-ux-review.md`.
**Priority:** P1
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-024 — Add missing `loading.tsx` for data-heavy routes
**Area:** Next.js / UX
**Problem:** ~11 route segments lack `loading.tsx`, including the dashboard root.
**Solution:** Add `loading.tsx` skeletons for the routes listed in `10-ux-review.md`.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-025 — Fix `transactions` page pagination regression
**Area:** Performance / Database
**Problem:** `transactions/page.tsx` loads the entire `Finance` table unpaginated; `ViewAllFinances.tsx` paginates client-side over the full dataset.
**Solution:** Restore server-side `skip`/`take`/`orderBy` matching every sibling list page's pattern; move search/filter to server-side query params.
**Priority:** P1
**Risk:** Medium (UI rework needed for filter/search to work server-side)
**Complexity:** M
**Dependencies:** None

### FAZM-026 — Migrate `players` list to SSR + initialData pattern
**Area:** Next.js / Performance
**Problem:** `AthletesData.tsx` does 100% client-side fetching via react-query, unlike every other list page.
**Solution:** Follow the pattern already correct in `invoices/page.tsx` — server-fetch first page with cursor pagination, pass `initialData` into the client component.
**Priority:** P2
**Risk:** Medium (likely highest-traffic page — test thoroughly)
**Complexity:** M
**Dependencies:** None

### FAZM-027 — Fix `AppRole`/`ROLES` drift in `SideBarItems.tsx`
**Area:** Code quality / UX
**Problem:** Frontend `AppRole` union includes a nonexistent `STAFF` role and omits the real `DOCTOR` role.
**Solution:** Import the Prisma `ROLES` enum directly instead of hand-declaring a parallel union; add `DOCTOR` sidebar configuration.
**Priority:** P1
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-028 — Type the shared table component's `filterFn`/`mapRow` props generically
**Area:** Code quality
**Problem:** ~7 files cast `filterFn`/`mapRow` props as `any` due to the shared table component's props not being generic.
**Solution:** Add proper generic typing to the shared table component; remove the `any` casts at each call site.
**Priority:** P2
**Risk:** Low
**Complexity:** M
**Dependencies:** None

### FAZM-029 — Migrate `global.d.ts` onto `satisfies Prisma.XArgs` pattern
**Area:** Code quality
**Problem:** Hand-written, drifted global DTOs (duplicate `Athlete` interface, stray-whitespace enum literals, references to nonexistent fields).
**Solution:** Migrate each interface's consumers onto the derived-type pattern already used in 6 modules; delete stale interfaces once unreferenced.
**Priority:** P2
**Risk:** Low
**Complexity:** L (touches many call sites, but each is mechanical)
**Dependencies:** None

### FAZM-030 — Type `whereClause` in `api/export/route.ts` and `period` cast in `api/stats/route.ts`
**Area:** Code quality / Security
**Problem:** `whereClause: any` repeated 7x; `period as any` cast.
**Solution:** Type against `Prisma.XWhereInput`; use a type-guard/`as const` union for the period check.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-031 — Establish Prisma migration history
**Area:** Database
**Problem:** No `prisma/migrations` directory exists; schema has been synced via `db push`.
**Solution:** Baseline via `prisma migrate dev --create-only`, hand-review against the live schema, adopt `prisma migrate deploy` in CI going forward.
**Priority:** P0
**Risk:** High (first-time migration baselining against a live production database)
**Complexity:** M
**Dependencies:** None, but should happen before any other schema-touching backlog item (FAZM-032, 033, 038-041)

### FAZM-032 — Migrate `Finance.amountPaid`/`Expenses.amount` from Float to Decimal
**Area:** Database / Finance correctness
**Problem:** Money stored as `Float` in two places while every sibling field correctly uses `Decimal(10,2)`.
**Solution:** Schema migration + data backfill to convert existing float values to decimal without precision loss.
**Priority:** P0
**Risk:** Medium-High (data migration on financial data)
**Complexity:** M
**Dependencies:** FAZM-031

### FAZM-033 — Replace `count()`-based invoice/receipt numbering with atomic sequence
**Area:** Database
**Problem:** Racy sequence generation for `Invoice.invoiceNumber` and `Finance.receiptNumber`, protected only incidentally by a unique constraint.
**Solution:** Follow the pattern already correctly used for `athleteId` (`AthleteSequence`, atomic `increment`).
**Priority:** P1
**Risk:** Medium
**Complexity:** M
**Dependencies:** FAZM-031

### FAZM-034 — Add missing indexes on FK columns
**Area:** Database
**Problem:** `training`, `attendance`, `Assessment`, `AssessmentMetric`, `AssessmentResponse` are missing indexes on frequently-joined FK columns.
**Solution:** Add `@@index` per `04-database-audit.md`'s list.
**Priority:** P1
**Risk:** Low
**Complexity:** S
**Dependencies:** FAZM-031

### FAZM-035 — Unit tests for onboarding date-clamping logic
**Area:** Testing
**Problem:** Leap-year/month-end billing date math has documented known edge cases and zero tests.
**Solution:** Table-driven unit tests for `nextMonthlyBillingDate`/`clampToDay`/`daysInMonth` before/while extracting them (FAZM-019).
**Priority:** P1
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-036 — DB-integration test for concurrent invoice payments
**Area:** Testing
**Problem:** No test exists for the confirmed lost-update race in `CreateTransaction.ts`.
**Solution:** Add a Postgres-backed integration test that fires two concurrent payments against the same invoice and asserts both are reflected in the final balance.
**Priority:** P0
**Risk:** Low
**Complexity:** M
**Dependencies:** Test infrastructure (Vitest + Postgres test container) must exist first — bundle with FAZM-042

### FAZM-037 — DB-integration test for concurrent coupon redemption
**Area:** Testing
**Problem:** No test exists for the confirmed coupon usage-limit bypass.
**Solution:** Add an integration test firing concurrent coupon applications against a `usageLimit: 1` coupon and asserting only one succeeds.
**Priority:** P0
**Risk:** Low
**Complexity:** M
**Dependencies:** FAZM-042

### FAZM-038 — Attendance upsert idempotency test
**Area:** Testing
**Problem:** No test verifies correct behavior under concurrent/duplicate attendance submissions.
**Solution:** DB-integration test against `MarkAttendanceAction.ts` and the `@@unique([trainingId, athleteId])` constraint.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** FAZM-042

### FAZM-039 — Assessment scoring transaction-integrity test
**Area:** Testing
**Problem:** No test covers partial-failure behavior when writing an `Assessment` plus N `AssessmentResponse` rows.
**Solution:** DB-integration test simulating a stale metric FK mid-write.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** FAZM-042

### FAZM-040 — Role-boundary API tests for IDOR findings
**Area:** Testing / Security
**Problem:** No tests exist verifying a `COACH`-role session cannot access another coach's/athlete's data.
**Solution:** Add tests alongside each fix in FAZM-001–004, 010.
**Priority:** P0
**Risk:** Low
**Complexity:** M
**Dependencies:** FAZM-001, 002, 003, 004, 010

### FAZM-041 — Batch/training deletion cascade test
**Area:** Testing / Database
**Problem:** `onDelete` behavior is implicit/undocumented for several `training`/`Batches`-adjacent relations.
**Solution:** DB-level test confirming deletion behavior matches intent; make `onDelete` explicit in the schema per FAZM-034's companion work.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** FAZM-031

### FAZM-042 — Stand up test infrastructure (Vitest + Postgres test container)
**Area:** Testing
**Problem:** No test framework or CI exists at all.
**Solution:** Add Vitest config, a docker-compose/testcontainers Postgres service for integration tests, and a basic CI workflow running both.
**Priority:** P0
**Risk:** Low
**Complexity:** M
**Dependencies:** None — this is the prerequisite for FAZM-036 through 041

### FAZM-043 — Add audit logging for login/logout and role-change events
**Area:** Observability / Security
**Problem:** `src/lib/audit.ts` is used for many mutations but not for authentication events or role changes themselves.
**Solution:** Add `createAuditLog` calls at the relevant better-auth hooks and in `AdminEditStaffProfile`'s role-update path.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-044 — Consolidate duplicate spinners, formatters, and alert/toast systems
**Area:** Dead code / UX
**Problem:** 3 spinner implementations, no shared currency/date formatter, sweetalert2 (39 files) vs sonner (9 files) coexisting.
**Solution:** One spinner component, `src/lib/format.ts`, standardize on `sonner` for simple notifications.
**Priority:** P3
**Risk:** Low
**Complexity:** M
**Dependencies:** None

### FAZM-045 — Add shared `FormModal` and empty-state components
**Area:** UX / Architecture
**Problem:** Every edit/create modal rolls its own dialog boilerplate; no shared empty-state component exists.
**Solution:** Extract one `FormModal` primitive and one empty-state component; migrate the modals named in `03-dead-code.md`/`10-ux-review.md`.
**Priority:** P3
**Risk:** Low
**Complexity:** M
**Dependencies:** None

### FAZM-046 — Dynamically import `@react-pdf/renderer` components
**Area:** Performance
**Problem:** `TransactionDetails.tsx`, `InvoiceDocument.tsx`, `ReceiptPDF.tsx` statically import a heavy PDF library at module scope.
**Solution:** Wrap in `next/dynamic(..., {ssr: false})` where used only behind a button/modal.
**Priority:** P2
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-047 — Add `staleTime`/`gcTime` to global QueryClient config
**Area:** Performance
**Problem:** `ReactQueryClientProvider.tsx` sets `retry: 0` and no `staleTime`, causing refetch-on-every-mount even for near-static data.
**Solution:** Set a sane default `staleTime` (e.g. 30s–5min); override per-query for volatile data; reconsider `retry: 0`.
**Priority:** P2
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-048 — Add caching for dashboard and reference data
**Area:** Performance
**Problem:** Dashboard runs 13 queries per request with no caching; academy settings/dropdown data re-queried every time.
**Solution:** `unstable_cache` with tag-based invalidation tied to the relevant mutations.
**Priority:** P2
**Risk:** Medium (cache-invalidation bugs are the main risk — test explicitly)
**Complexity:** M
**Dependencies:** None

### FAZM-049 — Design and migrate a shared `Guardian` entity
**Area:** Domain model / Database
**Problem:** Guardians are duplicated per-athlete rather than represented as a shared entity — families with multiple enrolled children get redundant, driftable data.
**Solution:** New `Guardian` model + join table; de-duplication backfill script (manual-review-assisted, not fully automated) from existing `AthleteGuardian` rows; keep old columns until verified, then drop.
**Priority:** P2
**Risk:** High (heuristic de-duplication of real family data)
**Complexity:** XL
**Dependencies:** FAZM-031

### FAZM-050 — Add `Season`/`BillingPeriod` entity
**Area:** Domain model / Database
**Problem:** `Finance.billingCycle` is a free-text string standing in for a real period concept.
**Solution:** New `Season`/`BillingPeriod` model; migrate existing string values to relations.
**Priority:** P3
**Risk:** Medium
**Complexity:** L
**Dependencies:** FAZM-031

### FAZM-051 — Convert `Athlete.dateOfBirth` to `DateTime`, derive `age`
**Area:** Domain model / Database
**Problem:** `dateOfBirth` is a `String`; `age` is separately stored and can drift, requiring a dedicated cron job to stay correct.
**Solution:** Schema migration to `DateTime`, data migration parsing existing string values (the app already has a `parseDob`-style parser in `cron-jobs/update-age/route.ts` to reuse/adapt), derive age on read, remove the `update-age` cron job once done.
**Priority:** P2
**Risk:** Medium (existing DOB strings may have inconsistent formats — the current parser already handles multiple formats, reuse it for the migration)
**Complexity:** L
**Dependencies:** FAZM-031

### FAZM-052 — Add batch-scoped role assignment for coaches
**Area:** Domain model / Security
**Problem:** `ROLES` is flat/global; a `COACH` has no enforced scoping to their own batches.
**Solution:** New `CoachBatchAssignment` join table; add a `requireOwnership()`-style check (extending FAZM-020's helpers) enforcing it.
**Priority:** P2
**Risk:** Medium
**Complexity:** L
**Dependencies:** FAZM-020, FAZM-031

### FAZM-053 — Pin exact versions for bleeding-edge dependencies
**Area:** Dependencies
**Problem:** Next 16.1.0, React 19.2.3, Prisma 7.2.0 are all very recent majors, currently on `^` ranges.
**Solution:** Pin exact versions for `next`, `react`, `react-dom`, `@prisma/client`, `prisma`; upgrade deliberately rather than via transitive drift.
**Priority:** P3
**Risk:** Low
**Complexity:** XS
**Dependencies:** None

### FAZM-054 — Add per-route `metadata` exports
**Area:** UX / Next.js
**Problem:** Only the root layout has `export const metadata`; every route shows the same generic browser tab title.
**Solution:** Add lightweight static `metadata` per route.
**Priority:** P3
**Risk:** Low
**Complexity:** S
**Dependencies:** None

### FAZM-055 — Wire up the `/stats` page to the existing `/api/stats` route
**Area:** UX / Dead code
**Problem:** `stats/page.tsx` is an unbuilt placeholder despite a fully-built, role-checked, paginated `api/stats/route.ts` already existing.
**Solution:** Build the UI page consuming the existing API route.
**Priority:** P3
**Risk:** Low
**Complexity:** M
**Dependencies:** None
