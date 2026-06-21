"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCircle2, XCircle, User, Plus, Settings } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

const NAV = [
  { href: "/organiser/dashboard",    label: "Dashboard"   },
  { href: "/organiser/listings",     label: "Listings"    },
  { href: "/organiser/new-listing",  label: "New Listing" },
  { href: "/organiser/payments",     label: "Payments"    },
  { href: "/organiser/profile",      label: "Profile"     },
  { href: "/organiser/how-it-works", label: "Guide"       },
];

interface Notification {
  id: string;
  type: "EVENT_APPROVED" | "EVENT_REJECTED" | "NEW_REGISTRATION";
  title: string;
  body: string;
  eventId: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const NOTIF_ICON: Record<Notification["type"], React.ReactNode> = {
  EVENT_APPROVED:   <CheckCircle2 className="w-4 h-4 text-primary" />,
  EVENT_REJECTED:   <XCircle      className="w-4 h-4 text-red-400"  />,
  NEW_REGISTRATION: <User         className="w-4 h-4 text-blue-400" />,
};

export default function OrganiserSubNav() {
  const pathname = usePathname();
  const { user }  = useAuthContext();
  const { open: openSettingsModal } = useSettings();

  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const isOrganiserRoute = pathname?.startsWith("/organiser");
  const isVisible = isOrganiserRoute && !!user?.isOrganiser;

  const fetchNotifications = useCallback(() => {
    if (!isVisible) return;
    fetch("/api/organiser/notifications")
      .then(r => r.ok ? r.json() : null)
      .then((data: { notifications: Notification[]; unreadCount: number } | null) => {
        if (!data) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [isVisible, fetchNotifications]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  if (!isVisible) return null;

  const openNotifPanel = () => {
    setNotifOpen(o => !o);
    if (unreadCount > 0) {
      fetch("/api/organiser/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
        .then(() => {
          setUnreadCount(0);
          setNotifications(ns => ns.map(n => ({ ...n, read: true })));
        })
        .catch(() => {});
    }
  };

  return (
    <div className="fixed top-14 left-0 right-0 z-40 h-10 bg-dark-light/95 backdrop-blur-md border-b border-dark-lighter flex items-center">
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 flex items-center justify-between">

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const isActive = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={`px-3 h-7 flex items-center font-headline text-[11px] font-bold uppercase tracking-widest rounded transition-colors whitespace-nowrap
                  ${isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted hover:text-light hover:bg-dark-lighter"
                  }`}>
                {label === "New Listing" && <Plus className="w-3 h-3 mr-1" />}
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: settings + notifications */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => openSettingsModal("personal")}
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-dark-lighter transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-muted hover:text-light" />
          </button>

          <div ref={notifRef} className="relative">
            <button
              onClick={openNotifPanel}
              className="relative flex items-center justify-center w-7 h-7 rounded hover:bg-dark-lighter transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-muted" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[12px] h-[12px] bg-primary text-dark font-headline font-black text-[8px] rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-80 bg-dark border border-dark-lighter rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-dark-lighter flex items-center justify-between">
                  <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted">Notifications</div>
                  {notifications.length > 0 && (
                    <button onClick={() => fetchNotifications()}
                      className="font-headline text-[10px] uppercase tracking-widest text-muted-dark hover:text-muted transition-colors">
                      Refresh
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-5 h-5 text-muted-dark mx-auto mb-2" />
                      <div className="font-headline text-[11px] uppercase tracking-widest text-muted-dark">No notifications yet</div>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-dark-lighter last:border-0 ${!n.read ? "bg-primary/5" : ""}`}>
                        <div className="mt-0.5 shrink-0">{NOTIF_ICON[n.type]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-headline text-[12px] font-bold text-light leading-snug">{n.title}</div>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />}
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="font-headline text-[10px] uppercase tracking-widest text-muted-dark">{timeAgo(n.createdAt)}</span>
                            {n.eventId && (
                              <Link href={`/organiser/events/${n.eventId}/dashboard`}
                                onClick={() => setNotifOpen(false)}
                                className="font-headline text-[10px] uppercase tracking-widest text-primary/70 hover:text-primary transition-colors">
                                View event →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
