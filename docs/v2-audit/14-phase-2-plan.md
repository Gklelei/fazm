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

**Activity log: done 2026-10-16 (the page redesign is next).**
- Every server action and data-changing API route logs; `src/tests/unit/audit/coverage.test.ts`
  fails if one doesn't. Read-only exceptions are listed in that test with the reason.
- Entries record the role at the time, IP (X-Real-IP from nginx), device, a record id for history,
  and `{ before, after }` for edits (`diffFields`).
- Logged reads: athlete profile and edit page, invoice, payment, staff profile and edit page,
  each at most once per person per record every 10 minutes (`src/lib/audit-view.ts`).
- Logged downloads: every list export (`src/lib/export.ts`), receipts, invoice PDFs, session
  sheets, athlete profiles and assessments.
- Failed sign-ins are logged with the email tried, never the password.
- Fixed on the way:
  - Editing or deleting a payment wrote no log entry, because the athlete id was wrong.
  - Any signed-in user could edit any account's profile; now it's your own profile, or an admin.
  - Editing an assessment section didn't refresh the page.
- Retention: nothing is two years old yet (data starts Dec 2025). Archiving old entries is
  scheduled work for 2027.

**Server review: done 2026-10-16.** Stage 0 is complete apart from the deferred archived toggle.

Fixed:
- **Raw errors on screen.** About 20 actions returned `error.message` (database text included). Now
  `actionErrorMessage` (`src/lib/action.ts`) shows our own `ActionError` messages, the first form
  problem, or plain words for common database errors, and logs the rest. The Cloudinary action
  also sent the raw error object to the browser.
- **Invalid input crashed actions.** `.parse()` ran outside `try` in 9 actions, registration
  included. These now use `safeParse` and return the first problem.
- **Passport cover and bio-data page were swapped at registration.** New registrations are now
  correct. Check production for athletes registered before the fix:
  `SELECT count(*) FROM athletes WHERE coalesce(passport_cover,'') <> '' OR coalesce(passport_bio_data,'') <> '';`
  Those two images are stored the wrong way round, and swapping them back is a decision for the
  academy. The local data has none.
- **Coaches could plan, edit or delete any coach's session.** Now only their own; admins can
  manage any. Same for assessments: the assessing coach now comes from the session, not the
  browser, and the athlete must be on the register.
- **`/api/athlete/[id]` gave any signed-in user a full athlete record, medical details included.**
  Nothing used it, so it's deleted.
- **Staff IDs were random 4-digit numbers that could collide.** Now sequential
  (STAFF-FFA-1001…), with a retry if two are created at once.
- **Assessment logs were silently lost** (the same wrong-athlete-id problem as payments).
  `createAuditLog` now accepts either athlete id.
- **Archiving a staff member didn't sign them out.** Their sessions now end, within the
  5-minute sign-in cache.

Left as decisions for the academy:
- Coaches can edit athletes' details, medical included. Should only admins or the medical role?
- Uploaded files (photos, passports, medical documents) open for any signed-in user who has the
  link. The names are random and unguessable, but the check is "signed in", not "allowed to
  see this athlete".
- A role change reaches the person within 5 minutes (the sign-in cache), not instantly.

Dashboard load (production build, median of 5): normal 0.59 s before vs 0.61 s now; phone
(slow 3G, 4x CPU) **5.07 s before vs 1.66 s now**.

**Deploying: migrations first.** `scripts/deploy.sh` doesn't run migrations. Apply them on the
server with `yarn db:deploy` (`prisma migrate deploy`) before the new code starts. The new code
writes columns the old database lacks, and a log write that fails is dropped silently (by design,
so the user's change still saves). `yarn test:db` checks that the migrations rebuild exactly
`prisma/schema`.

**Archived records: visible to system admins only.**
*Deferred by the developer (2026-10-16). The Settings tabs already have the switch; the other lists will get it later.*
- Lists hide archived records for everyone.
- System admins (`SUPER_ADMIN` and `ADMIN`) get a **"Show archived"** toggle on every list.
  - Archived rows show an "Archived" badge.
  - A **Restore** action reopens the record, and the activity log records it.
- Opening an archived record works for admins only. Everyone else gets "not found".
- This is enforced in the server queries, not just hidden in the UI.

**Build safety:** `next.config.ts` ignores TypeScript errors in production builds
(`ignoreBuildErrors`). Remove that once the type errors are at zero, so a type error can never
ship.

**Safety net: done 2026-10-16.**
- Tests: `yarn test:db` (re)creates `<db>_test` from the migrations; `yarn test:int` runs the
  server actions against it, with only the session and Next helpers faked.
- 28 tests cover:
  - payments, including two at the same moment and receipt numbers;
  - creating, cancelling and restoring invoices;
  - creating a batch and generating its sessions;
  - attendance;
  - registration;
  - coupons and their usage limits.
- **Found, to fix in the rewrite:**
  1. Registration saves the passport cover and bio-data page into each other's fields
     (pinned by an `it.fails` test).
  2. Registration throws on invalid data instead of returning an error (`it.fails`).
  3. Batch session times are stored as if UTC (16:00 → 19:00 Nairobi). Check how pages display
     them before changing.
  4. Creating a batch and applying a coupon aren't in the activity log.
  5. Several actions return raw error text to the screen ("Database error: …", `error.message`).
  6. Registration's half-month rule: removed (the academy ruled it out); the first invoice is always the full plan amount.

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

**Stage 1 decisions (developer, 2026-10-16):**
- **Medical details:** coaches and the medical role can see them; only admins and the medical
  (DOCTOR) role can change them. Every change is logged.
- **Consent:**
  - under 18, a parent or guardian consents (required);
  - 18 and over, the athlete consents for themselves (a guardian is optional).
- **Photos and videos consent covers all photos.** Without it, the athlete has no photo in the
  system either (a placeholder is shown), and any uploaded photo is removed when consent is
  withdrawn.
- **Registering athletes:** admins only, as now.
- **Consent text:** drafted in English and Kiswahili as version 1, for the academy to review.
- **Uploaded athlete documents:** only roles that can open athlete profiles can open them.

**Sessions (Stage 1, item 3): done 2026-10-17.**
- **One phone-first page for planning and editing:**
  - when (date, start, end, with the length shown);
  - batch and pitch as chips; the coach is fixed for coaches;
  - plan: the title follows the batch, plus focus, drills (optional, tap to add, drag to
    order) and notes.
- **Session times are Nairobi time everywhere** (`src/lib/academy-time.ts`). Before, the form
  sent a time with no zone, which the server read in its own zone, and the edit page showed
  UTC, so every save moved a session 3 hours earlier. Saving, the list, the session page,
  attendance, the export, the PDF and the dashboard all use academy time now; the tests pass
  under TZ=UTC as well.
- **Pending the live server's time zone:**
  - If it's UTC, sessions created through the old form are stored 3 hours late and need a
    one-off, reviewed correction at deploy.
  - If it's Africa/Nairobi, nothing needs correcting.
- **Clashes now check the pitch too** (batch, coach or pitch), under a lock.
- **Changing a session's batch** brings the new batch's register; it's refused once
  attendance is taken.
- **The sessions list uses the shared cursor paging.**
- **Batches sort by age everywhere** (`src/lib/batch-order.ts`).
- **Later:** day-only dates elsewhere (registered, payments) still use the server's zone; fix
  them as each area is reworked.

**Invoices (Stage 1, item 4): done 2026-10-16.**
- **Invoices have lines** (`invoice_lines`): description, quantity and unit price, up to 20.
  The migration copies each existing invoice into one line, so totals are unchanged. The
  invoice's own amount is the sum of its lines; its description is a summary for lists.
- **One page for creating and editing:**
  - who: chosen athletes and/or whole batches (deactivated athletes are skipped; each athlete
    is billed once), with the number of invoices shown before saving;
  - charges: type, lines, and one-tap lines from the fee plans;
  - due date (the end of that day, Nairobi time) and notes.
- **Editing** can't take an invoice below its discount or what's been paid, recalculates the
  status, and is refused for a cancelled invoice. Every edit logs what changed.
- **The invoice page:** total, paid, balance and due at the top; charges; payments; history
  (edits, payments, cancelling, with what changed). Pay, edit, PDF, coupon and cancel/restore
  are on the page.
- **Discounts count everywhere:** list balances, the "still owed" total and the export.
- **Links use the invoice number;** old links by id still open.
- **The invoice PDF** lists the lines and shows issue and due dates in Nairobi time.
- **Invoice numbers take the Nairobi day,** so an invoice raised between midnight and 3am isn't dated
  the day before.
- **Deploy:** run `yarn db:deploy` (this adds `invoice_lines`) before starting the new code.

**Staff (Stage 1, item 5): done 2026-10-16.**
- **Decisions (developer, 2026-10-16):**
  - a staff member doesn't need a login (groundsman, cook, kit person);
  - a new login gets a one-time password, generated per person and shown once to the admin,
    which must be changed at first sign-in (no shared default password);
  - details kept: job title, start date, national ID, KRA PIN, NSSF, SHIF, monthly salary,
    emergency contact and documents, all optional; this is not a payroll system;
  - coaches are linked to the batches they coach.
- **One transaction for a new login:** the user, its password and the staff record are
  written together, so a failure can't leave a login without a staff record (the old
  two-step sign-up could). A migration gives every such existing login a staff record, so
  it shows on the list and can be managed; fill in their phone.
- **Staff list:** the shared table, phone cards, a sign-in filter, export (no pay or ID
  details), and a row menu: view, edit, new one-time password, archive.
- **Staff page:** contacts, batches, sessions coached (coming up and recent), documents,
  their activity, emergency contact, pay and statutory details, and history.
- **Sign-in on the staff form:** turning it off signs them out and stops access; turning it
  back on gives a new one-time password; a role change applies at once. Nobody can change
  their own role or sign-in, and only super admins can give or remove super admin.
- **Archiving** signs them out; restoring leaves sign-in off until it's turned on again.
- **Staff documents** can only be opened by admins.
- **My profile:** your name, photo, phone and emergency contact; change password; your
  devices, with "sign out others"; your recent activity.
- **Planning a session** starts with the batch's coach.
- **Deploy:** `yarn db:deploy` adds `staff_details` and `staff_for_every_login`.

**Coupons (Stage 1, item 6): done 2026-10-18.**
- **Decisions (developer, 2026-10-16):**
  - a repeating coupon goes on an athlete's fee plan and discounts every new fees invoice for
    them (by hand, batch billing) until it expires or is removed;
  - finance can take a coupon off an invoice or a fee plan; the use is given back;
  - limits: total uses, once per athlete, and only for chosen fee plans.
- **One-time coupons go on one invoice; repeating ones on a fee plan.** A use is counted when
  it's applied (to the invoice, or to the fee plan), safely when two people apply at once.
- **The discount** is a percentage or a fixed amount of the whole invoice, or only of the chosen
  fee plans' charges; it never takes an invoice below what's been paid. Editing an invoice's
  lines recalculates its coupon discount.
- **Fixed:** switching a coupon off never worked; applying one overwrote the invoice's notes and
  set its status by hand; switched-off coupons vanished from the list.
- **Pages:** the coupons list (standard table, state filter, export, row menu), one form for
  creating and editing, and a coupon page with the invoices it discounted, the fee plans it's
  on, and its history. "Remove coupon" is on the invoice page and the athlete's fee plan.
- **Deploy:** `yarn db:deploy` adds `coupon_rules`.

**Assessments (Stage 1, item 7): done 2026-10-18.**
- **Decisions (developer, 2026-10-18):** one shared checklist; assessed per session; skills
  are graded 1–5 or measured (time, count, distance), with a note per section; the history
  shows progress, a report for parents, and a comparison with the batch.
- **Checklist:** sections of skills, in order; each skill is a 1–5 grade or a measurement
  with a unit and whether higher or lower is better. Admins edit it; skills taken out are
  archived, so past assessments keep them.
- **Assessing (phone first):** pick an athlete from the session's register, tap grades, type
  measurements, add section notes and a comment, then "Save & next". Saving again replaces
  that athlete's assessment for the session.
- **History on the athlete's profile:** for each skill the latest score, the change since the
  last assessment (better is always shown as up, so a faster sprint is +), the best, the
  batch average (each batch athlete's latest score over the last 6 months) and a trend line;
  then the coach notes.
- **Progress report PDF** for parents, from the athlete's Assessments tab.
- **Deploy:** `yarn db:deploy` adds `assessment_measures`.

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
  - The `FINANCE` role already exists. It sees finance, the shop and payroll, but not batch administration.
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

## Answers from the developer (2026-10-16)

1. **Academy settings customisation:**
   - default fee plan;
   - attendance rules;
   - email sender name;
   - **SMTP settings**: the academy's own mail server, with the password encrypted at rest and a
     "Send test email" button.
   The developer asked for research and more suggestions; see "Settings: suggested additions" below.
2. **Sibling discount:** yes, set as **a percentage or a fixed amount**.
3. **Payroll access:** the finance officer sees all salaries, advances and payslips.
4. **Pay basis:** monthly and per session, set per person.
5. **Advances:** the person recording an advance chooses the repayment (in full next month, or
   over N months). **An admin approves it** before it counts.
6. **Statutory deductions:** PAYE, NSSF, SHIF and the Housing Levy are added as deduction types,
   but **the admin configures them** (rates, bands, on or off). They're shown as "not set up"
   until then.
7. **Shop orders:** staff only.
8. **Shop on account:** yes, optional. A sale can be charged to the athlete and shows on their
   statement until paid.
9. **Activity log:** kept 2 years, then archived to the backup.
10. **Consent text:** draft one in English and Kiswahili for the academy to review.

## Settings: suggested additions (for the developer to choose)

- **Branding:** logo, brand colour, and the sign-in page image.
- **Email:** SMTP (host, port, user, password, encryption), sender name and address, reply-to
  address, test email, and which emails are sent and to whom (for example, the weekly finance
  email).
- **Documents:**
  - number prefixes and the next number for invoices, receipts and sales;
  - default due days;
  - footer and terms;
  - payment instructions (paybill/till, bank);
  - an optional signature or stamp image;
  - KRA PIN.
- **Fees:**
  - default fee plan;
  - prorating for athletes who join mid-month;
  - the day monthly invoices are created;
  - an optional late fee after a grace period;
  - sibling discount rules.
- **Attendance:**
  - when an athlete counts as inactive (weeks with no training; this drives the deactivate job
    and the notice filters);
  - absence reasons;
  - how many days after a session attendance can still be edited.
- **Registration:**
  - required documents;
  - age groups worked out from the birth year;
  - athlete number format;
  - the consent text version.
- **Sessions:** default session length, and how many weeks ahead batches create sessions.
- **Payroll** (stage 4): pay day, deductions, and advance approval.
- **Shop** (stage 5): products, sizes, and the low-stock level.
- **Security and data:**
  - session timeout;
  - password rules;
  - activity log retention;
  - the date of the last backup.
