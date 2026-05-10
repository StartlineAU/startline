import Link from "next/link";
import { MapPin, Clock, Users, Calendar } from "lucide-react";
import { FitnessEvent, EVENT_TYPE_LABELS, STATE_LABELS } from "@/types";
import { formatMediumDate, formatShortDate, formatTime, formatCompetitionFormat } from "@/lib/utils";
import { getEventImage } from "@/lib/images";
import { getEventStatus } from "@/lib/event-status";
import SaveEventButton from "./SaveEventButton";

interface EventCardProps {
  event: FitnessEvent;
  variant?: "default" | "compact" | "list";
}

export default function EventCard({ event, variant = "default" }: EventCardProps) {
  const typeLabel  = EVENT_TYPE_LABELS[event.type];
  const stateLabel = STATE_LABELS[event.state];
  const [day, month] = formatShortDate(event.date).split(" ");
  const status = getEventStatus(event);

  if (variant === "compact") {
    return (
      <Link href={`/events/${event.id}`} className="group block">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200">
          <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
            <span className="absolute top-2 left-2 font-headline text-[10px] font-bold uppercase tracking-widest bg-lime-400 text-gray-900 px-2 py-1 rounded">
              {typeLabel}
            </span>
          </div>
          <div className="p-3">
            <h3 className="font-headline text-sm font-black italic tracking-tighter text-gray-900 line-clamp-1 group-hover:text-lime-600 transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 font-headline text-[10px] uppercase tracking-widest text-gray-400">
              <Calendar className="w-3 h-3 text-lime-500" />
              <span>{formatMediumDate(event.date)}</span>
              <span className="text-gray-200">·</span>
              <span>{stateLabel}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <Link href={`/events/${event.id}`} className="group block">
        <div className="bg-white border-b border-gray-100 p-4 hover:bg-lime-50 hover:border-l-2 hover:border-l-lime-400 transition-all">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-14 text-center bg-gray-100 rounded-lg py-2 px-3">
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-gray-400">{month}</p>
              <p className="font-headline text-2xl font-black italic text-gray-900">{day}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-headline text-[10px] font-bold uppercase tracking-widest bg-lime-400 text-gray-900 px-2 py-0.5 inline-block mb-1 rounded">
                    {typeLabel}
                  </span>
                  <h3 className="font-headline font-black italic tracking-tighter text-gray-900 group-hover:text-lime-600 transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-1 mt-1">{event.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 font-headline text-[10px] uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-lime-500" />
                  {event.city}, {stateLabel}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-lime-500" />
                  {formatTime(event.time)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default card variant
  const bannerUrl = getEventImage(event.type, event.id);

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
        {/* Banner image */}
        <div className="relative h-44 overflow-hidden flex-shrink-0 bg-gray-100">
          <img
            src={bannerUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* Status badge + save */}
          <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
            <span className={`font-headline text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${status.style}`}>
              {status.label}
            </span>
            <SaveEventButton eventId={event.id} className="bg-white/80 backdrop-blur-sm" />
          </div>

          {/* Date block */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-right">
            <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-none mb-0.5">{month}</p>
            <p className="font-headline text-xl font-black italic text-gray-900 leading-none">{day}</p>
          </div>

          {/* Type label + title */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-lime-400 mb-1 inline-block">
              {typeLabel}
            </span>
            <h3 className="font-headline text-xl font-black italic tracking-tighter text-white group-hover:text-lime-400 transition-colors duration-200 leading-tight">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 flex flex-col flex-1">
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 font-headline text-[11px] font-medium uppercase tracking-widest text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-lime-500 flex-shrink-0" />
              <span>{event.location}, {stateLabel}</span>
            </div>
            <div className="flex items-center gap-2 font-headline text-[11px] font-medium uppercase tracking-widest text-gray-500">
              <Clock className="w-3.5 h-3.5 text-lime-500 flex-shrink-0" />
              <span>{formatTime(event.time)}</span>
              {event.endTime && <span>— {formatTime(event.endTime)}</span>}
            </div>
            <div className="flex items-center gap-2 font-headline text-[11px] font-medium uppercase tracking-widest text-gray-500">
              <Users className="w-3.5 h-3.5 text-lime-500 flex-shrink-0" />
              <span>{formatCompetitionFormat(event.format)}</span>
              {event.distance && (
                <>
                  <span className="text-gray-200">·</span>
                  <span>{event.distance}</span>
                </>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 border-l-2 border-gray-200 pl-4 line-clamp-2 flex-1">
            {event.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
