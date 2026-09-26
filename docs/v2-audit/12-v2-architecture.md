# 12 — V2 Architecture Proposal

This is a **target-state** description for the incremental migration in `13-v2-roadmap.md`, not a plan to rewrite the app. Per the audit's own findings, the module boundaries, the shared-Zod-validation pattern, and the domain model are largely sound — V2 architecture work is about **making the good patterns mandatory** rather than optional, and closing the specific gaps identified in the other reports.

## 1. One enforced authorization layer

**Problem:** No `middleware.ts` exists; every server action/route repeats its own `getSession()` call, and roughly 1 in 4 forgets or under-scopes it (`02-security-audit.md`).

**Target:** Introduce a small set of shared helpers in `src/lib/authz.ts`:

```ts
// Illustrative shape, not final code
async function requireSession(): Promise<Session> // throws/redirects if absent
async function requireRole(...roles: ROLES[]): Promise<Session> // requireSession + role check
async function requireOwnership(athleteId: string, session: Session): Promise<void> // for guardian-scoped access, once that role exists
```

Every server action and API route handler is updated to call one of these as its **first line**, replacing the current copy-pasted `const session = await auth.api.getSession(...)` pattern. This does not require `middleware.ts` (Next.js middleware can't easily do fine-grained per-resource role/ownership checks anyway), but a thin `middleware.ts` doing the top-level "is there a session at all" redirect for `(home)/*` would remove the need for every route/layout to repeat that specific check, and is worth adding alongside the helper functions.

**Why incrementally, not all at once:** each server action/route needs to be touched individually to add the call and pick the right role, so this is naturally a checklist-driven pass (see `V2_BACKLOG.md`), not a single refactor commit.

## 2. One shared `ActionResult` / API response contract

**Problem:** `ActionResult`-shaped `{success, message}` types are re-declared locally in 7+ files; `OnBoarding.ts` uses an incompatible shape; API routes return `{error}`, `{ok:false,error}`, raw strings, or plain-text `NextResponse` inconsistently (`01-current-architecture.md`, `07-code-quality.md`).

**Target:**
- One shared `src/types/ActionResult.ts` exported type, imported everywhere instead of redeclared.
- One shared `apiError(status, message)` / `apiSuccess(data)` helper in `src/lib/api-response.ts` for route handlers, always returning JSON with the correct status code (fixing, incidentally, the `api/athlete/[id]/route.ts` bug that returns an unauthorized response with HTTP 200).

## 3. One billing/date-math module, one cron mechanism

**Problem:** billing/date helpers are hand-copied across `OnBoarding.ts`, `cron-jobs/subscriptions/route.ts`, and `cron/tasks.ts`; two parallel scheduling mechanisms exist with no clarity on which is deployed (`03-dead-code.md`, `01-current-architecture.md`).

**Target:** Extract `nextMonthlyBillingDate`, `clampToDay`, `daysInMonth`, `nextBillingByInterval`, `calculateAge`-equivalents into `src/lib/billing.ts`, imported by all three current call sites. Decide on **one** cron mechanism (recommend the HTTP `cron-jobs/*` endpoints, since they're already `CRON_SECRET`-protected and don't require a long-running process alongside the Next.js deployment) and delete the other (`src/cron/worker.ts`/`tasks.ts`) once its logic is fully represented in the HTTP endpoints.

## 4. Financial correctness fixes (no architecture change, just correctness)

- Re-read the invoice balance **inside** the `$transaction` in `CreateTransaction.ts` rather than before it, closing the confirmed lost-update race.
- Make coupon redemption atomic and usage-limit-enforcing for subscriptions (`ApplyCoupon.ts`), matching the correct pattern already used in `ApplyDiscounts.ts` (conditional `updateMany` guarded by `timesUsed: {lt: usageLimit}` inside a transaction).
- Migrate `Finance.amountPaid` and `Expenses.amount` from `Float` to `Decimal(10,2)`, matching every other monetary field in the schema.
- Replace `count()`-based invoice/receipt numbering with an atomic sequence counter, following the pattern already correctly used for `athleteId` generation (`AthleteSequence`).

## 5. Database hardening

- Establish real Prisma migration history (`prisma migrate dev --create-only` baselined against the current production schema, reviewed by hand, then `prisma migrate deploy` in CI going forward) before any further schema changes land.
- Add the missing indexes identified in `04-database-audit.md` (`training.batchesId/staffId/trainingLocationsId`, `attendance.coachId/reasonId`, `Assessment.coachId`, `AssessmentMetric.sectionId`, `AssessmentResponse.metricId`).
- Normalize FK targets onto primary keys (`Athlete.id`, `staff.id`) instead of the current mix of business-key and PK targets — this is a larger, riskier migration and should be sequenced deliberately (see `13-v2-roadmap.md` Phase 3), not bundled with the index additions.
- Make `onDelete` behavior explicit on every relation rather than relying on Prisma/DB defaults.

## 6. Domain model additions (see `11-domain-review.md` for rationale)

- A shared `Guardian` entity with a join table to `Athlete`, replacing the current per-athlete-duplicated guardian rows — the highest-value, most consequential domain change identified in this audit.
- A `Season`/`BillingPeriod` entity to replace the free-text `Finance.billingCycle` string.
- Convert `Athlete.dateOfBirth` to `DateTime` and derive `age` on read instead of storing it separately (removing the need for the `update-age` cron job entirely).
- Batch-scoped role assignment for coaches (a `CoachBatchAssignment` join table), enabling both a real "my batches" product feature and a genuine ownership check for the authorization layer in item 1.

## 7. Frontend consistency

- One shared generic table component with properly generic-typed `filterFn`/`mapRow` props (removing ~15 `any` occurrences in one fix — `07-code-quality.md`).
- One shared `FormModal` primitive, one shared empty-state component, one spinner component, one currency/date formatter module (`src/lib/format.ts`).
- Standardize on one notification system (`sonner` recommended) for simple success/error toasts.
- Add root `error.tsx`/`global-error.tsx`, then per-segment `error.tsx`/`loading.tsx` for the currently-missing routes.
- Fix the `transactions` page to follow the server-pagination pattern every sibling page already uses; migrate `players` (`AthletesData.tsx`) to the SSR+initialData pattern already correctly implemented for `invoices`.

## 8. Type-safety consolidation

- Migrate `global.d.ts`'s hand-written, drifted DTOs onto the `satisfies Prisma.XArgs` + `GetPayload` pattern already used correctly in 6 modules; delete the stale interfaces once migrated.
- Fix the `AppRole`/`ROLES` drift in `SideBarItems.tsx` by importing the Prisma enum directly instead of hand-declaring a parallel union.

## Flagged assumptions

- This proposal assumes the app is deployed as a standard Next.js server (not fully static/edge) given the direct Prisma access from Server Components and route handlers throughout — worth confirming the actual deployment target before committing to the `unstable_cache`/ISR recommendations in `06-performance-audit.md`.
- The recommendation to keep the HTTP `cron-jobs/*` mechanism over the standalone `node-cron` worker assumes the deployment platform supports an external scheduler (e.g., Vercel Cron, a hosted cron service) hitting those endpoints; if the deployment is a single long-running server process instead, the standalone worker may be the better one to keep. **This should be confirmed with whoever owns deployment before Phase 2 work begins** — see `13-v2-roadmap.md`.
- No dev server was run and no UI was exercised in a browser as part of this audit (see caveats in `10-ux-review.md`); the frontend recommendations above are based on static code reading, not observed behavior.
