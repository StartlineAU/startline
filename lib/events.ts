import prisma from "@/lib/prisma";
import { archivePastEvents } from "@/lib/archive-events";
import { lowestPrice, type PublicEvent, type PublicWave } from "./event-types";

export async function getAllEvents() {
  try {
    await archivePastEvents();
    const events = await prisma.event.findMany({
      where: { status: "APPROVED" },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        title: true,
        discipline: true,
        tagline: true,
        description: true,
        eventDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        venue: true,
        address: true,
        city: true,
        state: true,
        format: true,
        level: true,
        categories: true,
        cap: true,
        minAge: true,
        waves: true,
        extras: true,
        refundPolicy: true,
        coverImageUrl: true,
        photos: true,
        registrationType: true,
        registrationUrl: true,
        feeStructure: true,
        organiserId: true,
        organiser: {
          select: { id: true, orgName: true, logoUrl: true, stripeAccountId: true, stripeOnboardingComplete: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    return events.map((e) => ({
      ...e,
      fromPrice: lowestPrice(e.waves),
      registrationCount: e._count.registrations,
    }));
  } catch {
    return [];
  }
}
