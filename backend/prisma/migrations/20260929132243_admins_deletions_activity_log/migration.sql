-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "disabled_at" TIMESTAMP(3),
ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "hospital_name" TEXT,
    "subject" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- Existing hospital logins were created by the government, so each is its hospital's admin.
UPDATE "users" SET "is_admin" = true WHERE "role" = 'hospital';

-- The first government account (created by the admin seed) is the super admin.
UPDATE "users" SET "is_admin" = true
WHERE "id" = (SELECT MIN("id") FROM "users" WHERE "role" = 'government');
