"use client";

import { createContext, useContext, useState } from "react";

export type SettingsSection = "personal" | "security" | "notifications" | "payments" | "cookies";

interface SettingsCtx {
  isOpen:     boolean;
  section:    SettingsSection;
  open:       (section?: SettingsSection) => void;
  close:      () => void;
  setSection: (s: SettingsSection) => void;
  // bumped each time the profile is saved - profile page watches this to re-fetch
  profileSavedAt:     number;
  notifyProfileSaved: () => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen,          setIsOpen]          = useState(false);
  const [section,         setSection]         = useState<SettingsSection>("personal");
  const [profileSavedAt,  setProfileSavedAt]  = useState(0);

  return (
    <Ctx.Provider value={{
      isOpen,
      section,
      open:  (s = "personal") => { setSection(s); setIsOpen(true); },
      close: () => setIsOpen(false),
      setSection,
      profileSavedAt,
      notifyProfileSaved: () => setProfileSavedAt(Date.now()),
    }}>
      {children}
    </Ctx.Provider>
  );
}

const NOOP_SETTINGS: SettingsCtx = {
  isOpen: false,
  section: "personal",
  open: () => {},
  close: () => {},
  setSection: () => {},
  profileSavedAt: 0,
  notifyProfileSaved: () => {},
};

export function useSettings(): SettingsCtx {
  return useContext(Ctx) ?? NOOP_SETTINGS;
}
