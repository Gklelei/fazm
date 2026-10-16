# V2 phase 2 plan

Written 2026-10-16 from the developer's request. Phase 1 (the v2 redesign of the main lists,
dashboard and reports, the security fixes and the deploy) is live. This plan covers what's left
of the redesign, then the new features: documents, statements, family accounts, payroll, the shop
and charts.

## Order of work

| # | Stage | What | Needs answers? |
|---|---|---|---|
| 0 | Safety net and speed | Tests around the sensitive server code; fix the slow first load; rewrite the auth pages and the system utilities | No |
| 1 | Forms and pages | Redesign and rewrite the create, edit and details flows | Settings: yes (Q1) |
| 2 | Documents | Professional invoices, receipts, statements and exports | No |
| 3 | Finance | Student statements, family (sibling) accounts, finance officer access | Q2, Q3 |
| 4 | Payroll | Pay profiles, configurable deductions, advances, payroll runs, payslips | Q4–Q6 |
| 5 | Shop | Jerseys, shirts, shorts and socks; sales kept apart from fees | Q7, Q8 |
| 6 | Charts | Income and spending by source, with drill-down to the records | No |

Each stage ships on its own: built locally, checked on the local app at laptop and phone sizes,
committed, then deployed when the server can be reached.

## Stage 0: safety net and speed (first)

**Why the app is slow to reach the sign-in page.**
- The root layout wraps every page, sign-in included, in `UtilsProviderWrapper`, a client
  component. After the JavaScript loads, it calls `/api/settings/utils`, and the whole screen
  shows `AppLoader` until that request returns.
- That route loads every training location, drill, batch, coach, attendance reason, expense
  category and fee plan, with full rows and no paging.
- So every first load waits for: page → JavaScript → hydration → that request (auth check plus 8
  queries) → render. On a signed-out sign-in page the request returns 401, but the loader still
  waits for it.
- The proxy also runs a session lookup on that request, on top of the one in the route.

**The fix:**
- **Auth pages:** sign-in, reset password and change password load no settings at all.
- **The academy colour:** set on the server in the root layout, from a cached academy query.
  There's no client fetch and no colour flash.
- **No global "utils" payload.**
  - Each page loads, on the server, only the lookups it uses (a session form needs batches,
    locations and coaches, for example).
  - These go through small cached query functions (`getBatches()`, `getLocations()`, and so on)
    with cache tags.
  - Every create, edit or delete of that data clears its tag, so pages never show stale lists.
- **The full-screen loader** stays only for first sign-in, as per the UX standard. Pages use
  their `loading.tsx` skeletons.
- **Aggressive caching for the system utilities.** This data rarely changes, so it has no
  time-based expiry. It stays cached until someone changes it.
  - Each lookup has its own cache tag (batches, locations, drills, attendance reasons, expense
    categories, fee plans, coaches, academy).
  - Every create, edit, archive or delete of that data clears only its tag.
  - One cache helper is used everywhere, so the "clear the tag" step can't be forgotten; a test
    checks every utilities mutation clears its tag.
  - This uses Next 16's tagged cache (`"use cache"` + `cacheTag`, replacing `unstable_cache`),
    checked against the installed Next docs when built.
  - Production runs one server process, so its cache is enough. Revisit if a second instance is
    added.

**Safety net before touching server logic.**
- The backend handles money, attendance and session generation, and only 4 test files exist today.
- Before rewriting any action, add integration tests against a throwaway local database that pin
  its current behaviour:
  - recording a payment, including two at once;
  - invoice status and balance;
  - coupons;
  - creating a batch and generating its sessions;
  - marking attendance;
  - registering an athlete.
- Each rewrite must keep those tests green. Where today's behaviour is a bug, the test changes
  on purpose and the commit says so.
- Database changes are additive migrations only, run against a copy of the production backup first.

**Activity log: complete coverage.**
- Today, logging is added action by action, so some endpoints aren't logged, and nothing logs reads.
- **Every change is logged:** create, update, delete, archive, restore, payment, refund, sign-in,
  sign-out, failed sign-in and password change.
  - Every server action and API route that changes data goes through one wrapper that writes
    the log entry.
  - A test fails the build if a mutation skips it.
- **Reads are logged where they matter:**
  - opening a sensitive record (athlete profile including medical details, guardian contacts,
    invoice, payment, staff details, and later payroll, advances and payslips);
  - every export and PDF download (invoice, receipt, statement, payslip, CSV or Excel).
  - List pages and dropdown lookups aren't logged: that would be noise and grow the table quickly.
- **Each entry records:**
  - who, their role and when;
  - what was done ("viewed", "created", "exported" and so on);
  - which record, by name;
  - what changed (before and after, for edits);
  - IP address and device.
- **The activity log page:**
  - filters by person, action (including "viewed" and "exported"), area and date;
  - a record's own page shows its history;
  - exports follow the filters.
- **Retention:** decided with the developer (suggest 2 years, with older entries archived to the
  backup rather than deleted).

**Archived records: visible to system admins only.**
- Lists hide archived records for everyone.
- System admins (`SUPER_ADMIN` and `ADMIN`) get a **"Show archived"** toggle on every list.
  - Archived rows show an "Archived" badge.
  - A **Restore** action reopens the record, and the activity log records it.
- Opening an archived record works for admins only. Everyone else gets "not found".
- This is enforced in the server queries, not just hidden in the UI.

**Build safety:** `next.config.ts` ignores TypeScript errors in production builds
(`ignoreBuildErrors`). Remove that once the type errors are at zero, so a type error can never
ship.

**Rewrite the auth pages.**
- Sign-in, reset password and change password, in the v2 design.
- Clear errors, a show/hide password toggle, a caps-lock warning, and the live password checklist.
- Fast: server-rendered, with no settings fetch.

**Rewrite the system utilities** (settings data used everywhere):
- batches and their weekly schedules (including the session generation logic);
- training locations;
- drills;
- attendance reasons;
- expense categories;
- fee plans.

Each gets a clean list page, create and edit dialogs, and server actions with role checks and
validation. They also get the cached lookups described above. Batch session generation is
reviewed for correctness: no duplicates, time zones, and editing a schedule that already has
sessions.

**Server code review, area by area.**
- While each area is rewritten, its server actions and queries are read end to end. Where there's
  a simpler or safer way, it's rewritten: for example, transactions around multi-step writes, no
  stale reads, and pagination instead of loading whole tables.
- The tests above guard every change.

## Stage 1: forms and pages

**Two kinds of screens.**
- **Training is mobile first.** Coaches use it on their phones at the pitch. It's designed at
  360px wide first, then scaled up:
  - sessions list and session details;
  - marking attendance (big tap targets, one hand);
  - assessments.
- **Back-office pages are desktop first.** Office staff use PCs, so these favour wide tables and
  keyboard use. They still work on a phone, with tables turning into cards:
  - finance;
  - settings;
  - staff;
  - reports.

**User menu and profile.**
- The user menu moves to the **sidebar footer**, using shadcn's own sidebar pattern (the `NavUser`
  block from the shadcn sidebar examples).
  - It shows the avatar, name and email.
  - Its dropdown holds "My profile", theme and "Log out".
- **A more detailed profile page** for each person:
  - photo;
  - contact details;
  - role;
  - password and sign-in security;
  - their recent activity;
  - for staff, from Stage 4, "My finances" with payslips and advances.

For each area, the **create, edit and details code is rewritten together with its pages and
dialogs**. Every edit page and every dialog (confirmations, quick-add, row actions) is included,
not just the create forms. The rewritten code covers:
- server actions;
- queries;
- zod schemas;
- role checks through `src/lib/roles.ts`.

It follows the feature-folder conventions. The page uses the v2 components (`PageHeader`,
`StatCard`, `StatusBadge`) and one shared form kit.

1. **Form kit** (shared, built once):
   - sections with headings;
   - a step indicator for long forms;
   - phone (+254), money (KES) and date inputs;
   - field errors and a form-level error;
   - a sticky Save/Cancel bar;
   - a warning when leaving with unsaved changes;
   - saving states.
2. **Athlete registration and edit:** the onboarding steps, as one guided flow, now including
   **parental consent**. Consent is required by the Data Protection Act for children's data, and
   registration can't finish without it:
   - **What's consented to:**
     - the academy keeping and using the child's data;
     - emergency medical treatment;
     - photos and videos, a **separate, optional** choice.
   - **Who and how:**
     - the consenting parent or guardian's name and relationship;
     - how consent was given: in person (ticked and typed by staff), or a signed form uploaded;
     - the date;
     - the version of the consent text.
   - **On the athlete's profile:** consent shows there, can be withdrawn or updated (each change
     is logged), and the photo choice is respected wherever photos appear.
   - **Existing athletes:** a list of those with no consent recorded, so the office can collect it.
   
   The onboarding steps are:
   - personal;
   - guardian;
   - medical;
   - address;
   - documents;
   - physicals;
   - subscription.
   It ends on a review step.
3. **Sessions:** create and edit, including batch schedules.
4. **Invoices:** create, edit and the details page:
   - lines;
   - payments;
   - balance;
   - history.
5. **Staff (coaches included):** create and edit, a **complete rewrite of the staff details
   page**, and the person's own profile.
   - Details: contact, role and status.
   - Sessions they coach, attendance they've taken, and assessments they've done.
   - Their activity from the log.
   - Stage 4 adds pay profile, advances and payslips here.
6. **Coupons:** create, edit, and a list with usage.
7. **Assessments:**
   - templates and metrics;
   - recording an assessment;
   - an athlete's assessment history.
8. **Settings and the academy page: a full rework** (needs Q1):
   - **Academy profile:** name, logo, contacts, address, KRA PIN.
   - **Customisation:**
     - brand colour and logo, used on the app and every document;
     - invoice and receipt number prefixes;
     - document footer and terms;
     - payment details shown on invoices (paybill/till, bank).
   - **Operations:** batches, training locations, attendance reasons, fee plans.
   - **Users and roles.**
   - **Notification emails:** which emails are sent, and to whom.
   - Later stages add sections here: payroll deductions (stage 4) and shop products (stage 5).

## Stage 2: documents and exports

- **One document design** for invoices, receipts, statements and payslips:
  - the academy's letterhead (logo, colour, contacts, KRA PIN);
  - clear totals;
  - payment instructions;
  - page numbers.
- **PDFs:** the invoice PDF and receipt get the new design; the statement and payslip use it too.
- **Exports**, in this order:
  - **Excel (.xlsx):** headers, money formatting, totals and a frozen header row.
  - **CSV:** readable column names, and names instead of IDs.
  - **Printable PDF lists:** for example, the batch list for printing that the client asked for.

## Stage 3: finance

- **Student statement:** a running ledger for one athlete over a chosen period:
  - opening balance;
  - invoices, payments, discounts and credits by date;
  - a running balance;
  - closing balance.
  It's available as a PDF, or emailed to the guardian.
- **Family (sibling) accounts:**
  - siblings are linked through a shared guardian, into a family account;
  - the family statement combines all the children;
  - one payment can be split across the siblings' invoices, oldest first unless staff choose;
  - an optional sibling discount (Q2).
- **Finance officer:**
  - The `FINANCE` role already exists. It sees finance, the shop and payroll, but not squad administration.
  - `ADMIN` and `SUPER_ADMIN` keep access to everything (they're the academy's system admins).
  - Payroll visibility is decided by Q3.

## Stage 4: payroll

Research (2026-10-16, Kenyan sources; check against KRA and NSSF before go-live).

**Statutory deductions:**

| Deduction | Rule |
|---|---|
| PAYE | Monthly bands at 10%, 25%, 30%, 32.5% and 35%, less a personal relief of KES 2,400 |
| NSSF | 6% per tier; lower limit KES 9,000, upper KES 108,000 (from Feb 2026); maximum KES 6,480 employee + 6,480 employer |
| SHIF | 2.75% of gross, minimum KES 300, no cap |
| Housing Levy | 1.5% employee + 1.5% employer |

NSSF, SHIF and the Housing Levy come off before PAYE is worked out.

The Employment Act s.19(3) caps total deductions at two-thirds of pay, so the employee keeps at
least a third. Advance recoveries count toward that cap.

**Design:**
- **Pay profile per staff member:**
  - salary (optional);
  - pay basis: monthly, or per session (Q4);
  - payment method: M-Pesa or bank.
- **Deductions are configurable, not hard-coded.**
  - The academy sets each one's name, type and value:
    - type: percentage of gross, percentage of basic, fixed amount, or banded (for PAYE);
    - value;
    - whether it's taken before or after tax;
    - any employer share.
  - Kenyan statutory presets come filled in with the rates above (Q6) and stay editable.
  - Each deduction can apply to everyone or to chosen staff.
- **Advances: the most important part.**
  - **Recording an advance:**
    - date and amount;
    - how it was paid (M-Pesa, cash, bank) and its reference;
    - reason;
    - who approved it.
  - **Repayment plan:** in full at the next payroll, or over N months (Q5).
  - **The employee's advance ledger:** advances given, recoveries, and the balance outstanding.
  - **On each payroll run:**
    - the due installment is deducted automatically;
    - the payslip shows the advance line and the balance left;
    - if total deductions would exceed two-thirds of pay, the run warns and suggests moving the rest to next month.
  - **Several advances in one month** are allowed. They add to the same balance and are recovered in order.
- **Payroll run:**
  - draft → review (edit allowances, one-off deductions, advances) → approve (locked) → mark paid;
  - each run produces payslips;
  - an approved run is never edited: a correction goes into the next run.
- **Monthly payslips by a cron job.**
  - On the last day of each month, a scheduled job (on the existing server crontab, through the
    jobs endpoint) creates that month's payslips for every staff member with a pay profile.
  - Each payslip is worked out from the salary, the configured deductions, the advance
    installments due and any one-off items.
  - The job runs safely more than once: a second run updates that month's provisional payslips
    and never duplicates them.
  - Every payslip starts as **Provisional**: the PDF carries a "PROVISIONAL" watermark, and the
    app shows "Provisional, subject to change by the admin".
  - The admin reviews and adjusts it, then approves the month, which makes the payslips final
    and locks them.
  - Staff see the provisional one, then the final one.
  - Advances given after the run are added the next time it runs that month.
- **Payslips:** PDF in the new document design. Employees see their own payslips under
  "My finances" in their account.
- **Expenses:** an approved run posts salary costs to expenses, so the charts and reports include them.

## Stage 5: shop

- **Products:**
  - jersey, shirt, shorts and socks;
  - each with variants (size, and colour if needed);
  - price, photo and stock count.
- **Sales** are separate from fee invoices:
  - their own numbers (for example SO-2026-0001);
  - an order with lines, payment (M-Pesa, cash) and a receipt;
  - an optional link to an athlete;
  - "charge to the athlete's account" is decided by Q8.
- **Stock:** every movement is recorded (received, sold, adjusted), with a low-stock alert.
- **E-commerce style:**
  - a product catalogue with photos;
  - staff build an order like a cart;
  - sales and stock reports.
  - Whether parents order online is Q7.

## Stage 6: charts

- **Income by source, side by side:** fees, shop and other income.
- **Spending by category:** including payroll.
- Month on month and against last year.
- Every chart shows where its numbers come from, and clicking a bar opens the records behind it.

## Questions for the developer

1. **Academy settings customisation:** beyond logo, colour and document details, what does the
   client want to customise? Some ideas:
   - fee reminder timing;
   - default fee plan;
   - attendance rules;
   - the email sender name.
2. **Siblings:** is there a sibling discount? If so, is it a percentage for the 2nd child, the 3rd, and so on, or set per family?
3. **Payroll access:** does the finance officer see everyone's salaries, or only admins?
4. **Pay basis:** are coaches paid monthly only, or per session as well?
5. **Advances:** is the default recovery in full next month or in installments, and does an advance need an admin's approval?
6. **Statutory presets:** pre-fill PAYE, NSSF, SHIF and the Housing Levy with today's rates, or start empty?
7. **Shop ordering:** do only staff record sales, or do parents also order and pay online?
8. **Shop on account:** can a shop sale be charged to the athlete's account, so it shows on their statement?
9. **Activity log retention:** keep 2 years, with older entries archived to the backup (suggested)?
10. **Consent text:** does the academy have its own consent wording or form, or should a draft be
    written for them to review?
