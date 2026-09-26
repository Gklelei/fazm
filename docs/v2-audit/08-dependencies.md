# 08 — Dependency Audit

## Flags requiring action

- **`yarn` is listed under `dependencies`** in `package.json`. A package manager should never be a project dependency — it bloats `node_modules` and risks being pulled into a serverless bundle. **Remove.**
- **`axios` vs. native `fetch`**: axios is used in exactly **1 file** (`src/components/FsUploader/LocalFsImageUploader.tsx`), while native `fetch(` appears in **12 files**. Given `fetch` is already the dominant pattern, replace the single axios call site and drop the dependency rather than the reverse.
- **Three overlapping CSV/spreadsheet libraries**: `xlsx` (used only in `src/utils/exportData.ts`, for export), `papaparse` (used only in `src/Modules/Seed/*` — dev/seed scripts, not runtime app code), `csv-parser` (**zero usages found anywhere**). Consolidate: keep `xlsx` for export, remove `csv-parser`, and consider moving `papaparse` to `devDependencies` since it's seed-only.
- **Two PDF generation approaches**: `jspdf` + `jspdf-autotable` (client-side/canvas-style, used in `AthleteExportButton.tsx`, `AssesmentMetrics.tsx`, `PrintCompletedAssessment.tsx`, `utils/pdf.ts`, `utils/exportData.ts` — 5 files) vs. `@react-pdf/renderer` (JSX-based, used server-side for invoices/receipts: `InvoiceDocument.tsx`, `TransactionDetails.tsx`, `ReceiptPDF.tsx`, and `api/finance/invoice/[id]/pdf/route.tsx`). These are **not purely redundant** — one needs SSR-safe JSX-to-PDF for invoices, the other is used for ad hoc client-side exports — but the split is undocumented and would reasonably look like duplication to a new contributor. Recommend documenting the rationale, or migrating everything onto `@react-pdf/renderer` since it already covers both the server and client entry points exercised here.
- **Two toast/alert systems**: `sweetalert2` (dominant — 39 files, via a wrapper `src/utils/Alerts/Sweetalert.tsx`) vs. `sonner` (9 files). Not fully interchangeable (sweetalert2 = blocking modal-style confirms, sonner = lightweight toasts) but there is real overlap for simple success/error notifications. Recommend standardizing on `sonner` (lighter, already the shadcn-idiomatic choice) for simple notifications, and reserving `sweetalert2` — if kept at all — strictly for confirm-before-destructive-action dialogs.
- **Zero-usage dependencies** (grep-confirmed, verify once more before removal): `@stepperize/react` (app has its own hand-rolled `src/components/ui/stepper.tsx`), `react-resizable-panels`, `use-debounce` (app uses a hand-rolled `src/utils/Debounce.ts` in 4 files instead).

## Confirmed-used, thin-usage dependencies (keep)

`@dnd-kit/*` (1 file, `Trainings/ui/SortableDrillList.tsx`), `embla-carousel-react`, `input-otp`, `vaul`, `cmdk`, `react-intersection-observer`, `next-themes` — each has only 1-3 real usages, but these are the cost of adopting the full shadcn/ui component scaffold, not dead weight. Not a removal target.

## `dependencies` vs. `devDependencies` misplacement

- `yarn` (see above) — should not exist as a dependency at all.
- `tsx` is in `dependencies` but is only invoked via `npm run cron` (`tsx src/cron/worker.ts`) — a build/tooling concern rather than a runtime dependency of the deployed Next.js app. Move to `devDependencies` **unless** the standalone cron worker (`src/cron/worker.ts`) is actually deployed as a long-running process that needs `tsx` at runtime — confirm the deployment target for the cron mechanism (see `01-current-architecture.md` and `13-v2-roadmap.md` on the dual-cron-mechanism ambiguity) before moving this.
- `@types/pg` is in `dependencies` while its counterparts `pg` and `@prisma/adapter-pg` are correctly in `devDependencies` — inconsistent; `@types/*` packages should always be `devDependencies`.
- `papaparse` (a runtime dependency) is only used in seed scripts, not app runtime — arguably belongs in `devDependencies`.

## Version/stack risk

Next 16.1.0 + React 19.2.3 + `@prisma/client`/`prisma` 7.2.0 is a genuinely bleeding-edge combination — all three are very recent major versions. This is a **legitimate, real risk for a production app**, not a defect in itself: expect smaller community/StackOverflow coverage for edge cases, possible peer-dependency friction in some Radix/shadcn version ranges, and a less battle-tested Prisma 7 client generator — which is compounded by the fact that the generated client output is hand-committed to git (`03-dead-code.md`) rather than always freshly generated, meaning any Prisma 7 codegen quirk gets frozen into the repo instead of being caught by regeneration.

**Recommendation:** budget explicit time in the V2 roadmap for upgrade-related firefighting, and pin exact dependency versions (rather than `^` ranges) for `next`, `react`, `react-dom`, `@prisma/client`, and `prisma` given how new these majors are, to avoid an unreviewed transitive upgrade landing mid-project.

## Summary of dependency actions for V2

| Action | Packages |
|---|---|
| Remove entirely | `yarn` (from dependencies), `csv-parser`, `@stepperize/react`, `react-resizable-panels`, `use-debounce`, `axios` |
| Move to devDependencies | `tsx` (pending cron-deployment confirmation), `@types/pg`, `papaparse` |
| Consolidate (pick one) | `sweetalert2` vs `sonner` for simple notifications |
| Document or consolidate | `jspdf`/`jspdf-autotable` vs `@react-pdf/renderer` |
| Pin exact versions | `next`, `react`, `react-dom`, `@prisma/client`, `prisma` |
