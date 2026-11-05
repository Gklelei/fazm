-- Programmes stay hidden from everyone but the super admin until switched on in Settings
ALTER TABLE "academy" ADD COLUMN "programmes_mode" TEXT NOT NULL DEFAULT 'preview';
