"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, ChevronDown, MapPin, Clock, Users, Calendar,
  ExternalLink, ArrowRight, X,
} from "lucide-react";
import eventsData from "@/data/events.json";
import {
  FitnessEvent, FilterState, EventType, AustralianState, CompetitionFormat,
  EVENT_TYPE_LABELS, STATE_LABELS, STATE_OPTIONS, EVENT_TYPE_OPTIONS,
  FORMAT_OPTIONS, DATE_RANGE_OPTIONS,
} from "@/types";
import {
  filterEvents, sortEventsByDate,
  formatShortDate, formatTime, formatEventDate, formatCompetitionFormat,
} from "@/lib/utils";
import { getEventImage } from "@/lib/images";
import { getEventStatus } from "@/lib/event-status";

// ── Filter chip ───────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (v: string) => void;
}

function FilterChip({ label, value, options, isOpen, onOpen, onClose, onChange }: FilterChipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== "";

  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  const currentLabel = options.find((o) => o.value === value)?.label ?? label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={isOpen ? onClose : onOpen}
        className={`flex items-center gap-2 px-4 py-2 font-headline text-sm font-medium uppercase tracking-widest border transition-colors duration-100 rounded-full ${
          active
            ? "border-lime-500 text-lime-600 bg-lime-50"
            : "border-gray-200 text-gray-500 bg-white hover:border-lime-400 hover:text-gray-900"
        }`}
      >
        {currentLabel}
        {active && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); onClose(); }}
            className="ml-1 text-lime-600 hover:text-gray-900"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 min-w-[200px] shadow-xl rounded-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); onClose(); }}
              className={`w-full text-left px-4 py-3 font-headline text-sm font-medium uppercase tracking-widest transition-colors ${
                value === opt.value
                  ? "bg-lime-400 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Events page ───────────────────────────────────────────────────────────

const DISCIPLINE_OPTIONS = [
  { value: "", label: "Discipline" },
  ...EVENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];
const STATE_CHIP_OPTIONS = [
  { value: "", label: "State" },
  ...STATE_OPTIONS.map((o) => ({ value: o.value, label: o.shortLabel })),
];
const FORMAT_CHIP_OPTIONS = [
  { value: "", label: "Format" },
  ...FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];
const DATE_CHIP_OPTIONS = [
  { value: "", label: "All Upcoming" },
  ...DATE_RANGE_OPTIONS
    .filter((o) => o.value !== "all")
    .map((o) => ({ value: o.value, label: o.label })),
];

function EventsPageInner() {
  const allEvents = useMemo(() => eventsData.events as FitnessEvent[], []);
  const [liveEvents, setLiveEvents] = useState<FitnessEvent[]>(allEvents);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data: FitnessEvent[]) => { if (Array.isArray(data)) setLiveEvents(data); })
      .catch(() => {});
  }, []);

  const searchParams = useSearchParams();
  const [whatQuery,   setWhatQuery]   = useState(searchParams.get("what")  ?? "");
  const [whereQuery,  setWhereQuery]  = useState(searchParams.get("where") ?? "");
  const [typeFilter,  setTypeFilter]  = useState<EventType | "">((searchParams.get("type") as EventType) ?? "");
  const [stateFilter, setStateFilter] = useState<AustralianState | "">("");
  const [formatFilter, setFormatFilter] = useState<CompetitionFormat | "">("");
  const [dateFilter,  setDateFilter]  = useState<FilterState["dateRange"]>("all");
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filterState: FilterState = useMemo(() => ({
    types:       typeFilter   ? [typeFilter as EventType]       : [],
    states:      stateFilter  ? [stateFilter as AustralianState] : [],
    format:      formatFilter ? (formatFilter as CompetitionFormat) : null,
    dateRange:   dateFilter,
    searchQuery: whatQuery,
  }), [typeFilter, stateFilter, formatFilter, dateFilter, whatQuery]);

  const displayEvents = useMemo(() => {
    let results = filterEvents(liveEvents, filterState);
    results = sortEventsByDate(results);
    if (whereQuery.trim()) {
      const q = whereQuery.toLowerCase();
      results = results.filter(
        (e) =>
          e.city.toLowerCase().includes(q) ||
          e.state.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      );
    }
    return results;
  }, [liveEvents, filterState, whereQuery]);

  const selectedEvent = useMemo(
    () => liveEvents.find((e) => e.id === selectedId) ?? null,
    [liveEvents, selectedId]
  );

  useEffect(() => {
    if (!selectedId && displayEvents.length > 0) {
      setSelectedId(displayEvents[0].id);
    }
  }, [displayEvents, selectedId]);

  function clearFilters() {
    setWhatQuery(""); setWhereQuery("");
    setTypeFilter(""); setStateFilter(""); setFormatFilter(""); setDateFilter("all");
    setSelectedId(null);
  }

  const [day, month] = selectedEvent ? formatShortDate(selectedEvent.date).split(" ") : ["", ""];
  const status    = selectedEvent ? getEventStatus(selectedEvent) : null;
  const bannerUrl = selectedEvent ? getEventImage(selectedEvent.type, selectedEvent.id, 1200, 80) : "";

  return (
    <div className="bg-white flex flex-col" style={{ height: "100dvh" }}>

      {/* ── Sticky search + filter bar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 flex-shrink-0 pt-16">
        {/* Row 1: What / Where / Search */}
        <div className="max-w-[1440px] mx-auto px-6 pt-5 pb-4">
          <div className="flex items-stretch gap-0.5 bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="flex-1 bg-gray-50 px-5 py-3 border-r border-gray-200 min-w-0">
              <label className="font-headline text-xs font-black uppercase tracking-widest text-lime-600 block mb-2">Event</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Event name, type or keyword"
                  value={whatQuery}
                  onChange={(e) => setWhatQuery(e.target.value)}
                  className="w-full bg-transparent text-gray-900 font-headline text-xl placeholder:text-gray-400 border-0 focus:ring-0 focus:outline-none"
                />
                {whatQuery && (
                  <button onClick={() => setWhatQuery("")} className="text-gray-400 hover:text-gray-900 flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 bg-gray-50 px-5 py-3 border-r border-gray-200 min-w-0">
              <label className="font-headline text-xs font-black uppercase tracking-widest text-lime-600 block mb-2">Where</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="State, city, or suburb"
                  value={whereQuery}
                  onChange={(e) => setWhereQuery(e.target.value)}
                  className="w-full bg-transparent text-gray-900 font-headline text-xl placeholder:text-gray-400 border-0 focus:ring-0 focus:outline-none"
                />
                {whereQuery && (
                  <button onClick={() => setWhereQuery("")} className="text-gray-400 hover:text-gray-900 flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <button className="flex items-center gap-2 bg-lime-400 hover:bg-lime-500 text-gray-900 font-headline text-base font-bold uppercase tracking-widest px-10 transition-colors duration-100 flex-shrink-0">
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>

        {/* Row 2: Filter chips + result count */}
        <div className="max-w-[1440px] mx-auto px-6 pb-4 flex items-center gap-2.5 flex-wrap">
          <FilterChip
            label="Discipline"
            value={typeFilter}
            options={DISCIPLINE_OPTIONS}
            isOpen={openDropdown === "discipline"}
            onOpen={() => setOpenDropdown("discipline")}
            onClose={() => setOpenDropdown(null)}
            onChange={(v) => { setTypeFilter(v as EventType | ""); setSelectedId(null); }}
          />
          <FilterChip
            label="State"
            value={stateFilter}
            options={STATE_CHIP_OPTIONS}
            isOpen={openDropdown === "state"}
            onOpen={() => setOpenDropdown("state")}
            onClose={() => setOpenDropdown(null)}
            onChange={(v) => { setStateFilter(v as AustralianState | ""); setSelectedId(null); }}
          />
          <FilterChip
            label="Format"
            value={formatFilter}
            options={FORMAT_CHIP_OPTIONS}
            isOpen={openDropdown === "format"}
            onOpen={() => setOpenDropdown("format")}
            onClose={() => setOpenDropdown(null)}
            onChange={(v) => { setFormatFilter(v as CompetitionFormat | ""); setSelectedId(null); }}
          />
          <FilterChip
            label="All Upcoming"
            value={dateFilter === "all" ? "" : dateFilter}
            options={DATE_CHIP_OPTIONS}
            isOpen={openDropdown === "date"}
            onOpen={() => setOpenDropdown("date")}
            onClose={() => setOpenDropdown(null)}
            onChange={(v) => { setDateFilter((v || "all") as FilterState["dateRange"]); setSelectedId(null); }}
          />
          <span className="ml-auto font-headline text-sm font-medium uppercase tracking-widest text-gray-400">
            {displayEvents.length} event{displayEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="flex flex-1 overflow-hidden max-w-[1440px] w-full mx-auto">

        {/* LEFT: event list */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-white border-r border-gray-200">
          {displayEvents.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-headline text-sm font-medium uppercase tracking-widest text-gray-400 mb-3">No Results</p>
              <p className="font-headline text-2xl font-black italic tracking-tighter text-gray-900 mb-4">No events found.</p>
              <button
                onClick={clearFilters}
                className="font-headline text-sm font-medium uppercase tracking-widest border border-lime-500 text-lime-600 px-5 py-2.5 hover:bg-lime-50 transition-colors rounded-full"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
              {displayEvents.map((event) => {
                const isSelected = event.id === selectedId;
                const [eDay, eMonth] = formatShortDate(event.date).split(" ");
                const img = getEventImage(event.type, event.id, 1200, 80);
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedId(event.id)}
                    className={`w-full text-left rounded-2xl overflow-hidden transition-all duration-150 ${
                      isSelected ? "ring-2 ring-lime-400" : "ring-1 ring-gray-200 hover:ring-lime-300"
                    }`}
                  >
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/6" }}>
                      <img src={img} alt={event.title} className="w-full h-full object-cover brightness-50" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-gray-900 bg-lime-400 px-2 py-0.5 rounded-full">
                          {EVENT_TYPE_LABELS[event.type]}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="font-headline text-xs font-medium text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          {eDay} {eMonth}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white px-4 pt-3 pb-4">
                      <h3 className={`font-headline text-base font-black italic tracking-tighter leading-tight mb-2 ${isSelected ? "text-lime-600" : "text-gray-900"}`}>
                        {event.title}
                      </h3>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 font-headline text-xs text-gray-500 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-lime-500 flex-shrink-0" />
                            {event.city}, {STATE_LABELS[event.state]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-lime-500 flex-shrink-0" />
                            {formatTime(event.time)}
                          </span>
                        </div>
                        {event.ticketDrops && event.ticketDrops.length > 0 && (
                          <span className="font-headline text-xs font-bold text-gray-900 flex-shrink-0">
                            From {event.ticketDrops[0].price}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: event detail panel */}
        <div className="flex-1 overflow-y-auto bg-white">
          {!selectedEvent ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-12">
              <ArrowRight className="w-10 h-10 text-gray-300 rotate-180" />
              <p className="font-headline text-xl font-medium uppercase tracking-widest text-gray-400">
                Select an event to view details
              </p>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-0">

              {/* Hero banner */}
              <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: "16/7" }}>
                <img src={bannerUrl} alt={selectedEvent.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute top-4 left-5 flex items-center gap-2 flex-wrap">
                  <span className={`font-headline text-xs font-medium uppercase tracking-widest px-3 py-1.5 rounded-full ${status?.style}`}>
                    {status?.label}
                  </span>
                  <span className="font-headline text-xs font-medium uppercase tracking-widest text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    {EVENT_TYPE_LABELS[selectedEvent.type]}
                  </span>
                  {selectedEvent.isOfficial && (
                    <span className="font-headline text-xs font-medium uppercase tracking-widest text-lime-400 border border-lime-400/40 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      Official
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <Link href={`/events/${selectedEvent.id}`} className="group">
                    <h2 className="font-headline text-3xl font-black italic tracking-tighter text-white group-hover:text-lime-400 transition-colors leading-none mb-2 inline-block">
                      {selectedEvent.title}
                    </h2>
                  </Link>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 font-headline text-xs font-medium uppercase tracking-widest text-white/70">
                      <MapPin className="w-3.5 h-3.5 text-lime-400" />
                      {selectedEvent.location}, {STATE_LABELS[selectedEvent.state]}
                    </span>
                    <span className="flex items-center gap-1.5 font-headline text-xs font-medium uppercase tracking-widest text-white/70">
                      <Calendar className="w-3.5 h-3.5 text-lime-400" />
                      {formatEventDate(selectedEvent.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail sections */}
              <div className="flex flex-col divide-y divide-gray-100 pb-6">

                {/* Schedule & config */}
                <div className="grid grid-cols-2 py-7 gap-8">
                  <div>
                    <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Schedule</p>
                    <p className="font-headline text-5xl font-black text-lime-500 leading-none mb-1">{day}</p>
                    <p className="font-headline text-base font-bold uppercase tracking-wider text-gray-900">{month}</p>
                    <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-400 mt-2">
                      {formatTime(selectedEvent.time)}
                      {selectedEvent.endTime && ` — ${formatTime(selectedEvent.endTime)}`}
                    </p>
                  </div>
                  <div>
                    <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Race Config</p>
                    <p className="font-headline text-2xl font-black italic tracking-tighter text-gray-900 mb-2 leading-tight">
                      {formatCompetitionFormat(selectedEvent.format)}
                    </p>
                    {selectedEvent.distance && (
                      <p className="font-headline text-xs uppercase tracking-widest text-lime-600 mb-2">{selectedEvent.distance}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-lime-500" />
                      <span className="font-headline text-xs font-medium uppercase tracking-widest text-gray-500">
                        {selectedEvent.level === "elite" ? "Elite" : selectedEvent.level === "beginner" ? "Beginner" : "Open"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="py-7">
                  <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Location</p>
                  <h3 className="font-headline text-xl font-black italic tracking-tighter text-gray-900 mb-1 leading-tight">
                    {selectedEvent.location}
                  </h3>
                  <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-500 mb-4">
                    {selectedEvent.city}, {STATE_LABELS[selectedEvent.state]}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      selectedEvent.location + ", " + selectedEvent.city + ", Australia"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-headline text-xs uppercase tracking-widest text-lime-600 hover:text-lime-700 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    View on Maps
                  </a>
                </div>

                {/* Overview */}
                <div className="py-7">
                  <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Event Overview</p>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed mb-4">{selectedEvent.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-headline text-xs font-medium uppercase tracking-widest text-gray-900 bg-lime-400 px-3 py-1 rounded-full">
                      {EVENT_TYPE_LABELS[selectedEvent.type]}
                    </span>
                    <span className="font-headline text-xs font-medium uppercase tracking-widest text-gray-500 border border-gray-200 px-3 py-1 rounded-full">
                      {formatCompetitionFormat(selectedEvent.format)}
                    </span>
                    {selectedEvent.isOfficial && (
                      <span className="font-headline text-xs uppercase tracking-widest text-lime-600 border border-lime-400/40 px-3 py-1 rounded-full">
                        Official Event
                      </span>
                    )}
                  </div>
                </div>

                {/* Registration */}
                <div className="py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-headline text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">Registration</p>
                    {selectedEvent.organizer && (
                      <p className="font-headline text-base font-medium uppercase tracking-widest text-gray-900">
                        By {selectedEvent.organizer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                      href={`/events/${selectedEvent.id}`}
                      className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 font-headline text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:border-lime-400 hover:text-gray-900 transition-colors"
                    >
                      More Info
                    </Link>
                    <a
                      href={selectedEvent.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-lime-400 hover:bg-lime-500 text-gray-900 font-headline text-sm font-bold uppercase tracking-widest px-8 py-3 rounded-xl transition-colors duration-100"
                    >
                      Register Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense>
      <EventsPageInner />
    </Suspense>
  );
}
