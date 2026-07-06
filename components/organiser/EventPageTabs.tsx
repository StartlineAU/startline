"use client";

import Link from "next/link";
import { LayoutDashboard, ListOrdered, TrendingUp } from "lucide-react";

export type EventTab = "overview" | "waves" | "results";

interface Props {
  eventId: string;
  active: EventTab;
}

export default function EventPageTabs({ eventId, active }: Props) {
  const tabs = [
    { key: "overview" as const, label: "Overview", href: `/organiser/events/${eventId}/dashboard`, Icon: LayoutDashboard },
    { key: "waves"    as const, label: "Waves",    href: `/organiser/events/${eventId}/waves`,     Icon: ListOrdered   },
    { key: "results"  as const, label: "Results",  href: `/organiser/events/${eventId}/results`,   Icon: TrendingUp    },
  ];

  return (
    <div className="flex border-b border-dark-lighter mb-7">
      {tabs.map(({ key, label, href, Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            className={[
              "flex items-center gap-[7px] px-[18px] py-[11px] -mb-px border-b-2",
              "font-headline font-bold text-[12px] uppercase tracking-[0.12em]",
              "transition-colors duration-150",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-light",
            ].join(" ")}
          >
            <Icon
              className={`w-[14px] h-[14px] shrink-0 ${isActive ? "text-primary" : "text-muted"}`}
            />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
