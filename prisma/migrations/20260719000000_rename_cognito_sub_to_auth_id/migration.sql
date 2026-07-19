-- Rename cognitoSub to authId on users table
ALTER TABLE "users" RENAME COLUMN "cognitoSub" TO "authId";

-- Rename cognitoSub to authId on admins table
ALTER TABLE "admins" RENAME COLUMN "cognitoSub" TO "authId";

-- Rename the unique constraint indexes
ALTER INDEX "users_cognitoSub_key" RENAME TO "users_authId_key";
ALTER INDEX "admins_cognitoSub_key" RENAME TO "admins_authId_key";
