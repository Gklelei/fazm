-- One-off move to per-programme athlete IDs (docs/v2-audit/18-transfers-and-ids.md):
--   Main (prog_boys, M) keeps each athlete's number:   ATH-FFA-501 -> ATH/FFA/M/501
--   Girls (prog_girls, G) and Elite (prog_elite, E) count from 1 in join order: ATH-FFA-954 -> ATH/FFA/G/001
-- The old ID stays in former_athlete_id (old links, papers and searches still find them). Every
-- table holding the ID follows through ON UPDATE CASCADE (14 foreign keys, checked on prod).
-- Each check below stops the whole migration, which runs in one transaction: nothing changes.

-- Programme letters
UPDATE "programmes" SET "code" = 'M' WHERE "id" = 'prog_boys';
UPDATE "programmes" SET "code" = 'G' WHERE "id" = 'prog_girls';
UPDATE "programmes" SET "code" = 'E' WHERE "id" = 'prog_elite';

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(p."name", ', ') INTO missing
  FROM "programmes" p
  WHERE p."code" IS NULL
    AND EXISTS (SELECT 1 FROM "batches" b JOIN "athlete" a ON a."batches_id" = b."id" WHERE b."programme_id" = p."id");
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Programmes with athletes but no ID letters: %. Add them to this migration.', missing;
  END IF;

  SELECT string_agg(a."athlete_id", ', ') INTO missing FROM "athlete" a WHERE a."athlete_id" !~ '^ATH-FFA-[0-9]+$';
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Athlete IDs not in the ATH-FFA-### form: %', missing;
  END IF;

  -- Renumbering from 1 was agreed for athletes who joined Girls after programmes began
  -- (2026-11-05). Anyone older sorted into Girls or Elite would lose a long-standing number.
  SELECT string_agg(a."athlete_id", ', ') INTO missing
  FROM "athlete" a JOIN "batches" b ON b."id" = a."batches_id"
  WHERE b."programme_id" <> 'prog_boys' AND a."created_at" < TIMESTAMP '2026-11-05';
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Athletes from before programmes are in Girls or Elite and would be renumbered: %. Decide their numbers first.', missing;
  END IF;
END $$;

-- The new ID of every athlete, from the programme of their batch. An ordinary table, dropped at
-- the end of this same transaction: prod's database user may not create TEMP tables.
DROP TABLE IF EXISTS "new_ids";
CREATE TABLE "new_ids" AS
SELECT
  a."id",
  a."athlete_id" AS "old_id",
  p."code",
  CASE
    WHEN p."id" = 'prog_boys' THEN substring(a."athlete_id" FROM '([0-9]+)$')::int
    ELSE row_number() OVER (PARTITION BY p."id" ORDER BY a."created_at", a."athlete_id")::int
  END AS "n"
FROM "athlete" a
JOIN "batches" b ON b."id" = a."batches_id"
JOIN "programmes" p ON p."id" = b."programme_id";

ALTER TABLE "new_ids" ADD COLUMN "new_id" TEXT;
UPDATE "new_ids" SET "new_id" = 'ATH/FFA/' || "code" || '/' || lpad("n"::text, greatest(3, length("n"::text)), '0');

DO $$
DECLARE problem text;
BEGIN
  IF (SELECT count(*) FROM "new_ids") <> (SELECT count(*) FROM "athlete") THEN
    RAISE EXCEPTION 'Some athletes have no batch or programme, so no new ID';
  END IF;
  SELECT string_agg("new_id", ', ') INTO problem
  FROM (SELECT "new_id" FROM "new_ids" GROUP BY "new_id" HAVING count(*) > 1) d;
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'Two athletes would share: %', problem;
  END IF;
END $$;

-- The move (the old and new forms can't clash: only new IDs have slashes)
UPDATE "athlete" a
SET "former_athlete_id" = n."old_id", "athlete_id" = n."new_id"
FROM "new_ids" n
WHERE n."id" = a."id";

-- Counters: Main carries on after the academy-wide number (ATH/FFA/M/956 next on prod);
-- the others after the athletes they now have
UPDATE "programmes" p SET "athlete_counter" = greatest(
  (SELECT coalesce(max("n"), 0) FROM "new_ids" WHERE "code" = p."code"),
  CASE WHEN p."id" = 'prog_boys' THEN (SELECT coalesce(max("current"), 0) FROM "athlete_sequence") ELSE 0 END
)
WHERE p."code" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "athlete" WHERE "athlete_id" LIKE 'ATH-FFA-%') THEN
    RAISE EXCEPTION 'Some athletes still have an old ID';
  END IF;
END $$;

DROP TABLE "new_ids";
