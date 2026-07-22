"use client";

import { useState } from "react";
import { X, CheckCircle, AlertCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewerName: string;
  eventTitle?: string | null;
  overallRating: number;
  atmosphereRating?: number | null;
  organisationRating?: number | null;
  experienceRating?: number | null;
  title: string;
  body: string;
  isVerified: boolean;
  createdAt: string;
}

// ─── Star helpers ─────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(sz, i <= Math.round(rating) ? "text-primary fill-primary" : "text-dark-lighter")}
        />
      ))}
    </div>
  );
}

function InteractiveStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
          aria-label={`${i} stars`}
        >
          <Star
            className={cn(
              "w-7 h-7 transition-colors",
              i <= (hover || value) ? "text-primary fill-primary" : "text-dark-lighter"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ r }: { r: Review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = r.body.length > 200;
  const body = expanded || !isLong ? r.body : r.body.slice(0, 200) + "…";

  return (
    <div className="bg-dark border border-dark-lighter rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Avatar initial */}
          <div className="w-9 h-9 rounded-full bg-dark-lighter border border-dark-lighter flex items-center justify-center font-headline text-[14px] font-black text-light shrink-0">
            {r.reviewerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline text-[13px] font-bold text-light">{r.reviewerName}</span>
              {r.isVerified && (
                <span className="inline-flex items-center gap-1 text-[9px] font-headline font-bold uppercase tracking-widest text-primary">
                  <CheckCircle className="w-2.5 h-2.5" /> Verified attendee
                </span>
              )}
            </div>
            {r.eventTitle && (
              <div className="font-headline text-[10px] uppercase tracking-widest text-muted mt-0.5">
                {r.eventTitle}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <Stars rating={r.overallRating} size="sm" />
          <div className="font-headline text-[10px] uppercase tracking-widest text-muted-dark mt-1">{timeAgo(r.createdAt)}</div>
        </div>
      </div>

      <div>
        <div className="font-headline text-[14px] font-bold text-light mb-1">{r.title}</div>
        <p className="text-[13px] text-muted leading-relaxed">{body}</p>
        {isLong && (
          <button onClick={() => setExpanded(v => !v)} className="text-[11px] font-headline font-bold uppercase tracking-widest text-primary mt-1 hover:underline">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Sub-ratings */}
      {(r.atmosphereRating || r.organisationRating || r.experienceRating) && (
        <div className="pt-3 border-t border-dark-lighter grid grid-cols-3 gap-3 text-center">
          {r.atmosphereRating && (
            <div>
              <div className="font-headline text-[10px] uppercase tracking-widest text-muted-dark mb-0.5">Atmosphere</div>
              <div className="font-headline text-[13px] font-black text-primary">{r.atmosphereRating}.0</div>
            </div>
          )}
          {r.organisationRating && (
            <div>
              <div className="font-headline text-[10px] uppercase tracking-widest text-muted-dark mb-0.5">Organisation</div>
              <div className="font-headline text-[13px] font-black text-primary">{r.organisationRating}.0</div>
            </div>
          )}
          {r.experienceRating && (
            <div>
              <div className="font-headline text-[10px] uppercase tracking-widest text-muted-dark mb-0.5">Experience</div>
              <div className="font-headline text-[13px] font-black text-primary">{r.experienceRating}.0</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Write review modal ───────────────────────────────────────────────────────

interface ModalProps {
  organiserId: string;
  onClose: () => void;
  onSuccess: (r: Review) => void;
}

function WriteReviewModal({ organiserId, onClose, onSuccess }: ModalProps) {
  const [overall,  setOverall]  = useState(0);
  const [comms,    setComms]    = useState(0);
  const [org,      setOrg]      = useState(0);
  const [exp,      setExp]      = useState(0);
  const [title,    setTitle]    = useState("");
  const [body,     setBody]     = useState("");
  const [name,     setName]     = useState("");
  const [event,    setEvent]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  const submit = async () => {
    if (!overall) { setError("Please select an overall rating."); return; }
    if (!title.trim()) { setError("Please add a review title."); return; }
    if (!body.trim()) { setError("Please write your review."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/public/reviews/${organiserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating:       overall,
          atmosphereRating: comms || null,
          organisationRating:  org   || null,
          experienceRating:    exp   || null,
          title, body, reviewerName: name, eventTitle: event || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }

      setDone(true);
      const newReview: Review = {
        id: data.id ?? crypto.randomUUID(),
        reviewerName: name, eventTitle: event || null,
        overallRating: overall, atmosphereRating: comms || null,
        organisationRating: org || null, experienceRating: exp || null,
        title, body, isVerified: false, createdAt: new Date().toISOString(),
      };
      setTimeout(() => { onSuccess(newReview); onClose(); }, 1800);
    } catch {
      setError("Could not submit. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-darker/80 backdrop-blur-sm overlay-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-dark border border-dark-lighter rounded-2xl flex flex-col modal-in max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-dark-lighter">
            <div>
              <h2 className="font-headline text-xl font-black italic tracking-tighter text-light">Write a Review</h2>
              <p className="text-[12px] text-muted mt-0.5">Share your experience at this organiser&apos;s events.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded hover:bg-dark-lighter text-muted hover:text-primary flex items-center justify-center transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {done ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
              <div className="font-headline text-xl font-black italic text-light mb-1">Review submitted!</div>
              <div className="text-[13px] text-muted">Thanks for sharing your experience.</div>
            </div>
          ) : (
            <div className="px-6 py-6 space-y-5">

              {/* Overall rating */}
              <div>
                <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-light mb-2">
                  Overall rating <span className="text-primary">*</span>
                </div>
                <InteractiveStars value={overall} onChange={setOverall} />
              </div>

              {/* Sub-ratings */}
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "Atmosphere", value: comms, onChange: setComms },
                  { label: "Organisation",  value: org,   onChange: setOrg   },
                  { label: "Experience",    value: exp,   onChange: setExp   },
                ] as const).map(({ label, value, onChange }) => (
                  <div key={label}>
                    <div className="font-headline text-[10px] uppercase tracking-widest text-muted mb-1.5">{label}</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${label} ${i}`}>
                          <Star
                            className={cn(
                              "w-4 h-4 transition-colors",
                              i <= value ? "text-primary fill-primary" : "text-dark-lighter hover:text-primary/50"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Event attended */}
              <div>
                <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-light mb-1.5">
                  Event attended <span className="text-muted-dark font-normal">(optional)</span>
                </div>
                <input
                  value={event}
                  onChange={e => setEvent(e.target.value)}
                  placeholder="e.g. Functional Fitness Championship Sydney 2025"
                  className="w-full bg-dark-darker border border-dark-lighter rounded-md px-3 py-2.5 text-[14px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Title */}
              <div>
                <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-light mb-1.5">
                  Review title <span className="text-primary">*</span>
                </div>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Summarise your experience…"
                  maxLength={100}
                  className="w-full bg-dark-darker border border-dark-lighter rounded-md px-3 py-2.5 text-[14px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-light">
                    Your review <span className="text-primary">*</span>
                  </div>
                  <span className="font-headline text-[10px] uppercase tracking-widest text-muted-dark">{body.length}/800</span>
                </div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={800}
                  rows={4}
                  placeholder="What was the event like? How was the organisation, communication, and overall experience?"
                  className="w-full bg-dark-darker border border-dark-lighter rounded-md px-3 py-2.5 text-[13px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Name */}
              <div>
                <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-light mb-1.5">
                  Your name <span className="text-primary">*</span>
                </div>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="First name + last initial is fine"
                  className="w-full bg-dark-darker border border-dark-lighter rounded-md px-3 py-2.5 text-[14px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[12px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={onClose} className="font-headline text-[12px] font-bold uppercase tracking-widest text-muted hover:text-light px-4 py-2.5 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 bg-machined shadow-machined text-dark font-headline text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50"
                >
                  {saving ? "Submitting…" : "Submit review"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main reviews section ─────────────────────────────────────────────────────

interface Props {
  reviews: Review[];
  organiserId: string;
  loading: boolean;
  onNewReview: (r: Review) => void;
}

export default function ReviewsSection({ reviews, organiserId, loading, onNewReview }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length
    : 0;

  function avgSub(
    pick: (r: Review) => number | null | undefined
  ): number | null {
    const vals = reviews.map(pick).filter((v): v is number => typeof v === "number" && v > 0);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  const metrics = [
    { label: "Atmosphere", value: avgSub((r) => r.atmosphereRating) },
    { label: "Organisation", value: avgSub((r) => r.organisationRating) },
    { label: "Experience", value: avgSub((r) => r.experienceRating) },
  ].filter((m) => m.value != null) as { label: string; value: number }[];

  return (
    <div id="reviews">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline text-2xl font-black italic tracking-tighter text-light">
            Reviews
            {reviews.length > 0 && (
              <span className="ml-3 font-headline text-[14px] font-normal not-italic text-muted">({reviews.length})</span>
            )}
          </h2>
          {avgRating > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars rating={avgRating} size="sm" />
              <span className="font-headline text-[13px] font-bold text-light">{avgRating.toFixed(1)}</span>
              <span className="font-headline text-[11px] text-muted">out of 5</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 border border-dark-lighter hover:border-primary/60 text-muted hover:text-light font-headline text-[12px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-md transition-colors"
        >
          Write a review
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="font-headline text-[11px] text-muted uppercase tracking-widest">Loading reviews…</div>
        </div>
      ) : reviews.length === 0 ? (
        /* Empty state */
        <div className="py-12 text-center border border-dashed border-dark-lighter rounded-xl">
          <div className="flex items-center justify-center gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-6 h-6 text-dark-lighter" />
            ))}
          </div>
          <div className="font-headline text-[15px] font-black italic text-light mb-1">No reviews yet</div>
          <div className="text-[13px] text-muted mb-5">Be the first to share your experience with this organiser.</div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-machined shadow-machined text-dark font-headline text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Write the first review
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rating summary */}
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 bg-dark border border-dark-lighter rounded-xl p-6">
            {/* Left: big number */}
            <div className="flex flex-col items-center justify-center text-center sm:pr-6 sm:border-r sm:border-dark-lighter">
              <div className="font-headline text-[52px] font-black italic leading-none text-light">{avgRating.toFixed(1)}</div>
              <Stars rating={avgRating} size="md" />
              <div className="font-headline text-[11px] uppercase tracking-widest text-muted mt-1.5">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Right: metric averages as long bars */}
            <div className="flex flex-col justify-center gap-4">
              {metrics.length > 0 ? (
                metrics.map(({ label, value }) => (
                  <div key={label}>
                    <div className="font-headline text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
                      {label}
                    </div>
                    <div className="h-2 bg-dark-lighter rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 font-headline text-[12px] font-bold text-light">
                      {value.toFixed(1)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-headline text-xs text-muted">
                  No category ratings yet.
                </p>
              )}
            </div>
          </div>

          {/* Review cards */}
          <div className="space-y-4">
            {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {modalOpen && (
        <WriteReviewModal
          organiserId={organiserId}
          onClose={() => setModalOpen(false)}
          onSuccess={onNewReview}
        />
      )}
    </div>
  );
}
