"use client";

import { createContext, useContext, useEffect, useState, useCallback, startTransition } from "react";
import { authClient } from "@/lib/auth/client";

export type Role = "user" | "organiser" | "admin";

export type AuthUser = {
  sub:   string;
  email: string;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user:    AuthUser | null;
  role:    Role | null;
  status:  AuthStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  logout:  () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  role:    null,
  status:  "loading",
  loading: true,
  refresh: async () => {},
  logout:  async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [role,   setRole]   = useState<Role | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const hydrate = useCallback(async () => {
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      setUser({
        sub:   session.user.id,
        email: session.user.email,
      });
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    startTransition(() => hydrate());
  }, [hydrate]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/user/role")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data?.role) setRole(data.role);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  const logout = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
      <AuthContext.Provider
        value={{
          user,
          role,
          status,
          loading: status === "loading",
          refresh: hydrate,
          logout,
        }}
      >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
