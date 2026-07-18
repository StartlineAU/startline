"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ConfirmationPage() {
  const params = useParams();
  const eventId = params.id as string;

  return (
    <div className="min-h-screen bg-dark-darker flex items-center justify-center">
      <div className="max-w-[520px] mx-auto px-5 text-center">
        <h1 className="font-headline text-[clamp(30px,4vw,46px)] font-bold italic tracking-[-0.04em] text-light leading-[.95] mb-3.5">
          Registration<br /><span className="text-primary">confirmed.</span>
        </h1>

        <p className="text-[14px] text-muted max-w-[360px] mx-auto mb-8 leading-relaxed">
          Your payment has been processed and your spot is secured. You&apos;ll receive a
          confirmation email shortly with all the event details.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="w-full max-w-[360px] flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-machined text-dark font-headline text-[12px] font-bold uppercase tracking-[0.13em] shadow-machined hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to event
          </Link>
          <Link
            href="/events"
            className="font-headline text-[12px] font-bold uppercase tracking-[0.12em] text-muted hover:text-primary transition-colors"
          >
            Browse more events
          </Link>
        </div>
      </div>
    </div>
  );
}
