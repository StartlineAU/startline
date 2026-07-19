-- AlterTable
ALTER TABLE "events" ALTER COLUMN "photos" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "cognitoSub" DROP NOT NULL;
