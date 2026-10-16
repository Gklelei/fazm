# Settings redesign (Stage 0: system utilities)

## What's wrong today

- **"Batch" means two things.** In the data, batches are batches (U7–U17, Senior; 50–90
  athletes each). The settings screen treats a batch as a term with dates and one coach,
  and creates a new batch every time. No batch has a weekly timetable.
- **No list.** You can create a batch but not see, edit or archive one.
- **Generated sessions have no athletes.** Single sessions link the batch's athletes, but
  the batch generator doesn't, so attendance would show an empty roster.
- **Generated sessions are 3 hours late.** 16:00 is stored as 16:00 UTC, which shows as 19:00
  in Nairobi.
- **Archived pitches and drills still appear** in the session pickers.
- **Attendance reasons have no screen.** They come from the seed only.
- **Nothing here is activity-logged.** Raw database errors reach the screen.

## The new Settings page

The page header reads "Settings": *"The lists the rest of the app picks from. Changes show
everywhere straight away."* Tabs are kept in the URL (`?tab=`), so a link can open the right
one:

**Batches · Pitches · Drills · Attendance reasons**

There is a **Show archived** switch on every tab, with Restore on archived rows.

### Batches

Each batch is a card. Two columns on a computer, one on a phone. A card shows:

- the name, a description, and the number of athletes (linking to the Athletes page,
  filtered to that batch);
- the weekly timetable, one line per slot: `Mon · Wed  16:00–17:30  Eastleigh main pitch ·
  Coach`;
- the planning state:
  - "Sessions planned to Fri 20 Dec";
  - "Nothing planned for the next 7 days", in a warning colour, when it has a timetable but
    no sessions coming up;
  - "No timetable yet".
- the actions: **Timetable**, **Plan sessions**, and **⋯** (Edit, Archive or Restore).

A batch can't be archived while it has active athletes. The message tells you to move them
first.

The **Timetable** opens in a side panel (a bottom sheet on phones). It lists slots, and each
slot has:

- days, as toggle chips;
- start and end time, with the duration shown;
- the pitch;
- the coach.

Saving replaces the batch's timetable. Sessions that already exist are not changed.

**Plan sessions** opens a dialog:

1. Choose From and To dates. The defaults are tomorrow to 4 weeks later, and the most is
   26 weeks.
2. The server previews the plan, grouped by week, for example "16 sessions". It also says
   how many it will skip: "2 already planned" and "1 clashes with the coach's or pitch's
   other session".
3. Confirming creates them. Each session is linked to the batch's active athletes, the same
   as a single planned session.

Running it twice creates nothing new.

### Pitches, drills and attendance reasons

Each is one list card, with:

- the name, plus the description for drills;
- what uses it: "Used in 7 sessions" or "Used 12 times";
- row actions: Rename, and Archive or Restore.

Attendance reasons are grouped under Absent, Late, Excused and Present, with the
attendance colours. Archived items disappear from the pickers, but past sessions keep their
values.

## Server

- **One helper for role checks and errors.** Errors come back as plain messages, with the
  detail logged on the server. Every change writes an activity log entry.
- **Additive migration.** `Batches.isArchived`. `BatchSchedule` gets `endTime`, a pitch and a
  coach, all nullable. `TRAINING_ATTENDANCE_REASONS.isArchived`.
- **Times are academy time.** Africa/Nairobi is UTC+3 all year, converted in one function.
- **Session planning is one tested function.** Both the preview and the create use it, and
  the server always recomputes the list itself.
- **Settings lists stay cached until changed.** The pickers only see active items.

## Fee plans and expense categories

Both already have v2 pages under Money, so they stay there. Their Show archived toggle
comes with the archived-records work later in Stage 0.
