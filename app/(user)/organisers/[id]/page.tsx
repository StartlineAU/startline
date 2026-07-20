import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Globe, Instagram, Facebook, CalendarDays } from "lucide-react";
import { getPublicOrganiser } from "@/lib/organisers";
import { getAllEvents } from "@/lib/events";
import { toUserEvents } from "@/lib/user-events";
import { getUpcomingEvents } from "@/lib/utils";
import { getPublishedOrganiserReviews, averageOverallRating } from "@/lib/reviews";
import HomeEventCard from "@/components/HomeEventCard";
import EventGallery from "@/components/EventGallery";
import OrganiserReviewsClient from "@/components/OrganiserReviewsClient";
import OrganiserRating from "@/components/OrganiserRating";

export const revalidate = 60;

function externalUrl(value: string, base: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${base}${value.replace(/^@/, "")}`;
}

export default async function OrganiserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organiser = await getPublicOrganiser(id);
  if (!organiser) notFound();

  const name = organiser.orgName ?? "Event Organiser";
  const events = toUserEvents(await getAllEvents()).filter((e) => e.organiserId === organiser.id);
  const upcoming = getUpcomingEvents(events, 100);
  const reviews = await getPublishedOrganiserReviews(organiser.id);
  const avg = averageOverallRating(reviews);
  const rating = avg != null ? { average: avg, count: reviews.length } : null;

  const links = [
    organiser.website && { icon: Globe, label: "Website", href: externalUrl(organiser.website, "https://") },
    organiser.instagram && { icon: Instagram, label: "Instagram", href: externalUrl(organiser.instagram, "https://instagram.com/") },
    organiser.facebook && { icon: Facebook, label: "Facebook", href: externalUrl(organiser.facebook, "https://facebook.com/") },
  ].filter(Boolean) as { icon: typeof Globe; label: string; href: string }[];

  return (
    <main className="min-h-screen bg-dark-darker pt-14">

      {/* ── Cover ── */}
      <div className="relative w-full h-44 sm:h-60 overflow-hidden">
        {organiser.coverImageUrl ? (
          <Image
            src={organiser.coverImageUrl}
            alt=""
            fill
            className="object-cover brightness-[0.55]"
            style={{ objectPosition: organiser.coverPosition ?? "50% 50%" }}
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-lighter to-dark-darker" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-darker via-dark-darker/40 to-transparent" />
      </div>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-12">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-14 relative z-10">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-dark-lighter bg-dark shrink-0">
            {organiser.logoUrl ? (
              <Image
                src={organiser.logoUrl}
                alt={`${name} logo`}
                fill
                className="object-cover"
                style={{ objectPosition: organiser.logoPosition ?? "50% 50%" }}
                sizes="112px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-headline text-3xl font-black italic text-primary">
                {name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="font-headline text-3xl sm:text-4xl font-black italic tracking-tighter text-light leading-tight">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <p className="flex items-center gap-1.5 font-headline text-xs font-medium uppercase tracking-widest text-muted">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                Organiser since {format(organiser.createdAt, "MMMM yyyy")}
              </p>
              <OrganiserRating rating={rating} size="md" />
            </div>
          </div>
        </div>

        {/* ── Bio + links ── */}
        <div className="mt-6 max-w-3xl">
          {organiser.bio && (
            <p className="text-sm font-medium text-muted leading-relaxed">{organiser.bio}</p>
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {links.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-headline text-[11px] font-bold uppercase tracking-widest text-muted border border-dark-lighter hover:border-primary/40 hover:text-primary px-3.5 py-2 rounded-md transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ── Upcoming events ── */}
        <div className="mt-10">
          <h2 className="font-headline text-xs font-medium uppercase tracking-widest text-primary mb-4">
            Upcoming Events ({upcoming.length})
          </h2>
          {upcoming.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {upcoming.map((event) => (
                <HomeEventCard key={event.id} event={event} className="w-full" />
              ))}
            </div>
          ) : (
            <div className="bg-dark rounded-xl px-6 py-10 text-center">
              <p className="font-headline text-sm font-medium text-muted">
                No upcoming events right now — check back soon.
              </p>
              <Link
                href="/events"
                className="inline-block mt-3 font-headline text-xs font-bold uppercase tracking-widest text-primary hover:underline"
              >
                Browse all events
              </Link>
            </div>
          )}
        </div>

        {/* ── Photos ── */}
        {organiser.photos.length > 0 && (
          <div className="mt-10">
            <h2 className="font-headline text-xs font-medium uppercase tracking-widest text-primary mb-4">Gallery</h2>
            <EventGallery images={organiser.photos} title={name} />
          </div>
        )}

        <OrganiserReviewsClient organiserId={organiser.id} initialReviews={reviews} />

      </section>
    </main>
  );
}
