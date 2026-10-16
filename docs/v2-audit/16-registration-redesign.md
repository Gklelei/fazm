# Athlete registration, editing and consent (Stage 1, item 2)

## What's wrong today

- **Phones:**
  - the seven step labels run into each other;
  - the first-name field is squeezed to a few characters;
  - the error box shows code names ("firstName: This field is required").
- **Required fields many families can't give:**
  - a guardian email;
  - allergies and medical conditions, with no "None" option;
  - a guardian for adult (Senior) athletes.
- **Step checks are out of sync with the form.** The Address step checks `county` and
  `subCounty`, which don't exist, so its errors only appear at the final submit.
- **Nothing to check before saving.** There's no review step, and no consent is recorded.
- **Medical details:** any coach can edit them.

## The flow

The page is titled "Register athlete". On a computer, a step list sits on the left with ticks for
finished steps. On a phone, the top shows "Step 2 of 7 · Parent or guardian" with a thin progress
bar. Save and Back stay in a bar pinned to the bottom of the screen.

1. **Athlete:**
   - first, middle and last name;
   - date of birth, showing the age, and suggesting the batch from the age (it can be changed);
   - phone and email, both optional;
   - batch.
2. **Parent or guardian:** required under 18, optional at 18 and over.
   - name;
   - relationship (chips: Mother, Father, Guardian, Other);
   - phone (+254);
   - email, optional.
3. **Medical and emergency:**
   - blood group, with "Unknown" allowed;
   - allergies and conditions, each "None" or a list;
   - an emergency contact, with a "Same as the guardian" switch.
4. **Address and football:**
   - town, estate and address;
   - height, weight, stronger foot and hand, and positions (chips).
5. **Consent:**
   - who consents: the guardian under 18 (their name is pre-filled), the athlete at 18 and over;
   - keeping and using the athlete's data (required);
   - emergency medical treatment (required);
   - photos and videos (optional);
   - how it was given: in person (staff ticked it with the parent present) or a signed form
     (uploaded);
   - the date;
   - the consent text in English or Kiswahili, as version 1.
6. **Photo and documents:**
   - the photo can only be added when photo consent was given;
   - birth certificate, ID front and back, passport cover and bio page.
7. **Fee plan and review:**
   - choose the fee plan;
   - preview the first invoice;
   - a summary of every step, each with an Edit link;
   - the **Register athlete** button.

Moving to the next step checks only that step's fields, and a field's error shows under it in
plain words. Leaving with unsaved data asks first.

## Editing

The edit page uses the same sections on one page, with a section menu, one Save bar, and a warning
on leaving unsaved. The medical section is read-only unless the user is an admin or has the
medical (DOCTOR) role. Consent is changed from the profile, not here.

## Consent on the profile

- **A consent card** shows the current choices, who gave them, how and when, the text version, and
  the full history.
- **Actions:** "Update consent", and "Withdraw photo consent", which removes the profile photo.
- **Without photo consent,** a placeholder replaces the athlete's photo everywhere.
- **The athletes list** gets a "Consent: missing" filter, so the office can collect consent for
  existing athletes.

## Data (additive migration)

- **`AthleteConsent`:**
  - the athlete;
  - the text version and language;
  - three choices: `dataUse`, `emergencyTreatment` and `photos`;
  - who gave it: `givenByName` and `givenByRelationship` ("Self" at 18 and over);
  - `method`: `IN_PERSON` or `SIGNED_FORM`, plus `formUrl`;
  - `givenAt`;
  - who recorded it: `recordedById`;
  - `createdAt`.

  Every change adds a row, and the newest row is the current consent.
- **Guardian email** stays as it is. All 500 existing guardians have an empty email, so "none" is stored as "" and no migration is needed.

## Server

- **Registration** is rewritten on `asRole("admin")`, with one zod schema:
  - guardian required under 18;
  - consent required;
  - photo only with photo consent.

  The invoice and subscription steps keep their tested logic. It all runs in one transaction,
  with an activity log entry.
- **The edit action:** admins edit everything; the medical role edits only medical details;
  coaches can't edit. Changes are logged with before and after.
- **Consent actions** (update, withdraw photo) are logged and remove the photo on withdrawal.
- **Uploaded athlete documents** open only for roles that can open athlete profiles.

## Form kit (`src/components/form/`), built here and reused

- `FormSection` (title, help text and fields);
- `StepRail` (vertical on a computer, compact on a phone);
- `PhoneInput`: accepts 07…, 7…, +254… or 254…, and stores the local 10-digit form (0757 777 343), like the existing data;
- `ChoiceChips`;
- `FormAlert`;
- `StickyActions`;
- `useLeaveWarning`.
