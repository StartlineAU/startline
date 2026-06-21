import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const cognitoSub = "f96ed4b8-d0d1-70b4-97c9-705938dd9ba0";

const org = await prisma.organiser.findUnique({ where: { cognitoSub }, select: { id: true, email: true, orgName: true, cognitoSub: true } });

if (!org) {
  console.log("No record found for", email);
} else {
  console.log("Found:", org);
  await prisma.registration.deleteMany({ where: { organiserId: org.id } });
  await prisma.announcement.deleteMany({ where: { organiserId: org.id } });
  await prisma.notification.deleteMany({ where: { organiserId: org.id } });
  await prisma.review.deleteMany({ where: { organiserId: org.id } });
  await prisma.event.deleteMany({ where: { organiserId: org.id } });
  await prisma.organiser.delete({ where: { id: org.id } });
  console.log("Deleted organiser and all related records for cognitoSub", cognitoSub);
}

await prisma.$disconnect();
