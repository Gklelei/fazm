# 10 — UX & Consistency Review

This review synthesizes UX-relevant findings surfaced across the architecture, Next.js/React, and dead-code audits — it is not a separate pixel-level design review, and the caveats below flag where a claim is inferred from code rather than from actually operating the running app in a browser (no dev server was started as part of this audit; see `13-v2-roadmap.md` and the "Flagged assumptions" note in `12-v2-architecture.md`).

## Loading states — inconsistent

`loading.tsx` exists for only 9 of the ~20 route segments under `(home)`: `guardians`, `transactions`, `players/user-profile/[id]`, `invoices`, `staff`, `sessions/attendance/mark/[id]`, `coupons`, `assesments`, and the `(home)` root. Missing entirely for `academy`, `expenses`, `expenses-categories`, `fees`, `mail`, `sessions` (list), `settings` (+ `audit-logs`), `stats`, and the create/edit sub-routes for players and sessions. A user navigating to any of the "missing" routes sees no loading affordance during the server-side data fetch — inconsistent enough to be noticeable, especially since the dashboard root (which does have `loading.tsx`) runs 13 queries in one transaction and other unprotected routes run similarly non-trivial queries.

## Error states — effectively absent

Zero `error.tsx` (and zero `global-error.tsx`) exist at any route segment in the entire app. Any thrown error anywhere in a Server Component — a Prisma failure, a bad query param, a null-reference bug — falls through to Next.js's default, unstyled error page for the *entire app*, not a scoped, recoverable section. This is both a UX and an architecture finding (see `01-current-architecture.md`, `05-nextjs-react-audit.md`) but is called out here because it's the single highest-impact "the product looks unfinished when something goes wrong" issue identified in this audit.

## Empty states — none found

No shared "empty state" component exists anywhere in the codebase (`03-dead-code.md`); each list view appears to inline its own ad hoc "no data" text, if it has one at all. Worth designing one reusable empty-state component (icon + message + optional CTA) as part of any table-component consolidation.

## Tables: pagination, search, filtering

Most list pages (staff, expenses, guardians, fees, coupons, expense-categories, sessions, invoices) do correctly paginate and most support search/filter via the shared table pattern. The `transactions` page is the clear outlier: it loads the entire finance ledger unpaginated and does search/filtering client-side over the full dataset (`06-performance-audit.md`) — beyond the performance cost, this also means the page will visibly slow down (spinner, jank, unresponsive filters) as the ledger grows, which is a direct UX regression relative to every sibling page.

## Forms — consistent, a genuine strength

`react-hook-form` + `zod` (via `@hookform/resolvers`) is used consistently across ~34 form components — this is a real strength of the current codebase and should be the template V2 continues to follow, not something that needs fixing. The one recurring rough edge is a family of components that reset form state via a `useEffect` keyed to "modal opened" / "edit target changed" (`EditExpenseCategory.tsx`, `CreateCoupons.tsx`, `Batches.tsx`, `CreateStaffForm.tsx`, `CreateInvoice.tsx`) rather than a `key={item.id}` remount — functionally fine today, but a `key`-based refactor would be both simpler code and marginally snappier UI (no flash of stale values before the effect fires).

## Duplicate UI patterns

- Three separate loading-spinner implementations (`Loader2Spinner.tsx`, `PageLoader.tsx`, `components/ui/spinner.tsx`) plus ad hoc inline usage — likely to already look/feel slightly different across the app even if the difference is subtle.
- Two coexisting alert/notification systems (`sweetalert2` in 39 files, `sonner` in 9) — a blocking modal-style confirm in one part of the app and a toast in another for functionally similar "are you sure" or "saved successfully" moments is exactly the kind of inconsistency a user notices even if they can't name it.
- Each edit/create modal (`EditExpenseCategory`, `EditTransactionModal`, `PaymentModal`, `ProfileModal`) rolls its own dialog boilerplate rather than sharing one `FormModal` primitive — a good V2 target for a shared modal shell (header, footer button row, loading/disabled state during submit) so every modal in the app behaves identically.

## Navigation / role visibility

`(home)/layout.tsx` gates on "is there a session" only, with no role check (`01-current-architecture.md`, `02-security-audit.md` B16) — combined with the `AppRole`/`ROLES` drift bug in `SideBarItems.tsx` (`07-code-quality.md`, `STAFF` doesn't exist as a real role, `DOCTOR` is missing from the sidebar config entirely), this means the navigation a user sees may not accurately reflect what they're actually authorized to do, and a `DOCTOR`-role user in particular has no correctly-configured sidebar experience today. This is as much a security/authorization finding as a UX one — fixing the role-gating work in Phase 0 (`13-v2-roadmap.md`) should be done together with fixing the sidebar role config, since they're two views of the same underlying bug.

## Dashboards

The main dashboard (`(home)/page.tsx`) computes 13 aggregate queries synchronously with no `loading.tsx` and no streaming — a user opening the dashboard waits for the slowest of 13 queries before seeing anything. The dedicated `/stats` page is an unbuilt placeholder despite a fully-functional, well-built `api/stats` route already existing behind it (`06-performance-audit.md`) — this is a case of a feature that's ~80% done on the backend with no UI ever wired up, worth finishing rather than re-designing from scratch.

## What this review could not verify (flagged assumptions)

- **Mobile behavior** was not tested in a real browser/viewport as part of this audit — Tailwind's responsive utilities are used throughout the codebase, but whether the dense tables (invoices, transactions, staff) are actually usable on a phone screen was not verified. Recommend a manual pass in Phase 5.
- **Accessibility** (keyboard navigation, screen-reader labeling, color contrast) was not audited — shadcn/Radix primitives provide a reasonable accessible baseline out of the box, but custom components (especially the hand-rolled modals and the dashboard's chart widgets) were not individually checked.
- **Actual visual consistency** (spacing, typography scale, color usage) across ~130 client components was not reviewed pixel-by-pixel; the findings above are about *behavioral* consistency (loading/error/empty states, table patterns, modal patterns) which was verifiable from the code, not visual polish, which requires running the app.

## Recommended V2 priorities from this report

1. Add `error.tsx`/`global-error.tsx` at the root, then per data-heavy route segment — highest-impact, lowest-effort UX fix identified in this audit.
2. Fix the `transactions` page pagination (also a performance and DB finding — three reports converge on the same file).
3. Fix the `AppRole`/sidebar drift so navigation matches real roles.
4. Build one shared `FormModal` primitive, one shared empty-state component, and standardize on one of the two alert/toast systems, during a dedicated component-consolidation pass (Phase 5).
5. Wire up the already-built `/api/stats` route to a real `/stats` page instead of leaving a visible placeholder in production.
