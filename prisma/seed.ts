import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Password123!";

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

async function ensureNeonUsers(): Promise<Record<string, string>> {
  const authUrl = process.env.NEON_AUTH_BASE_URL;
  const subsByEmail: Record<string, string> = {};

  if (!authUrl) {
    console.warn("  NEON_AUTH_BASE_URL not set — using mock auth IDs");
    return {};
  }

  console.log("  Ensuring seed users exist in Neon Auth…");
  for (const user of SEED_USERS) {
    try {
      const res = await fetch(`${authUrl}/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: PASSWORD,
          name: user.displayName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.user?.id) {
          subsByEmail[user.email] = data.user.id;
        }
        console.log(`  Created ${user.email}`);
      } else {
        const body = await res.json();
        if (body?.code === "USER_ALREADY_EXISTS" || body?.status === 409) {
          const lookup = await fetch(`${authUrl}/auth/admin/list-users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: process.env.NEON_AUTH_COOKIE_SECRET ? "" : "",
            },
          });
        }
        console.log(`  ${user.email} already exists`);
      }
    } catch {
      console.warn(`  Could not reach Neon Auth — ${user.email} will use mock ID`);
    }
  }

  return subsByEmail;
}

async function main() {
  console.log("🌱 Seeding database…\n");

  const authSubs = await ensureNeonUsers();

  let subsByEmail: Record<string, string> = {};
  let adminSubs: string[] = [];

  if (Object.keys(authSubs).length > 0) {
    subsByEmail = authSubs;
  }

  if (Object.keys(subsByEmail).length === 0) {
    console.warn("  Using mock auth IDs (no real Neon Auth reachable)");
    subsByEmail = {
      "admin@startline.test":     "dev-bypass-admin",
      "organiser@startline.test": "dev-bypass-organiser",
      "user@startline.test":      "dev-bypass-user",
    };
    adminSubs = ["dev-bypass-admin"];
  }
  console.log(`  Auth users found: ${Object.keys(subsByEmail).length}`);

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
  console.log("  Cleared existing data");

  const adminRecords: { id: string; email: string; name: string | null }[] = [];
  for (const user of SEED_USERS) {
    if (!user.isAdmin) continue;
    const sub = subsByEmail[user.email];
    if (!sub) continue;
    const record = await prisma.admin.create({
      data: { authId: sub, email: user.email, name: user.displayName },
    });
    adminRecords.push(record);
  }
  console.log(`  Admins: ${adminRecords.length}`);

  const userBySub: Record<string, string> = {};
  for (const user of SEED_USERS) {
    const sub = subsByEmail[user.email];
    if (!sub) {
      console.warn(`  WARN: Auth user not found for ${user.email} — skipping`);
      continue;
    }
    const record = await prisma.user.upsert({
      where: { authId: sub },
      update: {},
      create: {
        authId: sub,
        email: user.email,
        name: user.displayName,
        username: user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
      },
    });
    userBySub[sub] = record.id;
  }
  console.log(`  Users: ${SEED_USERS.length}`);

  const orgSub = subsByEmail["organiser@startline.test"];
  let orgRecord: { id: string; email: string; orgName: string | null; instagram: string | null; facebook: string | null } | null = null;

  if (orgSub) {
    const userId = userBySub[orgSub];
    if (userId) {
      orgRecord = await prisma.organiser.create({
        data: {
          userId,
          email: "organiser@startline.test",
          verified: true,
          status: "APPROVED",
          orgName: "Apex Endurance Events",
          contactName: "Test Organiser",
          contactEmail: "organiser@startline.test",
          phone: "+61 400 000 000",
          abn: "51 824 753 556",
          website: "https://startlineau.com",
          instagram: "apexenduranceevents",
          facebook: "apexenduranceevents",
          bio: "Melbourne-based crew behind The Apex Throwdown and the Hybrid Hustle Series.",
          logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
          coverImageUrl: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1600&q=80",
          photos: [],
        },
      });
    }
  }

  if (!orgRecord) {
    console.warn("  Organiser record not created — skipping events that depend on it");
  } else {
    console.log("  Organiser: 1 (Apex Endurance Events)");
  }

  const org = orgRecord;
  if (!org) {
    console.log("  Events: 0 (no organiser)");
    console.log("  Seed complete (DB-only, no auth)");
    return;
  }

  const platformFeeCents = (amountCents: number) =>
    Math.round(amountCents * 0.0395) + 145;

  const apexThrowdown = {
    status: "APPROVED" as const,
    title: "The Apex Throwdown 2026",
    discipline: "crossfit",
    tagline: "Two days. One leaderboard. Every rep counts.",
    description: [
      "<p>Victoria's premier functional fitness competition returns for its fourth year.</p>",
    ].join(""),
    eventDate: "2026-08-15", endDate: "2026-08-16", startTime: "07:30", endTime: "17:00",
    venue: "Melbourne Sports & Aquatic Centre", address: "30 Aughtie Drive, Albert Park",
    city: "Melbourne", state: "vic", format: "both", level: "high",
    categories: ["Individual Scaled", "Individual RX", "Individual Elite", "Team of 2"],
    cap: 320, minAge: 16,
    waves: [
      { label: "Early Bird", price: "95",  closes: "2026-05-01", startTime: "",      qty: 80  },
      { label: "General",    price: "115", closes: "2026-07-15", startTime: "",      qty: 150 },
      { label: "Late Entry", price: "135", closes: "2026-08-07", startTime: "09:00", qty: 90  },
    ],
    inclusions: "Event t-shirt, finisher medal, post-event party, online score tracking",
    extras: "Prize pool: 8,000 — Awarded to podium finishers per division",
    activations: "Vendor expo Friday evening.",
    refundPolicy: "Full refund 30+ days out. 50% refund 14–30 days. Deferrals accepted. Free transfer to another athlete until 7 August 2026.",
    registrationType: "startline", feeStructure: "athlete",
    coverImageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1200&q=80",
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1200&q=80",
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80",
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=80",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
      "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=80",
    ],
    bagDrop: "Bag drop at Gate 3 from 6:45am.", parking: "MSAC car park $12/day.",
    accessibilityInfo: "Wheelchair accessible venue.",
  };

  const event1 = await prisma.event.upsert({
    where:  { id: "seed-event-001" },
    update: apexThrowdown,
    create: { id: "seed-event-001", organiserId: org.id, ...apexThrowdown },
  });

  const event2 = await prisma.event.upsert({
    where: { id: "seed-event-002" }, update: {},
    create: {
      id: "seed-event-002", organiserId: org.id, status: "PENDING",
      title: "Hybrid Hustle Series — Round 3", discipline: "hybrid",
      tagline: "Run. Lift. Repeat.",
      description: "Trail running, loaded carries, obstacle crawls, and a surprise finale.",
      eventDate: "2026-09-06", startTime: "08:00", endTime: "14:00",
      venue: "Kokoda Track Memorial Walkway", city: "Scoresby", state: "vic",
      format: "individual", level: "open", categories: ["Open Male", "Open Female", "Masters 40+"],
      cap: 150, minAge: 16, waves: [{ label: "General Entry", date: "2026-07-01", price: "75", qty: 150 }],
      inclusions: "Race entry, finisher medal, recovery snack bag", refundPolicy: "Flexible",
      photos: [], registrationType: "startline", feeStructure: "athlete",
      coverImageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
    },
  });

  const event3 = await prisma.event.upsert({
    where: { id: "seed-event-003" }, update: {},
    create: {
      id: "seed-event-003", organiserId: org.id, status: "DRAFT",
      title: "Team Throwdown Summer Series", discipline: "functional_fitness",
      tagline: "", description: "Draft — details TBC",
      eventDate: "2026-12-05", startTime: "09:00", endTime: "15:00",
      venue: "TBC", city: "Sydney", state: "nsw", format: "team", level: "open",
      categories: [], waves: [], photos: [], registrationType: "startline", feeStructure: "athlete",
    },
  });

  await prisma.event.upsert({
    where: { id: "seed-event-004" }, update: {},
    create: {
      id: "seed-event-004", organiserId: org.id, status: "REJECTED",
      title: "Autumn Run Festival", discipline: "running",
      tagline: "5K, 10K through the Yarra Valley",
      description: "A scenic trail run through the Yarra Valley vineyards.",
      eventDate: "2026-04-11", startTime: "07:30", endTime: "13:00",
      venue: "Yering Station", city: "Yering", state: "vic",
      format: "individual", level: "open", categories: ["5K", "10K", "Half Marathon"],
      cap: 500, waves: [{ label: "5K Entry", price: "45" }, { label: "10K Entry", price: "55" }, { label: "Half Marathon", price: "75" }],
      photos: [], registrationType: "startline", feeStructure: "athlete", refundPolicy: "Firm",
      rejectionReason: "Event date has already passed.", reviewedAt: new Date("2026-04-01T09:00:00Z"),
    },
  });

  const seedEvents = [
    { id: "seed-event-005", status: "APPROVED" as const, title: "Sydney Harbour 10K",         discipline: "running",   eventDate: "2026-09-20", startTime: "07:00", endTime: "10:00", venue: "Mrs Macquaries Chair",           city: "Sydney",   state: "nsw", format: "individual", level: "open",  categories: ["5K", "10K"],              cap: 2000, waves: [{ label: "General", price: "55" }], tagline: "Run past the Opera House", description: "A scenic 10K through Sydney's foreshore parks." },
    { id: "seed-event-006", status: "APPROVED" as const, title: "Gold Coast Marathon Weekend", discipline: "running",   eventDate: "2026-07-05", startTime: "06:00", endTime: "14:00", venue: "Gold Coast Highway",             city: "Gold Coast", state: "qld", format: "individual", level: "open",  categories: ["Marathon", "Half Marathon", "10K", "5K"], cap: 5000, waves: [{ label: "Marathon Entry", price: "120" }, { label: "Half Marathon", price: "85" }, { label: "10K Entry", price: "50" }], tagline: "Flat, fast, coastal", description: "Australia's premier marathon along the Gold Coast beachfront." },
    { id: "seed-event-007", status: "APPROVED" as const, title: "Uluru Sunset Run",            discipline: "running",   eventDate: "2026-10-12", startTime: "16:00", endTime: "19:00", venue: "Uluru-Kata Tjuta National Park",  city: "Uluru",   state: "nt",  format: "individual", level: "open",  categories: ["5K Fun Run", "10K Trail"], cap: 500, waves: [{ label: "General", price: "65" }], tagline: "Run at sunset", description: "A once-in-a-lifetime trail run around the base of Uluru at sunset." },
    { id: "seed-event-008", status: "APPROVED" as const, title: "Melbourne Marathon Festival",  discipline: "running",   eventDate: "2026-10-12", startTime: "07:00", endTime: "15:00", venue: "MCG",                             city: "Melbourne", state: "vic", format: "individual", level: "open",  categories: ["Marathon", "Half Marathon", "10K", "5K"], cap: 8000, waves: [{ label: "Marathon", price: "110" }, { label: "Half", price: "75" }], tagline: "Finish on the 'G", description: "Iconic marathon finishing inside the Melbourne Cricket Ground." },
    { id: "seed-event-009", status: "APPROVED" as const, title: "London Thames Riverside Run",  discipline: "running",   eventDate: "2026-11-02", startTime: "09:00", endTime: "12:00", venue: "Tower Bridge Start",              city: "London", state: "nsw", format: "individual", level: "open",  categories: ["10K", "Half Marathon"],   cap: 3000, waves: [{ label: "General", price: "45" }], tagline: "Run the Thames path", description: "A scenic run along the River Thames through central London." },
    { id: "seed-event-010", status: "APPROVED" as const, title: "Around the Bay 2026",          discipline: "cycling",   eventDate: "2026-10-11", startTime: "06:30", endTime: "15:00", venue: "Albert Park Circuit",             city: "Melbourne", state: "vic", format: "individual", level: "open",  categories: ["210K", "100K", "50K", "35K"], cap: 10000, waves: [{ label: "210K Entry", price: "110" }, { label: "100K Entry", price: "75" }], tagline: "Ride around Port Phillip Bay", description: "Australia's biggest bike ride." },
    { id: "seed-event-011", status: "APPROVED" as const, title: "Tour de Brisbane Gran Fondo",  discipline: "cycling",   eventDate: "2026-08-30", startTime: "06:00", endTime: "14:00", venue: "Brisbane City Hall",              city: "Brisbane", state: "qld", format: "individual", level: "open",  categories: ["160K Gran Fondo", "100K Medio", "50K Corto"], cap: 3000, waves: [{ label: "Gran Fondo", price: "95" }, { label: "Medio", price: "75" }], tagline: "Climb the Cootha", description: "Gran fondo through Brisbane's scenic hinterland." },
  ];

  for (const e of seedEvents) {
    await prisma.event.upsert({
      where: { id: e.id }, update: {},
      create: { id: e.id, organiserId: org.id, status: e.status, title: e.title, discipline: e.discipline,
        tagline: e.tagline, description: e.description, eventDate: e.eventDate, startTime: e.startTime, endTime: e.endTime,
        venue: e.venue, city: e.city, state: e.state, format: e.format, level: e.level, categories: e.categories,
        cap: e.cap, waves: e.waves, photos: [], registrationType: "startline", feeStructure: "athlete" },
    });
  }

  console.log(`  Events: ${4 + seedEvents.length}`);

  await prisma.review.upsert({
    where:  { id: "seed-review-001" },
    update: {},
    create: {
      id: "seed-review-001", organiserId: org.id, eventId: event1.id,
      eventTitle: event1.title, reviewerName: "Sarah K.",
      title: "Best competition I've done all year",
      body: "Incredibly well run from start to finish.",
      overallRating: 5, atmosphereRating: 5, organisationRating: 5, experienceRating: 5,
      isVerified: true,
    },
  });

  await prisma.review.upsert({
    where:  { id: "seed-review-002" },
    update: {},
    create: {
      id: "seed-review-002", organiserId: org.id, eventId: event1.id,
      eventTitle: event1.title, reviewerName: "Tom R.",
      title: "Great event, minor timing hiccups",
      body: "Really enjoyed the event overall.",
      overallRating: 4, atmosphereRating: 5, organisationRating: 4, experienceRating: 4,
      isVerified: true,
    },
  });

  for (let i = 0; i < 12; i++) {
    const name = ["Alex Turner", "Bree Collins", "Cameron Nguyen", "Dana Wilson",
      "Eli Patel", "Fatima Hassan", "George Kim", "Hannah Jones",
      "Ivy Martin", "Jack Thompson", "Kara Adams", "Leo Robinson"][i];
    const waveLabel = ["Early Bird", "General", "Late Entry"][i % 3];
    const priceCents = [95, 115, 135][i % 3] * 100;
    const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com";

    await prisma.registration.upsert({
      where:  { id: `seed-reg-${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        id: `seed-reg-${String(i + 1).padStart(3, "0")}`,
        eventId: event1.id, organiserId: org.id,
        athleteName: name, athleteEmail: email,
        waveLabel, amountCents: priceCents,
        platformFeeCents: platformFeeCents(priceCents),
        feeStructure: "athlete", status: "CONFIRMED",
      },
    });
  }

  console.log("  Registrations: 16");

  const adminId = adminRecords[0]?.id;
  if (adminId) {
    await prisma.adminAuditLog.create({
      data: {
        adminId, action: "VERIFY_ORGANISER", targetType: "organiser",
        targetId: org.id, meta: { orgName: org.orgName },
      },
    });
  }

  console.log("  Audit log entries created");

  console.log("\n✅ Database seeding complete!");
  console.log(`   Password for all users: ${PASSWORD}`);
  console.log("   Users: admin@startline.test, organiser@startline.test, user@startline.test");
}

main()
  .catch(e => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
