# FAZM Security Audit — V2 Planning

Scope covered: better-auth config, session/password flows, all "use server" actions, all (server)/api route handlers, (home) layout/pages, file upload, audit logging, env var exposure, XSS/redirect surface.

## 1. Authentication Findings

**A1. `role` field is client-settable at the better-auth API layer — CRITICAL — POSSIBLE (not black-box tested, but code shows no server-side guard)**
`src/lib/auth.ts:34-40` defines `additionalFields.role` with `input: true`. Better-auth's `input:true` means the field is accepted from client-supplied request bodies on `sign-up`/`update-user` endpoints. There is no `databaseHooks`/`beforeCreate` in `auth.ts` that overrides or strips `role`. The in-app `SignUpForm.tsx` (`src/Modules/Auth/SignUpForm.tsx:52-57`) only sends `email/password/name`, so the normal UI is safe — but nothing stops a direct POST to `/api/auth/sign-up/email` (or `/api/auth/update-user`) with `{"role":"ADMIN"}` in the body, since the catch-all handler (`src/app/(server)/api/auth/[...all]/route.ts`) just forwards to better-auth with no additional field filtering. Given `role` is used as the sole authorization gate everywhere else in the app (see section 2), this is a full privilege-escalation-to-admin primitive if reachable. Recommend setting `input: false` on `role` and only ever setting it server-side (e.g., in `CreateStaffAction`).

**A2. `ChangePassword` server action — HIGH — CONFIRMED (dead/no-op arguably, but exploitable ambiguity)**
`src/Modules/Auth/Auth.ts:6-33`. Takes `{email, password}`, looks up `existingUser` by email (result unused beyond existence check), then calls `auth.api.setPassword({ body: { newPassword: password } })` **without passing `headers`**. Better-auth's `setPassword` API requires the current session (via headers) to identify whose password to set — since no headers/session are passed here, this call will fail server-side (no session context) for any caller, effectively making the function non-functional. It is **not called from anywhere else in the codebase** (grep across `src/` shows only its own definition — no import references). It is dead code today, but its shape (accepting an arbitrary `email` and reusing `setPassword`) is a latent trap: if a future patch adds `headers: await headers()`, the `email`/`existingUser` lookup remains meaningless since `setPassword` only ever acts on the calling session's own user — so it could never be used to change another user's password via this code path as currently structured. Flag for removal/cleanup to avoid future misuse.

**A3. Session/cookie config — LOW — CONFIRMED (reasonable but worth noting)**
`session.expiresIn=1800s`, `cookieCache.maxAge=300s`. Short-lived sessions are fine; no `secure`/`sameSite` overrides are set explicitly (defaults apply from better-auth, likely fine in production behind HTTPS). No visible logout-triggered session invalidation issue found, but no explicit multi-device/session-revocation UI was found either.

**A4. Sign-up flow does not allow direct staff/admin creation — CONFIRMED SAFE (mitigating factor for A1 via UI, not via raw API)**
`SignUpForm.tsx` never sends `role`; staff accounts are only created via `CreateStaffAction` (`src/Modules/Users/stafff/Server/CreateStaffAction.ts:20-46`), which **correctly** checks `session.user.role !== "ADMIN"` before calling `auth.api.signUpEmail` with an explicit `role`. This is a good pattern — the risk is entirely in A1 (raw API reachability of `role` on public sign-up).

## 2. Authorization Findings (IDOR / Privilege Escalation)

No `middleware.ts` exists (confirmed). Authorization is entirely ad hoc, action-by-action. Results below are from reading **every** `"use server"` file (35 total) and every route handler (19 total).

**B1. `UpdateAthleteAction` — CRITICAL — CONFIRMED**
`src/Modules/Users/AthletesProfile/EditUserProfile/Server/UpdateAthleteAction.ts:38-141`. Calls `auth.api.getSession(...)` at line 42 but **never checks if `session` is null**, and never checks role. The `db.athlete.update(...)` at line 65 executes unconditionally. `session?.user` is only referenced afterward for the audit log (optional chaining, so it silently no-ops if unauthenticated). **Attack: any unauthenticated request that reaches this server action (or any authenticated user of any role) can overwrite any athlete's full profile — name, DOB, medical info, guardians (via `deleteMany`+`create`), emergency contacts — by supplying an arbitrary `athleteId`.** This is the most severe finding in the app.

**B2. `EditInvoiceStatus` — HIGH — CONFIRMED**
`src/Modules/Finances/Invoices/Server/EditInvoice.ts:134-147`. Checks only `session?.user` exists, no role/ownership check. Any authenticated account (including a low-privilege guardian/athlete login) can call this to set any invoice's status to `PAID`/`CANCELED` for any `invoiceNumber`, bypassing payment collection. Contrast with the sibling `EditInvoiceAction` (lines 41-57) in the same file, which does correctly require `role === "ADMIN"` — inconsistent enforcement within the same module.

**B3. `CreateAthleteInvoice` — HIGH — CONFIRMED**
`src/Modules/Finances/Invoices/Server/CreateAthleteInvoice.ts:34-35`. Only checks `session?.user` exists. Any authenticated user can create arbitrary invoices (including `MANUAL` type with attacker-chosen amounts) for any athlete.

**B4. `CreateTrainingSession` — MEDIUM/HIGH — CONFIRMED**
`src/Modules/Trainings/Server/CreateTrainingSession.ts:24-33`. Session-exists check only, no role check. Any authenticated user (e.g. a guardian account) can create training sessions assigning arbitrary coaches/batches/locations.

**B5. `DeleteAssessmentSection` (`DeleteMetric.ts`) and `UpdateAssesmentMetric` — MEDIUM — CONFIRMED**
`src/Modules/Trainings/Assesments/server/DeleteMetric.ts:11-17` and `UpadateAssesmentMetric.ts:13+` — session-exists only, no role gate. Any logged-in user can archive/edit assessment template sections used academy-wide.

**B6. `CreateAssesmentMetricAction` — CRITICAL — CONFIRMED (no auth at all)**
`src/Modules/Trainings/Assesments/server/CreateAssesmentMetricsAction.ts` — **no `getSession` call whatsoever**. This server action is fully reachable and unauthenticated (Next.js server actions are POST-able endpoints regardless of UI wiring). Anyone with network access to the app can create arbitrary assessment metric sections.

**B7. `CreateBatchWithSchedule` — CRITICAL — CONFIRMED (no auth at all)**
`src/Modules/Settings/Batches/Ui/server.ts` (entire file) — **no `getSession`/auth import at all**. Fully unauthenticated: anyone can create batches and bulk-generate training sessions with arbitrary staff/location IDs, straight into the DB.

**B8. `deleteCloudinaryImage` — MEDIUM — CONFIRMED reachable, POSSIBLE impact**
`src/components/DeleteImage.ts` is a `"use server"` file with no auth check, exported and normally only invoked from the already-authorized `DeleteAthlete` flow — but because it's a top-level server action export, it is independently callable by any client with a guessed/enumerated Cloudinary `publicId`, allowing unauthenticated deletion of any image in the account's Cloudinary bucket (profile pictures, ID documents, birth certificates).

**B9. `AddAthleteGuardian` — MEDIUM — CONFIRMED (auth present, no ownership scoping)**
`src/Modules/Users/AthletesProfile/EditUserProfile/Server/AddAthleteGuardian.ts:20-30`. Checks session exists but no role or "is this athlete mine" check. Any authenticated user can attach a guardian record to any athlete by ID — enables a guardian account to add itself (or an accomplice) as guardian of a child that isn't theirs, then use that relationship elsewhere in the UI.

**B10. `/api/athlete/[id]/route.ts` — HIGH — CONFIRMED**
`src/app/(server)/api/athlete/[id]/route.ts:9-19`. Checks `if (!session)` only (no role/ownership). Any authenticated user can fetch **any** athlete's full profile (medical conditions, allergies, guardians, emergency contacts, addresses) by ID — full PII/medical-data IDOR. Also returns this unauthorized-error response with **HTTP 200** instead of 401/403 (cross-referenced by the Next.js audit).

**B11. `/api/athlete/athletes-all/route.ts` — HIGH — CONFIRMED**
`src/app/(server)/api/athlete/athletes-all/route.ts:23-27`. Same pattern — session-exists only; any authenticated account can page through and search the entire athlete roster including medical fields.

**B12. `/api/export/route.ts` — HIGH — CONFIRMED**
`src/app/(server)/api/export/route.ts:24-27`. Session-exists check only, no role check, for a `resource=` switch that dumps up to 5,000 rows each of expenses (incl. staff-entered financial notes), staff PII (email/phone/idNumber), coupons, invoices, and athletes. Any authenticated low-privilege user can bulk-exfiltrate all of this.

**B13. `/api/finance/invoice/[id]/pdf/route.tsx` — CRITICAL — CONFIRMED (fully unauthenticated)**
`src/app/(server)/api/finance/invoice/[id]/pdf/route.tsx:8-35`. Calls `getSession` but **never checks the result** — the invoice PDF (athlete name, email, phone, amounts due/paid) is rendered and returned regardless of whether `session` is null. `session?.user.id` is only used for the audit log (optional chaining papers over the unauthenticated case). Zero-authentication reachable over just an invoice `id`.

**B14. `/api/finance/transaction/record/[id]/route.ts` — MEDIUM/HIGH — CONFIRMED**
`src/app/(server)/api/finance/transaction/record/[id]/route.ts:11-18`. Session-exists check only (and a dead `redirect("/")` after `return` on line 18 — unreachable code, cosmetic bug). Any authenticated user can view any financial transaction record by ID.

**B15. `/api/settings/utils/route.ts` — MEDIUM — CONFIRMED (fully unauthenticated)**
`src/app/(server)/api/settings/utils/route.ts` — **no auth check at all**. Publicly returns internal org configuration: training locations, drills, batches, coach roster, academy settings (name, contact info, branding).

**B16. Page-level access control is UI-only, not server-enforced — MEDIUM — CONFIRMED**
`src/app/(home)/layout.tsx:19-21` only checks `if (!session) redirect("/sign-in")` — no role check. `role` is used under `src/app/(home)` only twice, both cosmetically (never as a route guard). Every authenticated user, regardless of role, can navigate directly to `/settings`, `/staff`, `/expenses`, `/coupons`, `/academy`, `/transactions`, `/fees`. Combined with B10-B15, a guardian-role account can likely browse to every module in the app.

**Good counter-examples (properly implemented, for contrast):** `CreateStaffAction`, `DeleteAthlete`, `Academy.ts` (`CreateAcademyUtils`/`EditAcademyUtils`), `CouponsAction.ts` (all 4 exports), `Drills.ts`, `TrainingLocations.ts`, `Batches.ts`, `CreateExpense*.ts`, `CreateSubscriptionFees.ts`/`EditSubscriptionFees.ts`, `DeleteTransaction.ts`, `EditTransaction.ts`, `CreateTransaction.ts`, `EditTrainingSessionAction`, `DeleteTrainingSession`, `EditAthleteStatus.ts`, `ApplyCoupon.ts`, `AddAthletePlan.ts`, `ApplyDiscounts.ts`, `EditStaff.ts` (`AdminEditStaffProfile`/`AdminDeleteStaff`), `/api/stats/route.ts` — all correctly check session + role. This confirms the pattern exists in the codebase; it's just applied inconsistently.

## 3. Input Validation Findings

- Zod schemas exist under `Validators`/`Validation` folders for most create/edit actions and are generally invoked server-side before DB writes — LOW risk, validation is real, not merely client-side.
- No mass-assignment pattern (`...req.body` spread directly into Prisma `data:`) was found in any API route — all routes construct explicit `data:` objects field-by-field. LOW risk on this vector.
- However, several actions with weak/no Zod validation still perform direct writes once past the (often missing) auth gate — e.g. `CreateBatchWithSchedule` does validate with Zod but has zero auth (B7); validation doesn't compensate for missing authorization.

## 4. Other API / Security Findings

**C1. File upload endpoint — CRITICAL — CONFIRMED**
`src/app/(server)/api/files/upload/route.ts` `POST` handler has **no authentication check** and **no file-type or size restriction** — any unauthenticated client can upload arbitrary files (including `.html`, `.svg`, executables) to `public/uploads/<dir>/<file>`, served as static files (potential stored XSS via uploaded HTML/SVG, or disk-fill DoS with no size cap). Path-traversal is well-mitigated (`SAFE_DIR_REGEX`/`SAFE_FILE_REGEX`, `path.resolve` containment check on `DELETE`), but the `DELETE` handler is likewise **unauthenticated** — anyone who can guess/enumerate `/uploads/<dir>/<file>` (filenames are `Date.now()-<original name>`, quite guessable within a narrow time window) can delete other users' uploaded documents (ID photos, birth certificates).

**C2. Cron/webhook endpoints — mixed, one CRITICAL gap — CONFIRMED**
- `cron-jobs/update-age`, `update-training-status`, `invoice-status`, `subscriptions`, `add-athletes-training-session`: all correctly fail-closed on `Authorization: Bearer $CRON_SECRET` mismatch (`if (!CRON_SECRET || token !== CRON_SECRET) return 401`).
- `cron-jobs/activity/route.ts:6-14` (`assertCronAuth`) — **fails OPEN**: `if (!secret) return;` — if `CRON_SECRET` is ever unset in the deployment environment, this endpoint (which mass-deactivates "inactive" athletes) becomes completely unauthenticated and callable by anyone. CRITICAL if `CRON_SECRET` is missing in any environment; otherwise not exploitable. Flag as CRITICAL/CONFIGURATION-DEPENDENT.

**C3. XSS — LOW — CONFIRMED (no findings)**
No `dangerouslySetInnerHTML` in mail templates or app pages (only default shadcn `chart.tsx` library code uses it, not user-input-driven).

**C4. Open redirect — LOW — CONFIRMED (no findings)**
`callbackURL`/`redirectTo` usages (`SignInForm.tsx:38`, `:139`) are hardcoded literals, not derived from `searchParams`/query input.

**C5. Secrets exposure — LOW — CONFIRMED**
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_API_KEY` (`src/components/DeleteImage.ts:4-5`) are exposed via `NEXT_PUBLIC_` prefix but only consumed inside a server-only `"use server"` file — not sensitive per Cloudinary's model, but the prefix is unnecessary/misleading since this file never runs client-side. `CLOUDINARY_API_SECRET` is correctly kept non-public.

**C6. Audit logging — MEDIUM — CONFIRMED (present but incomplete)**
`src/lib/audit.ts` provides `createAuditLog`, called from many sensitive actions. However: (a) no audit entries for **login/logout/session events** or **role changes** themselves; (b) the most dangerous unauthorized actions found above (B1, B6, B7, B13) either skip the audit call when `session` is null or never had one to begin with — the most dangerous unauthorized actions are also the least likely to be logged.

## Priority Summary for V2 Fix List
1. **CRITICAL, fix first:** B1 (`UpdateAthleteAction` no-op auth check), B6/B7 (fully unauthenticated write actions), B13 (unauthenticated invoice PDF), C1 (unauthenticated file upload/delete), C2 (`CRON_SECRET` fail-open in activity route), A1 (client-settable `role` field).
2. **HIGH:** B2-B5, B10-B12, B14 (missing role/ownership checks on financial and PII endpoints).
3. **MEDIUM:** B8, B9, B15, B16, C6.
4. **LOW:** A2 (dead code cleanup), A3, C3-C5.

Recommend for V2: introduce a real `middleware.ts` (or a shared `requireRole()` helper enforced at the top of every server action/route) rather than continuing the current copy-pasted per-file `getSession`+role-check pattern, since roughly 1 in 4 of the audited actions/routes omitted or under-scoped the check.
