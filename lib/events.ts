import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { archivePastEvents } from "@/lib/archive-events";
import { lowestPrice, type PublicEvent, type PublicWave } from "./event-types";

const eventSelect = {
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
} satisfies Prisma.EventSelect;

type EventRow = Prisma.EventGetPayload<{ select: typeof eventSelect }>;
export type EventListItem = EventRow & {
  fromPrice: string | null;
  registrationCount: number;
};

export async function getAllEvents(): Promise<EventListItem[]> {
  try {
    await archivePastEvents();
    const events = await prisma.event.findMany({
      where: { status: "APPROVED" },
      orderBy: { eventDate: "asc" },
      select: eventSelect,
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
