# 07 — TypeScript & Code Quality Audit

## `tsconfig.json`

`strict: true` is set — a good baseline. There is no explicit `noUncheckedIndexedAccess`, `noImplicitOverride`, or `exactOptionalPropertyTypes` — reasonable defaults for a Next.js app of this size; not a priority gap relative to everything else in this report.

## `any` / `as any` / `@ts-ignore` / non-null assertions

- Total `: any` in `src/`: 113 occurrences, of which **82 are inside `src/generated/prisma/**`** (Prisma's own generated Promise `.then`/`.catch` typings) — not actionable.
- Hand-written `: any` / `as any` outside generated code: **31 files, 55 occurrences.**
- `@ts-ignore` (never `@ts-expect-error`, so none will fail loudly if the underlying issue is later fixed): 3 occurrences — `Users/stafff/Ui/CreateStaffForm.tsx:164`, `Finances/Invoices/ui/CreateInvoice.tsx:136`, `Trainings/ui/CreateTrainingSession.tsx:96`.
- Non-null assertions (`!.`) in hand-written code: effectively none found — good discipline here.

### Representative occurrences

1. **`src/app/(server)/api/export/route.ts:34,53,68,90,110,129,159`** — `const whereClause: any = {}` repeated 7 times in one file. This is a real problem, not stylistic: this route builds Prisma `where` filters with no type checking against `Prisma.XWhereInput`, so a typo'd field name fails silently at runtime instead of at compile time — and this is the same route flagged in `02-security-audit.md` (B12) as a bulk-export endpoint with insufficient authorization, making a silent filter bug there doubly risky.
2. **`src/app/(server)/api/stats/route.ts:56,65,74`** — `period as any` for a query-string value checked against a `VALID_PERIODS` array. Narrow, low risk, but should be a type-guard/`as const` union check instead of a cast.
3. **`src/Modules/Finances/Server/CreateSubscriptionFees.ts:92`, `EditSubscriptionFees.ts:89,139`** — `catch (error: any)` in money-handling code. This masks a real problem: no compiler help distinguishing a Prisma constraint violation from a business-logic throw, in exactly the finance flow that `09-testing-strategy.md` and `04-database-audit.md` both flag as under-tested and containing a confirmed race condition.
4. **`src/Modules/Finances/Ui/EditTransactionModal.tsx:37`** — `data: any` on a component prop. This is an internal UI boundary, not external/untyped input — should use the module's derived Prisma-payload type instead.
5. **Systemic, low-severity, single-fix-wide-payoff**: `filterFn={(e: any) =>` / `mapRow={(item: any, i: number) =>` repeated identically across `Expenses/ui/ExpensesPage.tsx`, `ExpenseCategories.tsx`, `Coupons/ui/Coupons.tsx`, `AthletesOnboarding/.../AthletesData.tsx`, `stafff/Ui/ViewAllStaff.tsx`, `Finances/Invoices/ui/Invoices.tsx`, `Trainings/ui/ViewTrainingSessions.tsx` — a shared generic table component whose `filterFn`/`mapRow` prop signatures aren't generic-typed. Fixing that one shared component's prop types would eliminate roughly 15 of the 55 hand-written `any` occurrences at once — the single highest-leverage TypeScript fix in the codebase.
6. **`(doc as any).lastAutoTable?.finalY`** (`AssesmentMetrics.tsx`, `PrintCompletedAssessment.tsx`, `AthleteExportButton.tsx`) — a known, community-documented gap in `jspdf-autotable`'s type definitions. Reasonable as-is, or fixable with a small `.d.ts` module augmentation rather than a code concern.
7. **`AthletesOnboardingForm.tsx:163`** — `form.trigger(currentStepFields as any)`. Minor: react-hook-form's `trigger()` wants a literal field-name union; fixable by typing the step-field arrays as `(keyof FormValues)[]` instead of casting.
8. **`Settings/Batches/Ui/server.ts:120`** — `schedules: any[]` — should be typed against the `BatchSchedule` Prisma input type, not `any[]`.

## `global.d.ts` — the clearest sign of type-safety being patched over

Root `global.d.ts` (~313 lines) hand-declares global DTO interfaces that duplicate the Prisma schema by hand, and it has real, confirmed defects:

- **Declares an `Athlete` interface twice** in the same global namespace (once ~lines 41-70, again ~lines 217-232). TypeScript declaration-merges the two, but the second declaration itself contains a **duplicate property** (`middleName: string;` immediately followed by `middleName: string | null;`) — a duplicate-identifier situation inside one interface body.
- `Athlete.status` in the first declaration is typed as `" ACTIVE" | "PENDING" | " DEACTIVATED" | "  DEFAULT"` — **stray leading whitespace baked into the string literal types** — this cannot match the real Prisma enum values (`ACTIVE`, `PENDING`, `DEACTIVATED`, `DEFAULT`, no spaces). Anything relying on this type as written would need a cast to actually work, which is exactly the kind of pressure that produces more `any`/`as any` elsewhere.
- `age: int;` — `int` is not a valid TypeScript type anywhere in this codebase; this line should not type-check under `strict` mode as configured, suggesting either this specific interface is unused dead code, or something else is masking the compile error.
- `finances`/`financeResponse` interfaces reference `subscriptionStartDate`/`subscriptionEndDate` fields that **do not exist** on the current `Finance` or `Invoice` Prisma models at all — stale leftovers from an earlier version of the schema.
- **The right pattern already exists elsewhere and should be the target**: `src/Modules/Users/Types/index.ts` defines `GetAthleteByIdQuery` as an object `satisfies Prisma.AthleteFindUniqueArgs`, then derives `GetAthleteByIdQueryType` via `Prisma.AthleteGetPayload<typeof GetAthleteByIdQuery>` — a type that can never drift from the actual query. This pattern is already used correctly in 6 modules: `Users/Types`, `Coupons/Types`, `Expenses/Types`, `Finances/Invoices/Types`, `Trainings/Assesments/Types`, `Trainings/Types`.

**Recommendation:** migrate the hand-written interfaces in `global.d.ts` onto the `satisfies Prisma.XArgs` pattern module-by-module, then delete `global.d.ts`'s stale content once no call sites reference it.

## Role / magic-string drift (live bug, not just style)

The Prisma `ROLES` enum (`staff.prisma`) is `COACH | ADMIN | DOCTOR | FINANCE | SUPER_ADMIN`. The frontend defines its **own, separate** union at `src/components/SideBarItems.tsx:24`:

```ts
type AppRole = "SUPER_ADMIN" | "ADMIN" | "COACH" | "FINANCE" | "STAFF";
```

`STAFF` is **not a valid Prisma `ROLES` value at all**, and `DOCTOR` from the schema is **missing** from this frontend union entirely. This is a live drift bug, not a hypothetical: a `DOCTOR`-role user has no corresponding sidebar/navigation configuration, and any code path checking `role === "STAFF"` can never match a real database row. Role strings are otherwise scattered as literals in `roles: [...]`-style arrays throughout `SideBarItems.tsx` (10+ locations) and 34 other matches app-wide, rather than referencing the Prisma `ROLES` enum or one shared const — any future role rename or addition requires manually finding every literal occurrence.

## API contracts / return types

Most server action files under `Modules/*/Server` follow the `satisfies Prisma.X...Args` + derived `GetPayload` pattern well (good — this is the majority case, not the exception). The finance error-handling paths (`CreateSubscriptionFees.ts`, `EditSubscriptionFees.ts`) and the export/stats routes are the outliers, leaning on `catch (error: any)` / `whereClause: any`, leaving their actual runtime error-path shape untyped — see items 1 and 3 above.

## Recommended V2 priorities from this report

1. Fix the `AppRole`/`ROLES` drift in `SideBarItems.tsx` — add `DOCTOR`, remove the fictitious `STAFF`, and ideally import the Prisma enum directly instead of hand-declaring a parallel union.
2. Type the shared table component's `filterFn`/`mapRow` props generically — single fix, ~15 `any` occurrences resolved.
3. Migrate `global.d.ts` onto the `satisfies Prisma.XArgs` pattern and delete the stale duplicated/drifted interfaces.
4. Replace `catch (error: any)` in the finance server actions with typed error handling (distinguish Prisma known-error codes from business-logic throws) as part of the finance-hardening work in `13-v2-roadmap.md`.
5. Fix the 7 `whereClause: any` occurrences in `api/export/route.ts` by typing against `Prisma.XWhereInput`.
