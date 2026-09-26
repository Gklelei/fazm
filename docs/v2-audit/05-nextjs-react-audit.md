# 05 — Next.js & React Audit

## Next.js Audit

**1. Routes: Server vs Client fetching, loading/error/not-found coverage**
Most `(home)` list pages are proper async Server Components fetching via Prisma directly and passing props: `staff/page.tsx`, `expenses/page.tsx`, `guardians/page.tsx`, `fees/page.tsx`, `coupons/page.tsx`, `expenses-categories/page.tsx`, `invoices/page.tsx`, `sessions/page.tsx`, `academy/page.tsx`, dashboard `page.tsx`. Use `db.$transaction([findMany, count])` with skip/take — solid pattern.

Exceptions/gaps:
- `players/page.tsx` — Server Component wrapper is a no-op, renders `<AthletesData />`, a "use client" component doing 100% client-side fetching via react-query `useInfiniteQuery` + IntersectionObserver. The one major list page not following the SSR-props pattern used everywhere else (likely highest-traffic table). Medium severity — inconsistent architecture, worse TTFB, extra client JS.
- `stats/page.tsx` is literally `<div>page</div>` — dead/placeholder route despite a real `api/stats` route existing. Low-Medium — unfinished feature.

**Missing loading.tsx**: academy, expenses, expenses-categories, fees, mail, sessions, settings (+audit-logs), stats, players/create, players/edit, sessions/create|edit|view, and the dashboard root page itself (despite 13 queries in one `$transaction`). Medium severity.

**Missing error.tsx**: none found anywhere under `(home)/*` or `(auth)/*`. Only a root `not-found.tsx` exists. Medium severity — any thrown error hits the global Next.js error overlay/500 page instead of a scoped boundary.

**Missing not-found.tsx**: none per-route; dynamic routes (`invoices/[id]`, `staff/[id]`, `coupons/[id]`, `sessions/view/[id]`) don't consistently call `notFound()`.

**2. Layout-level auth gating**
`(home)/layout.tsx:19-23` correctly does server-side `auth.api.getSession` + `redirect("/sign-in")`. Good. `(auth)` group has no layout.tsx at all — each of sign-in/sign-up/res-password independently calls getSession and redirects if a session exists — duplicated logic, Low severity (drift risk).

**3. API route handlers**
Generally correct App Router conventions (GET/POST exports, NextResponse.json). Well-built example: `api/stats/route.ts` (validation, role check, proper status codes, pagination). Bug: `api/athlete/[id]/route.ts:14-18` returns unauthorized session with **HTTP 200** instead of 401/403 — clients checking `res.ok` treat it as success; also no role check (cross-referenced with `02-security-audit.md` B10). No pages/api-style handlers leaking in.

**4. Caching/revalidation**
Zero hits repo-wide for `revalidatePath|revalidateTag|unstable_cache|force-dynamic|force-static|export const dynamic`. Everything dynamic-by-default via direct Prisma reads. Reasonable for a live-data dashboard, but two candidates for caching currently re-query every time: `academy/page.tsx` (`db.academy.findFirst`, single-row settings) and dropdown/reference data (training locations, batches, drills) fetched via react-query with no staleTime tuning. Low-Medium.

**5. Metadata**
Only one `export const metadata` in the entire app (root `layout.tsx`). Zero per-route metadata anywhere under (home)/(auth). Low severity (internal dashboard) but every tab shows the same generic title.

**6. Unnecessary client-side fetching**
`AthletesData.tsx` (players list) is the standout case — should follow the SSR+initialData pattern already correctly implemented in `invoices/page.tsx` (server-fetches first page with cursor pagination, passes initialData into client component that hydrates react-query). Settings pages (Drills, TrainingLocations, Batches, AcademyPage, PaymentModal, useFinance) also use client `useQuery` for what could be server-supplied simple CRUD data.

**7. Suspense usage**
Zero `<Suspense>` boundaries anywhere in the app. Dashboard's 13-query transaction and full finance-row loading block the entire page render with no streaming. Medium severity for dashboard/finance-heavy pages.

## React / State Audit

**1. useEffect volume**: 32 occurrences total (modest). Sampled: shadcn/Radix primitives and DOM/library-sync effects (carousel, calendar, ImageUploader/cloudinary, DynamicThemeProvider) are legitimate. Recurring anti-pattern: "reset react-hook-form defaultValues when modal opens/edit target changes" effects in `EditExpenseCategory.tsx:64-72`, `CreateCoupons.tsx:94-107`, `Batches.tsx:85`, `CreateStaffForm.tsx:82`, `CreateInvoice.tsx` — avoidable via a `key={item.id}` remount instead of an effect. Low severity, cleanup opportunity (~5+ effects removable). `AthletesData.tsx:53-57` infinite-scroll effect is legitimate and correctly guarded.

**2. Duplicated/derived state**: `ViewAllFinances.tsx:47-52` holds `searchQuery`/`dateRange`/`currentPage` in useState driving client-side filtering/pagination of a **fully-loaded dataset** (see `06-performance-audit.md` #1) — the underlying problem is the unpaginated data source, not the derived-state pattern itself.

**3. Unstable references**: `AthletesData.tsx:196-221` passes inline arrow functions (filterFn, mapRow) to `ExportDropdown` without useMemo/useCallback on every render — Low impact. The `athletes` array itself is correctly memoized.

**4. Forms**: react-hook-form + zodResolver used consistently across ~34 files — solid majority adoption. Files using raw useState instead of RHF are mostly table/filter UIs (appropriate), not real data-entry forms — no violation found.

**5. React-query conventions**:
- Global config (`ReactQueryClientProvider.tsx:12-19`): `refetchOnWindowFocus: false, retry: 0`, **no staleTime/gcTime set anywhere** (defaults to staleTime: 0) — every mount refetches even near-static data. Low-Medium, easy high-value fix.
- `retry: 0` globally — no automatic retry on transient blips.
- Query keys are simple string-arrays, consistent style, but don't encode filter params (blunt invalidation).
- Mutations use manual `queryClient.invalidateQueries()` after server actions rather than `useMutation({onSuccess})` — functionally fine but not idiomatic; no optimistic updates found anywhere.
- SSR initialData/hydration: only `Invoices` does this correctly — should be the template applied to Players.
- Pagination: Invoices and AthletesData use infinite/cursor pagination; **ViewAllFinances (transactions) does not** — loads everything, paginates client-side (standout inconsistency, ties to `06-performance-audit.md` #1).

**6. Race conditions**: none obvious found in sampled files; most fetching goes through react-query (handles cancellation) rather than raw useEffect+fetch.

## Summary of top V2 priorities from this report
1. Rebuild `players` (`AthletesData.tsx`) to follow the SSR-initialData pattern proven in `invoices/page.tsx`.
2. Add `error.tsx` boundaries and `loading.tsx` for the dashboard and other data-heavy routes.
3. Fix `api/athlete/[id]/route.ts` to return real 401/403 status codes (also a security finding — see `02-security-audit.md` B10).
4. Introduce `staleTime`/`gcTime` in the global `QueryClient` config.
5. Consolidate `(auth)` layout session-redirect logic into a shared layout; add per-route `metadata`; replace repeated "reset RHF on modal open" effects with `key`-based remounts.
