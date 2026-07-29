-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'hospital', 'government');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('Reported', 'Accepted', 'UnderTreatment', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('user_report', 'hospital_direct');

-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('Dog', 'Cat', 'Monkey', 'Bat', 'Other');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('LookedHealthy', 'LookedSickOrAggressive', 'Stray', 'OwnedAndVaccinated', 'Unknown');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MinorScratch', 'BleedingWound', 'DeepWound', 'MultipleBites');

-- CreateEnum
CREATE TYPE "HospitalStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('all', 'city', 'radius');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('OutbreakAlert', 'GeneralAwareness', 'NewHospital', 'MaintenanceNotice');

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "fcm_token" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "hospital_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contact_number" TEXT NOT NULL,
    "contact_email" TEXT,
    "status" "HospitalStatus" NOT NULL DEFAULT 'Active',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bite_reports" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "victim_name" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city_id" INTEGER NOT NULL,
    "incident_datetime" TIMESTAMP(3) NOT NULL,
    "animal_type" "AnimalType" NOT NULL,
    "animal_status" "AnimalStatus" NOT NULL,
    "severity" "Severity" NOT NULL,
    "photo_url" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'Reported',
    "accepted_by_hospital_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bite_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" SERIAL NOT NULL,
    "bite_report_id" INTEGER,
    "hospital_id" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "address" TEXT,
    "incident_datetime" TIMESTAMP(3) NOT NULL,
    "animal_type" "AnimalType" NOT NULL,
    "animal_status" "AnimalStatus" NOT NULL,
    "severity" "Severity" NOT NULL,
    "treatment_notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'Accepted',
    "source" "Source" NOT NULL DEFAULT 'user_report',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_doses" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "given_date" TIMESTAMP(3),
    "given_by" INTEGER,

    CONSTRAINT "vaccine_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "target_type" "NotificationTargetType" NOT NULL,
    "target_city_id" INTEGER,
    "target_lat" DOUBLE PRECISION,
    "target_lng" DOUBLE PRECISION,
    "target_radius_km" DOUBLE PRECISION,
    "sent_by" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sections" (
    "id" SERIAL NOT NULL,
    "section_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "cases_bite_report_id_key" ON "cases"("bite_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_sections_section_key_key" ON "content_sections"("section_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bite_reports" ADD CONSTRAINT "bite_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bite_reports" ADD CONSTRAINT "bite_reports_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bite_reports" ADD CONSTRAINT "bite_reports_accepted_by_hospital_id_fkey" FOREIGN KEY ("accepted_by_hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_bite_report_id_fkey" FOREIGN KEY ("bite_report_id") REFERENCES "bite_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_doses" ADD CONSTRAINT "vaccine_doses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_city_id_fkey" FOREIGN KEY ("target_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
