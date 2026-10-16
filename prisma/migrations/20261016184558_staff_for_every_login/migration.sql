-- Logins made by the old two-step sign-up could end up without a staff
-- record (the second step failed), which left them off the staff list and
-- impossible to manage. Give each one a staff record, numbered after the
-- highest STAFF-FFA number. The phone is filled in by an admin later.
WITH base AS (
  SELECT GREATEST(1000, COALESCE(MAX(CAST(substring("staffId" FROM '^STAFF-FFA-(\d+)$') AS INTEGER)), 1000)) AS n
  FROM "staff"
),
orphans AS (
  SELECT u.*, ROW_NUMBER() OVER (ORDER BY u."createdAt", u."id") AS i
  FROM "user" u
  WHERE NOT EXISTS (SELECT 1 FROM "staff" s WHERE s."userId" = u."id")
)
INSERT INTO "staff" ("id", "staffId", "userId", "fullNames", "phone_number", "email", "photo", "isArchived", "createAt", "updateAt")
SELECT
  gen_random_uuid()::text,
  'STAFF-FFA-' || (base.n + o.i),
  o."id",
  o."name",
  '',
  o."email",
  NULLIF(o."image", ''),
  o."isArchived",
  o."createdAt",
  NOW()
FROM orphans o, base;
