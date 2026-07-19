import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Password123!";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type SeedUser = {
  email: string;
  isAdmin: boolean;
  displayName: string;
};

const SEED_USERS: SeedUser[] = [
  { email: "admin@startline.test",     isAdmin: true,  displayName: "Admin User" },
  { email: "organiser@startline.test",  isAdmin: false, displayName: "Test Organiser" },
  { email: "user@startline.test",   isAdmin: false, displayName: "Test User" },
];

async function ensureSupabaseUsers(): Promise<{
  usersById: Record<string, string>;
  adminIds: string[];
}> {
  const usersById: Record<string, string> = {};
  const adminIds: string[] = [];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("  SUPABASE_SERVICE_ROLE_KEY not set — using mock auth IDs");
    usersById["admin@startline.test"] = "dev-bypass-admin";
    usersById["organiser@startline.test"] = "dev-bypass-organiser";
    usersById["user@startline.test"] = "dev-bypass-user";
    adminIds.push("dev-bypass-admin");
    return { usersById, adminIds };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of SEED_USERS) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users.find((u) => u.email === user.email);

    if (found) {
      usersById[user.email] = found.id;
      const role = found.app_metadata?.role as string;
      if (role === "admin") adminIds.push(found.id);

      if (role !== (user.isAdmin ? "admin" : undefined)) {
        await supabase.auth.admin.updateUserById(found.id, {
          app_metadata: user.isAdmin ? { role: "admin" } : {},
        });
        if (user.isAdmin) adminIds.push(found.id);
      }
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: user.isAdmin ? { role: "admin" } : {},
      user_metadata: { displayName: user.displayName },
    });

    if (error) {
      console.warn(`  Failed to create ${user.email}: ${error.message}`);
      continue;
    }

    usersById[user.email] = data.user.id;
    if (user.isAdmin) adminIds.push(data.user.id);
  }

  return { usersById, adminIds };
}

async function main() {
  console.log("Seeding database...\n");

  const { usersById, adminIds } = await ensureSupabaseUsers();

  await prisma.adminAuditLog.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.review.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.waitlistSubscriber.deleteMany();
  await prisma.organiser.deleteMany();

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      authId: usersById["admin@startline.test"],
      email: "admin@startline.test",
      name: "Admin User",
    },
  });
  console.log(`  Created user: admin@startline.test (${adminUser.id})`);

  const organiserUser = await prisma.user.create({
    data: {
      authId: usersById["organiser@startline.test"],
      email: "organiser@startline.test",
      name: "Test Organiser",
    },
  });
  console.log(`  Created user: organiser@startline.test (${organiserUser.id})`);

  const testUser = await prisma.user.create({
    data: {
      authId: usersById["user@startline.test"],
      email: "user@startline.test",
      name: "Test User",
    },
  });
  console.log(`  Created user: user@startline.test (${testUser.id})`);

  // Create admin record
  await prisma.admin.create({
    data: {
      authId: usersById["admin@startline.test"],
      email: "admin@startline.test",
      name: "Admin User",
    },
  });

  // Create organiser record
  await prisma.organiser.create({
    data: {
      userId: organiserUser.id,
      email: "organiser@startline.test",
      orgName: "Apex Endurance Events",
      verified: true,
      status: "APPROVED",
    },
  });

  console.log("\nSeeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
