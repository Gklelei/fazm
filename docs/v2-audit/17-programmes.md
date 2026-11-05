# Programmes: Boys, Girls and Elite

Fazam now runs three programmes: Boys, Girls and Elite (older players). Each programme's
finances, attendance and training are looked at separately, and the owner still sees everything together.

## Design

A **programme** sits above batches. Each batch belongs to one programme
("Girls U13" belongs to Girls), so an athlete's programme comes from their batch and isn't stored twice.

```
Programme (Boys, Girls, Elite)
  └─ Batch (U7 … Senior)
       └─ Athlete ─ invoices, payments, attendance
       └─ Session ─ attendance
```

- **Programme switcher** in the header: All programmes, Boys, Girls or Elite. The choice is kept in a cookie
  for each browser and read on the server. Every list, export, report and dashboard figure follows it.
  "All programmes" is today's combined view.
- **Scope helpers** in `src/lib/programme.ts`: one `where` fragment per model, so a query adds the filter
  in one line:
  - athlete: `batches.programmeId`
  - invoice and payment: `athlete.batches.programmeId`
  - session: `batch.programmeId`
  - attendance: `training.batch.programmeId`
  - expense: `programmeId`, where empty means shared
- **Settings → Programmes** (a club list): add, rename and archive. A batch's dialog picks its programme.
  Batch names only have to be unique within a programme, so both Boys and Girls can have a U13.
- **Fee plans** can belong to one programme. Empty means any programme. The invoice form only offers
  the plans that fit the athlete's programme.
- **Expenses** get an optional programme. Empty means shared, for example pitch hire or transport. Reports for one
  programme show its own expenses, plus a separate "Shared costs" line.
- **Reports**: the selected programme, plus a "By programme" table (income, outstanding, attendance rate,
  athletes) when "All programmes" is selected.
- **Pickers**: batch selects (registration, sessions, roster filters) only offer the selected
  programme's batches.

## Existing data

The migration creates the three programmes and puts every current batch under **Boys**. The admin then
moves batches (or creates "Girls U13" and the rest) in Settings → Batches. There are no data copies: invoices,
payments and attendance follow the athlete's batch.

## Assumptions (until the client answers)

1. Each athlete is in one programme. Elite is a programme of its own, not a tag on top of Boys or Girls.
2. There is one paybill and one numbering for invoices and receipts across programmes. Only the
   reporting is separate.
3. The same admin team runs all three. Staff limited to one programme is a later step: `staff.programmeId`
   would be enforced in the same scope helpers.
4. Coaches can work across programmes. Their batches already limit what they see.
5. There is one shop. Sales aren't split by programme.
6. On screen the word is "Programme".

If the client answers differently on 1 or 2, revisit before Step 3.

## Progress (2026-11-05)

Steps 1 to 4 are built and tested; nothing is committed or deployed yet. Step 5 waits on the client.

## Steps

1. **Foundation:** schema and migration (programmes, `batches.programme_id`, per-programme batch names),
   lookups, scope helpers, header switcher, Settings → Programmes, programme on the batch dialog.
2. **Athletes and training:** roster, export and filters; sessions list; attendance; registration batch picker;
   dashboard counts.
3. **Money:** invoices and payments lists and exports, programme-specific fee plans, expenses with a programme,
   dashboard money cards.
4. **Reports:** scoped report, "By programme" table, shared costs line, drill-down records.
5. **Later, if wanted:** staff limited to one programme, separate invoice prefixes for each programme.

## Tests

Integration tests in `src/tests/integration/programmes/` cover:
- the scope helpers on each list (an athlete in Girls never appears under Boys);
- batch name uniqueness within a programme;
- archiving a programme that still has batches is refused.

## Deploy

Run `yarn db:deploy`, which adds the programmes migration. After it, check in Settings → Batches that all batches show "Boys".
