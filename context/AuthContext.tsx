"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";

export type AuthUser = {
  sub:   string;
  email: string;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user:    AuthUser | null;
  status:  AuthStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  logout:  () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  status:  "loading",
  loading: true,
  refresh: async () => {},
  logout:  async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    fetchAuthSession()
      .then(session => {
        if (!session.tokens?.accessToken) {
          setUser(null);
          setStatus("unauthenticated");
          return null;
        }
        return getCurrentUser();
      })
      .then(current => {
        if (!current) return;
        setUser({ sub: current.userId, email: current.signInDetails?.loginId ?? "" });
        setStatus("authenticated");
      })
      .catch(() => { setUser(null); setStatus("unauthenticated"); });
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
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
