import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Testing basic user count...");
    const count = await prisma.user.count();
    console.log("User count:", count);

    console.log("\nTesting select with isBanned...");
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        isPublic: true,
        isBanned: true,
        city: true,
        state: true,
        createdAt: true,
        organiser: { select: { id: true, orgName: true, status: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log("Success! Users:", JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
