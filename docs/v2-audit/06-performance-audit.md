# 06 — Performance Audit

## 1. Unpaginated large-table rendering — HIGH, top remediation item

`src/app/(home)/transactions/page.tsx:9-19` — `db.finance.findMany(...)` has its `take`/`orderBy` pagination **explicitly commented out**, fetching the entire finance/transactions table on every page load, serializing it via `JSON.parse(JSON.stringify(...))` (dropping type fidelity on Decimal/Date fields in the process) and shipping it whole to the client. `src/Modules/Finances/Ui/ViewAllFinances.tsx` then does client-side search/date-filter/pagination over the full in-memory dataset.

Every other list page checked — staff, expenses, guardians, fees, coupons, expense-categories, sessions, invoices, players — correctly paginates server-side (`db.$transaction([findMany{skip,take}, count])`) or via cursor (invoices, players). This is an isolated but severe regression from the pattern used everywhere else in the app, and the transactions/finance ledger table is a strong candidate to be one of the fastest-growing tables in the system as the academy's history accumulates. This should be the **top performance remediation item** for V2 — see also `04-database-audit.md`'s note on the same query from the database side.

## 2. Heavy libraries not code-split — Medium

`@react-pdf/renderer` is statically imported at module scope in `src/Modules/Finances/Ui/TransactionDetails.tsx:28` (used only inside a modal/button), `src/Modules/Finances/Invoices/ui/InvoiceDocument.tsx:1-9`, and `src/Modules/Finances/Ui/ReceiptPDF.tsx:2-9`. None of these are wrapped in `next/dynamic(() => import(...), { ssr: false })`. A repo-wide grep for `next/dynamic` returns **zero results** — no dynamic imports are used anywhere in the codebase. Every page that transitively imports these PDF components (transactions, invoices) ships that bundle weight even when the visitor never clicks "download PDF." Straightforward, high-value V2 fix: dynamically import the PDF document components behind the button/modal that triggers them.

## 3. Image handling — Low

`next/image` is used in only 6 files app-wide; `src/Modules/Users/AthletesProfile/AthleteDocuments.tsx` uses a raw `<img>` tag instead, skipping automatic optimization/lazy-loading/responsive sizing. Cloudinary integration exists for uploads (`ImageUploader.tsx`, `DeleteImage.ts`) but no `next-cloudinary` `<CldImage>` usage was found for *display*, so profile/avatar images may not be served through Cloudinary's automatic transform/optimization pipeline — worth confirming actual delivery URLs in V2.

## 4. Dashboard/stats expensive computation — Medium

`src/app/(home)/page.tsx:37-171` executes **13 queries in a single `db.$transaction`** (counts, aggregates, and two `findMany`s over rolling 12-month/weekly windows) on every request, with no caching layer (`unstable_cache`/tags) and no `loading.tsx` for this route. Every dashboard visit pays this full synchronous cost with no streaming. Natural candidate for `unstable_cache` with a short TTL (e.g., 60s) tagged for invalidation on finance/training mutations, or for Suspense-streaming the secondary widgets separately from the primary KPI cards.

`src/app/(home)/stats/page.tsx` is an unbuilt placeholder (`<div>page</div>`) despite a fully-built, paginated, role-checked `api/stats/route.ts` already existing — the computation logic is already correct on the API side, it's just not wired into a UI page yet.

## Cross-references to other reports

- The N+1 query patterns in `src/cron/tasks.ts` (per-athlete and per-session loops with no batching) are covered in `04-database-audit.md`'s Transaction/Concurrency section, since they're also data-integrity issues, not purely a performance concern.
- The unbounded `AuditLog` query (`getAuditLogs.ts`) is covered in `04-database-audit.md` alongside the transactions-page finding, since both are the same class of bug (missing `take`/`skip` on an ever-growing table).

## Summary of top V2 performance priorities

1. **High** — Fix `transactions/page.tsx` to paginate server-side like every sibling page; this is the single biggest scaling risk in the app today.
2. **Medium** — Dynamically import `@react-pdf/renderer`-based components (`TransactionDetails`, `InvoiceDocument`, `ReceiptPDF`) via `next/dynamic`.
3. **Medium** — Add caching (`unstable_cache` + tag-based revalidation) for the dashboard's 13-query aggregate load and for rarely-changing reference data (academy settings, batches/locations/drills dropdowns).
4. **Low** — Normalize image delivery through `next/image`/Cloudinary transforms; wire up the already-built `api/stats` route to the currently-placeholder `stats` page rather than leaving duplicated effort on the table.
