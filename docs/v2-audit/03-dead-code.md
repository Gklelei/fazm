# 03 — Dead Code & Repository Cleanup

All findings below are grep/reference-based leads. Per audit rule #4 ("verify call sites before declaring code dead"), none of this should be deleted without a final targeted search immediately before removal — dynamic imports, re-exports, or a build script can hide a real usage from a simple grep.

## Confirmed / high-confidence dead or misplaced code

- **`src/generated/prisma` (39 files) is committed to git.** `.gitignore` has the exclusion present but **commented out** (twice: `# /src/generated/prisma`). This is Prisma's generated client output — it should never be tracked, since it's fully reproducible from `prisma generate` and committing it (a) bloats the repo, (b) causes merge-conflict noise on every schema change, and (c) risks drift between the committed generated code and the actual schema if someone edits the schema without regenerating. **Fix:** uncomment the gitignore line, `git rm -r --cached src/generated`, ensure `prisma generate` runs as part of the build/CI pipeline.
- **`src/Modules/Auth/Auth.ts`'s `ChangePassword` server action** is not called from anywhere else in the codebase (only its own definition matched in a repo-wide grep). It is also functionally broken as written (calls `auth.api.setPassword` without passing `headers`, so it has no session context to act on) — see `02-security-audit.md` A2. **Fix:** remove it, or rewrite it correctly and wire it up if a "change my own password" feature is intended.
- **`yarn` listed under `dependencies` in `package.json`** — a package manager should never be a project dependency. **Fix:** remove it.
- **Dependencies with zero matched usages in `src/`:** `csv-parser`, `@stepperize/react`, `react-resizable-panels`, `use-debounce` (a hand-rolled equivalent, `src/utils/Debounce.ts`, is used in its place in 4 files). See `08-dependencies.md` for the full dependency-level writeup.

## Duplicated logic (not unused, but should be consolidated — not dead, REFACTOR)

- **Billing/date-math helpers** (`nextMonthlyBillingDate`, `clampToDay`, `daysInMonth`, `nextBillingByInterval`) are hand-copied across three files: `src/Modules/Users/AthletesOnboarding/Server/OnBoarding.ts`, `src/app/(server)/api/cron-jobs/subscriptions/route.ts`, and `src/cron/tasks.ts`. This is the most impactful duplication in the codebase — a bug fix in one place silently doesn't apply to the other two. Extract to one shared `src/lib/billing.ts`.
- **Two parallel cron-scheduling mechanisms**: `src/cron/worker.ts`+`tasks.ts` (standalone `node-cron` process) and `src/app/(server)/api/cron-jobs/*/route.ts` (HTTP endpoints, `CRON_SECRET`-guarded, apparently meant for an external scheduler). It's not evident from the code which one is actually deployed. This should be resolved — pick one — before further cron logic is added.
- **Three loading-spinner implementations**: `src/utils/Alerts/Loader2Spinner.tsx`, `src/utils/Alerts/PageLoader.tsx`, `src/components/ui/spinner.tsx`, plus ad hoc inline `Loader2` usage in several forms.
- **No shared currency/date formatter.** Formatting logic (`Intl.NumberFormat`, date formatting) is inlined ad hoc in `src/Modules/Finances/Ui/ViewSubscriptions.tsx`, `src/Modules/Users/stafff/Ui/ViewStaffPage.tsx`, and `src/utils/TansformWords.ts` (note the typo in this filename — worth a rename while touching it).
- **Two competing alert/notification systems**: `sweetalert2` (used in 39 files, via a wrapper at `src/utils/Alerts/Sweetalert.tsx`) and `sonner` (9 files). These aren't purely redundant (sweetalert2 = blocking modal-style confirms, sonner = toast notifications) but the split looks accidental rather than deliberate.
- **Modal wrapper duplication**: `EditExpenseCategory.tsx`, `src/Modules/Finances/Ui/EditTransactionModal.tsx`, `PaymentModal.tsx`, `UserProfile/ProfileModal.tsx` each roll their own dialog boilerplate around Radix `Dialog` rather than sharing one `FormModal`/`ConfirmModal` primitive. Lower priority than the items above since each also carries distinct domain form logic.
- **No shared "empty state" component** — every list view inlines its own "no data" text/markup. Not dead code, but worth adding one shared component during any table-component consolidation work.

## Commented-out code

A repo-wide sweep for large commented-out blocks found this is **not a widespread problem** — the one notable case is a ~21-line `/* ... */` block in `src/Modules/Finances/Invoices/Server/ApplyDiscounts.ts`, worth a manual look to confirm it's safe to delete versus intentional reference documentation.

## Type-layer duplication (see also `07-code-quality.md`)

Root `global.d.ts` (~313 lines) hand-declares DTOs (`Athlete`, `AthleteGuardian`, `AthleteMedical`, `finances`, `TrainingSession`, `Coach`, `GuardiansResponse`, etc.) that duplicate the Prisma schema by hand and have already drifted from it — including fields (`subscriptionStartDate`/`subscriptionEndDate`) that don't exist on the current `Finance`/`Invoice` models at all, a duplicate `Athlete` interface with a duplicate property inside itself, and enum-like string literals with stray leading whitespace that can never match real data. The correct pattern (`satisfies Prisma.XArgs` + derived `GetPayload` types) already exists and is used in 6 modules (`Users/Types`, `Coupons/Types`, `Expenses/Types`, `Finances/Invoices/Types`, `Trainings/Assesments/Types`, `Trainings/Types`) — `global.d.ts` should be migrated onto this pattern and its stale interfaces deleted, not "cleaned up" in place.

## What was checked and found to be actively used (do not remove)

`Loader2Spinner` (17 references), `PageLoader` (14), `GenericSelect` (8), `SearchSelect` (3), `TansformWords` (17 — keep the function, consider renaming the file), `createAuditLog` (19), `checkExpiredSubscriptions` (2 — only referenced within the `tasks.ts`/`worker.ts` pair, which reinforces the cron-duplication finding above rather than indicating dead code).

## Recommended cleanup order for V2

1. Remove `src/generated/prisma` from git tracking (mechanical, zero risk, immediate repo-hygiene win).
2. Remove the confirmed-zero-usage dependencies (`yarn` from `dependencies`, `csv-parser`, `@stepperize/react`, `react-resizable-panels`, `use-debounce`) after a final targeted grep per package.
3. Delete or fix `ChangePassword`.
4. Consolidate the billing/date-math helpers and resolve the dual-cron-mechanism ambiguity — do this before writing any new billing or cron logic, since new code would otherwise get added to the wrong copy.
5. Migrate `global.d.ts` onto the `satisfies Prisma.XArgs` pattern; delete the stale hand-written interfaces once call sites are updated.
6. Lower priority: consolidate spinners, formatters, and the two alert systems as part of a general UI-component pass (see `10-ux-review.md`).
