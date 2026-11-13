# 18 · Transfers between programmes and per-programme athlete IDs

Status: design agreed 2026-11-13, not started. Programmes are already **on** in prod.

## Decisions (from the developer)

| Topic | Decision |
|---|---|
| ID on transfer | **Fixed for life.** Issued from the programme the athlete joins; a transfer never changes it. The code shows "joined in"; the current programme shows beside it. |
| Format | `ATH/FFA/<code>/<NNN>`, e.g. `ATH/FFA/M/501`, `ATH/FFA/G/001`. FFA (Football Academy) stays in every ID. |
| Counters | One per programme. Girls (and any new programme) start at 1; Main carries on from today's `athlete_sequence`. |
| Codes | Main Programme **M**, Girls Programme **G** (prod names; a programme added later picks its own). |
| Existing IDs | Renamed once, keeping the number: `ATH-FFA-501` → `ATH/FFA/M/501`. The old ID stays searchable (alias). Girls are renumbered from 1 in join order: the only one, `ATH-FFA-954` → `ATH/FFA/G/001`. |

### Prod numbers (2026-11-13)

Main Prgramme 953 athletes (`ATH-FFA-001`…`955`, 935 from before programmes), Girls Programme 1 (`ATH-FFA-954`). `athlete_sequence` = 955, so Main continues at 956 and Girls at 002. `payment_reference` is empty: the athlete ID is not the paybill account, so the rename doesn't affect payments. Of 10 batch moves made through the edit form since 2026-11-05, none crossed programmes, and no whole batch changed programme, so the money backfill can use the current batch. All 14 FKs to `athlete` are `ON UPDATE CASCADE`. The prod DB is reached from the Serverdeck panel terminal, using the `DATABASE_URL` in `/var/lib/serverdeck/projects/fazam/shared/.env`.
| Money after a transfer | Invoices and payments keep the programme they were raised in. The new programme bills from the transfer date. |

## Facts from the code that shaped this

- `athlete.athlete_id` is the FK for attendance, assessments, invoices, finance, subscriptions, guardians, medical and coupon redemptions. Every FK is `ON UPDATE CASCADE`, so a one-off rename carries through.
- `how-to-pay.ts` can use the athlete ID as the paybill account number (`academy.payment_reference = ATHLETE_ID`). Payments are recorded by hand; nothing matches on the ID automatically.
- The ID appears in URLs: `/players/user-profile/<id>`, `/players/edit/<id>`, `/api/athlete/<id>/assessment-report`, `/shop/new?athlete=`, `/api/invoices?athleteId=`. A `/` breaks the path routes.
- `inProgramme.invoice` and `inProgramme.payment` follow the athlete's **current** batch, so today a batch change moves all past money into the new programme's reports.
- `update-athlete.ts` can already change the batch to one in another programme, with no record or plan check (an untracked transfer).
- `athleteIdTerm` (filters.ts) matches short numbers with `endsWith -NNN`, which needs updating for `/NNN`.
- `Finance.invoiceId` is optional; a payment takes its invoice's programme, otherwise the athlete's programme at the time it is paid.

## Steps

**Progress (2026-11-13):** Release A = steps 2, 3, 4, plus step 0 behind `TRANSFERS_ENABLED = false` (`src/features/athletes/lib/transfer-switch.ts`). It is built and tested, including a local check with a real `ATH/FFA/M/501`. Release B = steps 1, 5, 6, 7 and switching `TRANSFERS_ENABLED` on. Deploy B soon after A is verified, then check that no `ATH-FFA-%` IDs remain.

How A was built, where it differs from the steps below:
- Links: a dash slug instead of the record id. `athletePath()` and friends live in `athlete-links.ts`; `resolveAthleteId()` in `athlete-ref.ts` matches the record id, the stored ID, the slug or the former ID; old links redirect to the slug.
- Money stamps: set by Postgres triggers (`stamp_invoice`, `stamp_finance`) rather than in each create path, so every insert is covered, old code during a deploy included.
- Former ID: one unique `former_athlete_id` column, not an array.

Order matters. Untracked cross-programme moves and global-numbered Girls registrations build up every day, and no slash ID may exist before the links stop using the ID.

0. **Close the untracked transfer.** Done in code (2026-11-13), not deployed. `update-athlete.ts` only changes the batch within the athlete's programme; anything else returns "Choose a batch in the athlete's own programme." The edit form lists only the athlete's own programme's batches, whatever the header shows. `saveBatch` refuses to change the programme of a batch that has athletes (developer's choice: only when empty). **Both ship together with Transfer (step 5)**, so staff can keep sorting athletes until then.
1. **Programme code + counter** (ships together with step 6). `Programme.code` (unique, 1–3 letters, locked once an athlete has it; set in Settings → Programmes, with prod set to Main M and Girls G by the migration). Replace `AthleteSequence` with `ProgrammeSequence(programmeId, current)`, where Main seeds from today's value, Girls from 1 (after the renumber) and the others from 0. Local and test programme ids are prog_boys/girls/elite, but prod's are not, so the migration matches by name and the rename script sets the codes explicitly. A single generator, `src/lib/athlete-numbers.ts` (same pattern as `document-numbers.ts`), is used by registration.
2. **Links by record ID (live before step 6).** All page and API links move from `athleteId` to the uuid `id`. The route lookup accepts the uuid, the current ID and any former ID, because emails already sent carry old links. Encode the ID wherever it remains in a query string. File names for PDFs and exports replace `/` with `-`.
3. **Search.** New `athlete.former_ids text[]`. Searches treat `-` and `/` alike (`ATH-FFA-M-501`, `ATH/FFA/M/501`, the former `ATH-FFA-501` and `501` all find the athlete) and also search former IDs. Applies to `athleteIdTerm` in `filters.ts`, the `audit.ts` lookup, `shop/new`, and the athlete picker in `RecordPaymentDialog`.
4. **Stamp programme on money.** Add `programme_id` to `invoices` and `finance`, backfill from the current batch (before any tracked transfer exists), and set it in every create path (registration, billing cron, late fees, shop on-account, family payment, `apply-payment.ts`). Switch `inProgramme.invoice/payment` to the stamp.
5. **Transfer.** Add an `athlete_transfers` table (athlete, from/to batch, from/to programme, date, by, reason). Add a "Transfer" action in the athlete "…" menu with a new batch, a fee plan for that programme, a date and a reason. It runs through the activity-log wrapper, ends the old subscription, starts the new one, and drops the athlete from the old batch's future sessions. `update-athlete.ts` may then only move within the same programme.
6. **Rename existing IDs (one-off, with step 1).** A reviewed SQL script: `former_ids = [old]`, `athlete_id = 'ATH/FFA/' || code || '/' || number`, where the code comes from the programme of the athlete's current batch. Main keeps each athlete's number; Girls are renumbered from 1 in `created_at` order (prod: one athlete, `ATH-FFA-954` → `ATH/FFA/G/001`). Before writing it, grep for places that store the ID as plain text with no FK (audit `details`, invoice/receipt references, payment notes), because the cascade won't touch them. Rehearse it on a restored dump, take a backup first, and run it at deploy.
7. **Reports.** Add a programme comparison with athletes (start, joined, transferred in/out, left, end), billed, collected, outstanding, expenses and margin, plus attendance rate side by side. Also a transfers list for a period. The client is still to say what "and more" covers.
8. **Tests.** Integration tests for: the counter per programme (Girls starts at 1), the ID unchanged after a transfer, old invoices staying in the old programme's report, an old ID finding the athlete, and the athlete edit refusing a cross-programme batch. Update the tests and the seeder that hard-code `ATH-FFA-`: `register-athlete.test.ts`, `search.test.ts`, `how-to-pay.test.ts`, `export-cells.test.ts`, `prisma/seed/athletes.ts`.

## Open

- If the academy later sets `payment_reference = ATHLETE_ID`: check that the paybill accepts `/` in the account number; if it doesn't, show the ID with dashes on payment instructions only.
- Which further reports the client wants.
