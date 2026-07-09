-- AlterTable: add photos column to events (missing from initial migration)
ALTER TABLE "events" ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT '{}';
