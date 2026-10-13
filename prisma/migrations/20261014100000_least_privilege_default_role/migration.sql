-- New accounts start with the least-privileged staff role; admins are
-- granted explicitly (staff creation and the seeder always set a role).
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'COACH';
