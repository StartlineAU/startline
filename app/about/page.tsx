import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

/** Pixel size of `public/images/about/about-mission.jpg` — update if you replace the file */
const ABOUT_MISSION = { width: 4702, height: 3608 } as const;

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── MISSION & VISION over hero image ── */}
      <section className="relative bg-gray-900 overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-0 h-[min(66.792vh,698px)] min-h-[365px]">
          <Image
            src="/images/about/about-hero.jpg"
            alt="Athletes at a fitness event"
            fill
            priority
            className="object-cover object-center brightness-[0.55]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-[calc(6rem+4cm)] sm:pt-[calc(7rem+4cm)] pb-20 sm:pb-28">
          <h1 className="font-headline text-5xl sm:text-6xl lg:text-7xl font-black italic tracking-tighter text-white leading-none -mt-[2cm] mb-10 sm:mb-12">
            About <span className="text-lime-400">us</span>
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="font-headline text-xs font-medium uppercase tracking-widest text-lime-400 mb-6 flex items-center gap-3">
                <span className="w-10 h-px bg-lime-400 inline-block" />
                01 // Mission & vision
              </p>
              <h2 className="font-headline text-4xl lg:text-5xl font-black italic tracking-tighter text-white leading-tight">
                Why we{" "}
                <span className="text-white/60">built StartLine.</span>
              </h2>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-lime-400 mb-3">
                  Mission
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  StartLine was founded to help uncover fitness events by providing a primary platform
                  to connect users with upcoming competitions, local events, communities, and organisers.
                </p>
              </div>
              <div>
                <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-lime-400 mb-3">
                  Vision
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  As social media develops and expands the fitness industry, so too does the gap between
                  users and events. Our vision for Startline is to connect people through fitness.
                </p>
              </div>
              <div className="border-l-4 border-lime-400 bg-black/70 backdrop-blur-sm px-6 py-5">
                <p className="font-headline text-xs font-medium uppercase tracking-widest text-lime-400/80 mb-2">
                  Endurance & more
                </p>
                <p className="text-white/85 text-sm leading-relaxed">
                  StartLine isn&apos;t limited to one kind of effort. We list endurance events across
                  distances and formats — road, trail, turf, and longer tests — right next to comps and
                  community sessions, so your next start line matches how you actually train.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY ATHLETES CHOOSE US ── */}
      <section className="bg-gray-50 py-[3.24rem] sm:py-[4.05rem] border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 lg:items-start">
            <div className="-mt-[0.85cm] flex flex-col gap-6 sm:gap-8 lg:col-span-7">
              <p className="font-headline text-xs font-medium uppercase tracking-widest text-lime-600 flex items-center gap-3">
                <span className="hidden sm:inline-block w-10 h-px bg-lime-500" />
                02 // Why athletes choose us
              </p>
              <h2 className="font-headline text-4xl lg:text-5xl font-black italic tracking-tighter text-gray-900 leading-tight max-w-2xl">
                From invisible events to{" "}
                <span className="text-lime-600">your next start line.</span>
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
                Too many running events, functional fitness competitions, and community-based training
                groups go unrecognised until someone posts a finish-line photo. With a centralised fitness
                competition platform, StartLine helps connect users to organisers — so you hear about the
                opportunity when it matters, not only after the fact.
              </p>
            </div>
            <div className="flex w-full justify-center lg:col-span-5 lg:justify-end">
              <Image
                src="/images/about/about-mission.jpg"
                alt="Wheelchair athletes racing on a city course"
                width={ABOUT_MISSION.width}
                height={ABOUT_MISSION.height}
                className="h-auto w-full max-w-xl rounded-2xl"
                sizes="(max-width: 1024px) 100vw, 36rem"
                quality={100}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6 py-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
          <div className="max-w-xl">
            <p className="font-headline text-xs font-medium uppercase tracking-widest text-lime-600 flex items-center gap-3 mb-5">
              <span className="w-10 h-px bg-lime-500 inline-block" />
              Australia&apos;s Fitness Event Calendar
            </p>
            <h2 className="font-headline text-4xl lg:text-5xl font-black italic tracking-tighter text-gray-900 leading-tight mb-4">
              Where is your<br />
              <span className="text-lime-600">next start line?</span>
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              HYROX, CrossFit, running and hybrid events across Australia — all in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              href="/events"
              className="bg-lime-400 hover:bg-lime-500 text-gray-900 font-headline text-sm font-bold uppercase tracking-widest px-8 py-4 rounded-xl transition-colors duration-100 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Browse Events
            </Link>
            <Link
              href="/contact"
              className="border border-gray-200 text-gray-500 font-headline text-sm font-bold uppercase tracking-widest px-8 py-4 rounded-xl hover:border-lime-400 hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              List Your Event
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
