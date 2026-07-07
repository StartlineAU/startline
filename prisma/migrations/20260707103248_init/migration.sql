-- AlterTable
ALTER TABLE "users" RENAME CONSTRAINT "customers_pkey" TO "users_pkey";

-- RenameIndex
ALTER INDEX "customers_cognitoSub_key" RENAME TO "users_cognitoSub_key";

-- RenameIndex
ALTER INDEX "customers_email_key" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "customers_username_key" RENAME TO "users_username_key";
