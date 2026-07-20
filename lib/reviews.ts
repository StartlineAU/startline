import prisma from "@/lib/prisma";

export type OrganiserRating = {
  average: number;
  count: number;
};

export type PublicReview = {
  id: string;
  reviewerName: string;
  eventTitle: string | null;
  overallRating: number;
  atmosphereRating: number | null;
  organisationRating: number | null;
  experienceRating: number | null;
  title: string;
  body: string;
  isVerified: boolean;
  createdAt: string;
};

/** Average overall rating rounded to 1 decimal. Returns null when empty. */
export function averageOverallRating(
  ratings: Array<{ overallRating: number } | number>
): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => {
    const n = typeof r === "number" ? r : r.overallRating;
    return acc + n;
  }, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function toOrganiserRating(
  average: number | null | undefined,
  count: number
): OrganiserRating | null {
  if (!count || average == null || !Number.isFinite(average)) return null;
  return { average: Math.round(average * 10) / 10, count };
}

/** Batch organiser rating aggregates for the given IDs (published reviews only). */
export async function getOrganiserRatings(
  organiserIds: string[]
): Promise<Map<string, OrganiserRating>> {
  const ids = [...new Set(organiserIds.filter(Boolean))];
  const map = new Map<string, OrganiserRating>();
  if (ids.length === 0) return map;

  try {
    const rows = await prisma.review.groupBy({
      by: ["organiserId"],
      where: { isPublished: true, organiserId: { in: ids } },
      _avg: { overallRating: true },
      _count: { _all: true },
    });
    for (const row of rows) {
      const rating = toOrganiserRating(row._avg.overallRating, row._count._all);
      if (rating) map.set(row.organiserId, rating);
    }
  } catch {
    // DB unavailable — leave map empty
  }
  return map;
}

export async function getPublishedOrganiserReviews(
  organiserId: string
): Promise<PublicReview[]> {
  try {
    const reviews = await prisma.review.findMany({
      where: { organiserId, isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reviewerName: true,
        eventTitle: true,
        overallRating: true,
        atmosphereRating: true,
        organisationRating: true,
        experienceRating: true,
        title: true,
        body: true,
        isVerified: true,
        createdAt: true,
      },
    });
    return reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
