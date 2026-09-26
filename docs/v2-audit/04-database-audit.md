# FAZM Prisma/DB Audit Report

## Schema Model Map (brief)
- **User.prisma**: `User` (role enum ROLES), `Session`, `Account`, `Verification` — Better-Auth tables.
- **staff.prisma**: `staff` (1:1 with User via userId; own business key `staffId`).
- **Athlete.prisma**: `Athlete` (business key `athleteId`), `AthleteSequence` (singleton counter), `AthleteGuardian`, `AthleteMedicalAndEmergency`, `AthleteAddress`, `AthleteEmergencyContact`.
- **Training.prisma**: `training`, `Batches`, `BatchSchedule`, `drills`, `attendance`, `TrainingLocations`, `TRAINING_ATTENDANCE_REASONS`.
- **Assesment.prisma**: `Assessment`, `AssessmentTemplateSection`, `AssessmentMetric`, `AssessmentResponse`.
- **Finance.prisma**: `SubscriptionPlan`, `AthleteSubscription`, `Invoice`, `Finance` (payments), `Coupon`, `Expenses`, `ExpenseCategories`.
- **AuditLog.prisma**: `AuditLog` (polymorphic-ish, one nullable FK per resource type).
- **Utils.prisma**: `academy` (single-row config, no enforced singleton constraint).
- **Migrations**: `prisma/migrations` directory does not exist at all.

---

## Schema Design Issues

**[CRITICAL] Money stored as `Float`** — `prisma/schema/Finance.prisma:177` (`Finance.amountPaid Float`) and `:238` (`Expenses.amount Float`). Every other monetary field (`Invoice.amountDue/amountPaid`, `SubscriptionPlan.amount`, `Coupon.value`) correctly uses `Decimal(10,2)`. Float arithmetic on payments will accumulate rounding errors and can cause balance mismatches between `Finance` totals and `Invoice.amountPaid`.

**[HIGH] Inconsistent FK targets — business keys mixed with primary keys**: Most relations to `Athlete` target the secondary unique field `athleteId` instead of the primary key `id` — e.g. `AthleteGuardian.athlete` (`Athlete.prisma:59`), `attendance.athlete` (`Training.prisma:101`), `Assessment.athlete` (`Assesment.prisma:6`), `AthleteSubscription.athlete` (`Finance.prisma:67`), `Invoice.athlete` (`Finance.prisma:114`), `Finance.athlete` (`Finance.prisma:172`) — while `AthleteAddress.athlete` and `AthleteEmergencyContact.athlete` (`Athlete.prisma:84,95`) target `id`. Same duplication for staff: `training.coach` and `Assessment.coach` target `staff.staffId` (`Training.prisma:17`, `Assesment.prisma:12`) rather than `staff.id`. This is inconsistent, joins on string business keys instead of UUID/cuid PKs are less efficient, and it creates two "identities" per entity that must always stay in sync — a fragile pattern for a V2 rewrite to normalize onto PK-based FKs everywhere.

**[HIGH] Missing indexes on FK columns used for joins**: `training` model (`Training.prisma:1-28`) has **no `@@index`** at all — `batchesId`, `staffId`, `trainingLocationsId` are all queried/joined but unindexed. `attendance` (`Training.prisma:91-108`) only has the composite `@@unique([trainingId, athleteId])`; `coachId` and `reasonId` have no index, so "attendance by coach" queries will scan. `Assessment` (`Assesment.prisma:1-21`) has no index on `coachId`. `AssessmentMetric.sectionId` and `AssessmentResponse.metricId` (`Assesment.prisma:35,45`) are unindexed FKs too.

**[MEDIUM] Missing uniqueness/business constraints**:
- No unique constraint preventing two concurrently-`ACTIVE` `AthleteSubscription` rows for the same athlete (`Finance.prisma:62-105`) — nothing stops double-subscribing an athlete.
- `BatchSchedule` (`Training.prisma:55-67`) has no `@@unique([batchId, dayOfWeek, time])`, so duplicate recurring-schedule rows can be created.
- `academy` (`Utils.prisma:1-17`) is a singleton config table with no constraint enforcing a single row — multiple rows could silently be inserted, and app code reading "the" academy row would pick an arbitrary one.
- Good: `attendance @@unique([trainingId, athleteId])` and `Assessment @@unique([athleteId, trainingId])` correctly prevent duplicate attendance/assessment records. `User.email` and `Athlete.email` are both `@unique` (Athlete's is nullable-safe under Postgres multi-NULL semantics).

**[MEDIUM] Nullable/typed-field issues**:
- `Athlete.dateOfBirth` is `String`, not `DateTime` (`Athlete.prisma:9`) — blocks date-range queries/sorting and duplicates logic already used for age calculation in app code.
- `Athlete.height`, `weight`, `foot`, `hand` are all free-text `String` (`Athlete.prisma:17-20`) instead of numeric types / enums — no validation at the DB layer, "foot"/"hand" should be enums.
- `Expenses.status` is `String?` with the real `EXPENSE_STATUS` enum commented out (`Finance.prisma:240`) — type safety was deliberately dropped.
- `Coupon.status` and `Coupon.voided`, `drills.voided` are `Int` flags with comments explaining 1/0 semantics (`Finance.prisma:222-223`, `Training.prisma:84`) instead of `Boolean` or a proper enum — poor self-documentation and inconsistent with `Athlete.isArchived`/`Finance.isArchived` boolean pattern used elsewhere.

**[MEDIUM] Inconsistent onDelete behavior**: `Finance.athlete` explicitly uses `onDelete: Restrict` (`Finance.prisma:172`), and profile sub-tables (`AthleteGuardian`, `AthleteMedicalAndEmergency`, `AthleteAddress`, `AthleteEmergencyContact`) use `onDelete: Cascade`, but `attendance`, `Assessment`, `training.athletes`(implicit m2m), `Invoice.athlete`, `AthleteSubscription.athlete` specify no `onDelete` at all, relying on Prisma/DB defaults. This mixture makes actual delete behavior for "delete an Athlete" undocumented and DB-default-dependent; a V2 schema should make every `onDelete` explicit.

**[LOW] Naming inconsistency**: model names mix PascalCase (`Athlete`, `Invoice`, `Coupon`) and lowercase (`training`, `staff`, `drills`, `attendance`, `academy`); field `Batches.sessions` vs `training.batch` (`Training.prisma:15,42`) for the same relation; `AuditLog.academyId` (`AuditLog.prisma:27`) has no matching relation to `academy` at all — it's a dangling, non-FK-enforced field.

**[LOW] Overly-coupled AuditLog**: one nullable FK column per possible resource type (`AuditLog.prisma:6-26`) — a wide, sparse table that grows a new column every time a new auditable resource is added; a polymorphic `(resourceType, resourceId)` pair (traded off against FK integrity) or a generic JSON payload would scale better and is worth reconsidering for V2 given the unbounded `findMany` issue below.

---

## Transaction/Concurrency Issues

**[CRITICAL] Lost-update race in payment recording** — `src/Modules/Finances/Server/CreateTransaction.ts:36-118`. `existingInvoice` is fetched **before** `db.$transaction` starts (line 38), and inside the transaction the new `amountPaid`/status are computed from that *stale* snapshot (`totalPaidSoFar = Number(existingInvoice.amountPaid) + newPaymentAmount`, line 83-84) instead of re-reading the invoice inside the transaction. Two concurrent payments against the same invoice (e.g., two staff members receipting cash) will both compute `totalPaidSoFar` from the same starting balance, and the second write overwrites the first — a payment is silently lost from `Invoice.amountPaid` even though both `Finance` receipt rows exist. Fix: re-fetch (`ctx.invoice.findUnique` or use `ctx.invoice.update` with a decrement-based conditional `WHERE`) inside the transaction, or use `SELECT ... FOR UPDATE`/optimistic locking.

**[CRITICAL] Coupon usage limit never enforced/incremented for subscriptions** — `src/Modules/Users/AthletesProfile/EditUserProfile/Server/ApplyCoupon.ts` (`ApplyCouponToAtheleteSubscriptionPlan`, lines 34-124). The function checks `coupon.usageLimit`/`timesUsed` (lines 66-68) but the eventual write (`db.athleteSubscription.update`, line 106) never increments `Coupon.timesUsed`. Contrast with `src/Modules/Finances/Invoices/Server/ApplyDiscounts.ts:228-254`, which correctly does an atomic `updateMany` guarded by `timesUsed: { lt: usageLimit }` inside a transaction. Net effect: a limited-use coupon applied to subscriptions can be reused indefinitely, and the whole read-check-then-write sequence in `ApplyCoupon.ts` runs with **no `$transaction`** at all (separate `db.coupon.findUnique`, `db.athleteSubscription.findUnique`, `db.athleteSubscription.update` calls, lines 37, 70, 106) — concurrent requests can both pass the "already has different coupon" check before either commits.

**[HIGH] Non-atomic, racy sequence-number generation for invoices/receipts**:
- `src/Modules/Users/AthletesOnboarding/Server/OnBoarding.ts:157-162` — invoice number `INV-{date}-{count+1}` derived from `ctx.invoice.count(...)` inside the transaction, but under Postgres's default READ COMMITTED isolation two concurrent onboarding transactions can both count the same "today" total and generate the same `invoiceNumber`. The `@unique` constraint on `Invoice.invoiceNumber` will reject the second insert, but the whole $50k-line transaction is aborted for a spurious "duplicate" reason with no retry (mapped only generically to `P2002`, line 336-341).
- `src/Modules/Finances/Server/CreateTransaction.ts:76-81` — identical pattern for `Finance.receiptNumber` (`FEES-{date}-{count}`), same race, same unique-constraint-dependent (not designed-in) protection.
- Recommend a DB sequence/`AthleteSequence`-style atomic counter (like the one correctly used for `athleteId` at `OnBoarding.ts:165-170`, which does `update ... increment` and is safe) instead of `count()`-based numbering.

**[MEDIUM] N+1 write loop, no transaction, in cron job** — `src/cron/tasks.ts:45-74` (`deactivateInactiveAthletes`): fetches all `ACTIVE` athletes with subscriptions, then loops and calls `db.athlete.update` **once per athlete** (line 63) with no `$transaction`/`updateMany`. Should be a single `updateMany` on athlete IDs computed in JS, or restructured as a set-based query.

**[MEDIUM] N+1 read+write loop, no transaction — training/athlete sync cron** — `src/cron/tasks.ts:102-149` (`assignAthletesToTrainingSessions`): for every upcoming training session it issues a separate `db.athlete.findMany` (line 120) inside the loop, then a separate `db.training.update` (line 134) per session — classic N+1 plus per-item non-transactional writes. With many batches/sessions this multiplies query counts linearly and is not atomic (a crash mid-loop leaves some sessions synced and others not).

**[LOW] Audit log not part of the business transaction**: In `OnBoarding.ts:320-326`, `CreateTransaction.ts:120-127`, `CreateTrainingSession.ts:102-107`, and `CouponsAction.ts` (multiple), `createAuditLog(...)` is always called **after** `db.$transaction(...)` resolves, as a separate, un-transacted write. If the process crashes between the transaction commit and the audit call, or the audit insert itself fails, the audit trail silently diverges from actual data changes — acceptable for non-critical logging but worth flagging since compliance/financial audit trails are often expected to be consistent with the event they record.

**Good patterns observed** (for contrast): `CreateTrainingSession.ts:40-99` wraps the raw-SQL overlap checks + athlete-connect + create all inside one `$transaction`; `MarkAttendanceAction.ts:39-96` correctly validates roster membership and bulk-upserts attendance inside a single transaction (though see N+1 note below); `ApplyDiscounts.ts` correctly uses an atomic conditional `updateMany` to guard against exceeding `usageLimit`.

---

## N+1 / Performance Issues

**[HIGH] Fully unbounded `findMany` queries (no pagination) on tables that grow indefinitely**:
- `src/app/(home)/transactions/page.tsx:9-19` — loads **all** `Finance`, `Athlete`, and `Invoice` rows on every page render; `pageSize`/`take`/`orderBy` are explicitly commented out (lines 10, 14-15). This is a full-table scan+transfer on a page that will be hit constantly by finance staff.
- `src/Modules/Settings/AuditLogs/Types.ts:3-34` used by `src/Modules/Settings/AuditLogs/api/getAuditLogs.ts:6` — `db.auditLog.findMany(FetchAuditLogsQuery)` with **no `take`/`skip`**, plus 6 nested `include`s. `AuditLog` is an append-only, ever-growing table — this query will get progressively slower and is a clear production risk.
- Contrast: `src/app/(home)/invoices/page.tsx:7-19` and `src/app/(server)/api/athlete/athletes-all/route.ts:60-68` do correctly paginate with `take`/cursor `skip`.

**[MEDIUM] N+1 query patterns**: `src/cron/tasks.ts:102-131` (per-session `findMany` inside a loop over sessions) and `:60-69` (per-athlete `update` inside a loop) — see Transaction section above, same root cause is also a performance problem at scale (O(n) round trips instead of O(1) set-based operations).

**[LOW] `MarkAttendanceAction.ts:73-95`** issues one `ctx.attendance.upsert` per athlete via `Promise.all` inside a transaction — functionally correct and atomic, but for large rosters this is still N individual upsert statements rather than a single bulk `createMany`/raw upsert; acceptable at small squad sizes but worth revisiting if roster sizes grow.

---

## Migration Hygiene

**[CRITICAL for production readiness]** No `prisma/migrations` directory exists anywhere in the repo. `prisma.config.ts:8` does declare `migrations.path: "prisma/migrations"`, and a commented-out `seed` script references `SeedAthleteSequence.ts`/`SeedReasonsForAbsentism.ts`, indicating migrations were expected to be used — but none have ever been generated/committed. This strongly suggests the project has been run purely with `prisma db push` (or manual schema syncing) against dev/prod databases. Risks for a V2 rollout:
- No reviewable, versioned history of schema changes; can't reliably reproduce the current production schema from source control.
- `db push` can silently apply destructive changes (column drops/type narrowing) without the safety prompts/review that a migration file + `migrate deploy` pipeline gives you.
- No repeatable, auditable path to promote schema changes through dev → staging → prod.
- Recommendation: before V2 work begins, run `prisma migrate dev` to baseline the current schema into an initial migration (using `--create-only` + manual review against the live DB to avoid accidental drops), then adopt `prisma migrate deploy` in CI/CD going forward.

---

## SQL Injection Check

All raw SQL usage is parameterized via Prisma's tagged-template `$queryRaw`/`$executeRaw` (no `$queryRawUnsafe`/`$executeRawUnsafe` found in application code — only in generated client type declarations under `src/generated/prisma/`, which is not app code):
- `src/app/(server)/api/health/route.ts:5` — static `SELECT 1`, no interpolation.
- `src/Modules/Trainings/Server/CreateTrainingSession.ts:41-51,56-66` — user-controlled values (`parsedData.batch`, `parsedData.coach`, `start`, `end`) are passed as tagged-template substitutions, which Prisma parameterizes safely (not string-concatenated).
- `src/Modules/Trainings/Server/EditTrainingSessions.ts:52-66` — same safe tagged-template pattern.
- `src/app/(home)/players/user-profile/[id]/page.tsx:44-56` — static SQL with no user-input interpolation at all.

**No SQL injection risk identified** — all raw queries use Prisma's safe parameterized tagged-template form; no dynamic string building of SQL from request input was found.

---

## Summary of top priorities for V2
1. Fix the lost-update race in `CreateTransaction.ts` (re-read invoice inside transaction) — CRITICAL, real money bug.
2. Fix/redesign coupon redemption tracking in `ApplyCoupon.ts` to atomically enforce usage limits, matching `ApplyDiscounts.ts`'s pattern — CRITICAL.
3. Switch `Finance.amountPaid` / `Expenses.amount` from `Float` to `Decimal` — CRITICAL for financial correctness.
4. Add pagination to `transactions/page.tsx` and `AuditLogs` query — HIGH, production scalability.
5. Establish a real migration history before any further schema changes — CRITICAL for safe production operations.
6. Normalize FK targets onto primary keys (`Athlete.id`, `staff.id`) instead of business keys, and add missing indexes on `training`/`attendance`/`Assessment` FK columns — HIGH, schema soundness for V2.
