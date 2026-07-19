-- Rename cognitoSub to authId on users table
ALTER TABLE "users" RENAME COLUMN "cognitoSub" TO "authId";
ALTER INDEX "users_cognitoSub_key" RENAME TO "users_authId_key";

-- Rename cognitoSub to authId on admins table
ALTER TABLE "admins" RENAME COLUMN "cognitoSub" TO "authId";
ALTER INDEX "admins_cognitoSub_key" RENAME TO "admins_authId_key";
