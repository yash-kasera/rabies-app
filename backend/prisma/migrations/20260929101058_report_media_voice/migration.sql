-- AlterTable
ALTER TABLE "bite_reports" ADD COLUMN     "voice_seconds" INTEGER;

-- CreateTable
CREATE TABLE "report_media" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_media_report_id_kind_key" ON "report_media"("report_id", "kind");

-- AddForeignKey
ALTER TABLE "report_media" ADD CONSTRAINT "report_media_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bite_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
