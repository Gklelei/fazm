# 09 — Testing Strategy

## Current state

**No test files, no test framework, and no CI exist anywhere in this repository.** A repo-wide search for `*.test.*`/`*.spec.*` (excluding `node_modules`) returns nothing; there is no `jest.config.*`, `vitest.config.*`, `playwright.config.*`, or `cypress.config.*`; there is no `.github/workflows` directory. **Test coverage is 0%.**

This matters more than it would in a typical CRUD app because this audit has already found a **confirmed money-losing race condition** (`04-database-audit.md`, `CreateTransaction.ts`), a **confirmed coupon usage-limit bypass** (`ApplyCoupon.ts`), and **at least 16 authorization gaps** (`02-security-audit.md`) — all of which a targeted test suite would have caught or would prevent from regressing once fixed.

## Highest-risk untested workflows (ranked)

1. **Attendance recording** (`attendance` model, `@@unique([trainingId, athleteId])`, `MarkAttendanceAction.ts`) — concurrent coach submissions against the same training roster need a test verifying idempotent, correct upsert behavior rather than relying on the unique constraint to fail loudly.
2. **Assessment scoring** (`src/Modules/Trainings/Assesments/server/CreateAssesment.ts`) — writes one `Assessment` plus N `AssessmentResponse` rows across a template; a partial failure mid-write (e.g., a metric FK gone stale after a template edit) needs a transactional-integrity test.
3. **Invoice → Finance (payment) reconciliation** (`CreateTransaction.ts`, `CreateSubscriptionFees.ts`, `EditSubscriptionFees.ts`) — `amountPaid`/`amountDue`/status transitions (PENDING→PARTIAL→PAID) are exactly the kind of money-math that silently drifts without unit tests, and this is the exact code path with the confirmed lost-update race. **This is the single highest-priority area to test.**
4. **Coupon application to subscriptions and invoices** (two separate code paths — `ApplyCoupon.ts` for subscriptions, `ApplyDiscounts.ts` for invoices) — no test of usage-limit enforcement or double-application across either path; this is the exact code path with the confirmed usage-limit bypass.
5. **Role-gated server actions / staff CRUD** — since roles are flat/global with no batch-scoped permission table, every authorization boundary is entirely in application code; without tests, a regression re-introducing one of the IDOR findings in `02-security-audit.md` would ship silently.
6. **Batch/training deletion cascades** — `onDelete` is not explicitly set on several `training`/`Batches`-adjacent relations (`04-database-audit.md`); a DB-level test should confirm deleting a batch doesn't orphan or unexpectedly cascade-delete attendance/assessment history.
7. **Athlete onboarding date logic** (`OnBoarding.ts`, with inline comments documenting known leap-year/month-end clamping edge cases) — the only place in the codebase with a comment flagging its own tricky logic; a small table-driven unit test over the clamping function would be cheap insurance.
8. **`/api/export` and `/api/stats` routes** — both build Prisma `where` filters using `whereClause: any` / casts (`07-code-quality.md`) with no test verifying the resulting filter actually matches the intended rows per role — a wrong filter here silently leaks or hides data across roles.

## Recommended pyramid for this app specifically

- **Unit tests (start here, fastest ROI):** the onboarding date-clamping logic (`OnBoarding.ts`), invoice/discount math (`CreateSubscriptionFees.ts`, `EditSubscriptionFees.ts`, `ApplyDiscounts.ts`), coupon discount calculation. Also: snapshot-style type tests on the `satisfies Prisma.XFindUniqueArgs` query objects (`Users/Types`, etc.) — these catch an accidental `include`/`select` removal at compile time already, but a runtime snapshot test adds a second layer of protection.
- **Database/integration tests** (Prisma against a real Postgres instance — e.g., via `testcontainers` or a docker-compose test service, **not** a mocked Prisma client): attendance unique-constraint behavior under concurrent upserts, the assessment create-with-responses transaction, invoice/finance status transitions under concurrent payments (this is what would have caught the confirmed race), coupon usage-limit enforcement under concurrent redemption. These all depend on real database constraints (`@@unique`, cascade behavior, transaction isolation) that a mocked client cannot exercise.
- **API/server-action tests:** assert role boundaries directly — e.g., a `COACH`-role session cannot fetch or mutate another coach's batch/athlete/invoice by ID; assert `/api/export` and `/api/stats` return only the rows a given role should see.
- **End-to-end tests (thin — 3 to 5 flows, Playwright):** athlete onboarding form submission end-to-end, marking attendance for a training session, recording a payment against an invoice. These are the three workflows staff use daily and touch the most modules at once.

## Pragmatic first step

Given zero existing infrastructure, the first practical PR is:
1. Add Vitest (unit tests) and a Postgres test container (integration tests) to the project.
2. Write DB-integration tests for items 1–4 above — these directly cover the two confirmed financial-correctness bugs and give a safety net for fixing them.
3. Add API/role-boundary tests for the confirmed IDOR findings in `02-security-audit.md`, ideally written *before* fixing each one, so the fix can be verified as closing the gap and the test then guards against regression.
4. Only after 1–3 are in place, add the thin E2E layer.

Do not attempt to backfill broad unit-test coverage over the whole codebase first — start with the workflows above, where the audit has already identified concrete, confirmed defects.
