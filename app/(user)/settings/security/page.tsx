"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, Trash2, Fingerprint } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { status } = useAuthContext();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/mfa")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMfaEnabled(data.mfaEnabled); })
      .catch(() => {});
  }, [status]);

  const handleDisableMfa = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/user/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      if (r.ok) {
        setMfaEnabled(false);
      } else {
        const data = await r.json();
        setError(data.error || "Failed to disable MFA.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") return null;

  const sectionCls = "border border-dark-lighter rounded-xl p-5 space-y-4";
  const btnCls = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-headline text-[11px] font-bold uppercase tracking-widest border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <main className="min-h-screen pt-20 pb-16 px-4 sm:px-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-black italic tracking-tighter leading-[0.9]">
          Security<br /><span className="text-primary">settings.</span>
        </h1>
        <p className="text-muted text-[14px] leading-relaxed mt-2">Manage your multi-factor authentication and security keys.</p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-md bg-red-900/20 border border-red-500/30 text-red-400 font-headline text-[13px]">
          {error}
        </div>
      )}

      {/* MFA Section */}
      <div className={sectionCls + " mb-6"}>
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-headline text-[13px] font-bold uppercase tracking-widest">Multi-Factor Authentication</h2>
            <p className="text-muted text-[12px] mt-0.5">
              {mfaEnabled ? "TOTP authenticator app is active." : "Add an extra layer of security to your account."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-4 bg-dark rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${mfaEnabled ? "text-green-500" : "text-muted-dark"}`} />
            <div>
              <span className="font-headline text-[12px] font-bold uppercase tracking-widest">TOTP Authenticator</span>
              <p className="text-muted text-[11px]">{mfaEnabled ? "Active" : "Not configured"}</p>
            </div>
          </div>
          {mfaEnabled && (
            <button onClick={handleDisableMfa} disabled={loading}
              className={btnCls + " border-red-500/30 text-red-400 hover:bg-red-500/10"}>
              <Trash2 className="w-3.5 h-3.5" /> Disable
            </button>
          )}
        </div>
      </div>

      {/* Passkey Section */}
      <div className={sectionCls}>
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-headline text-[13px] font-bold uppercase tracking-widest">Passkeys</h2>
            <p className="text-muted text-[12px] mt-0.5">Sign in using your device&apos;s biometric or PIN.</p>
          </div>
        </div>

        <p className="text-muted text-[13px]">
          You can manage passkeys through your browser or device settings (e.g., iCloud Keychain, Google Password Manager, Windows Hello).
        </p>
      </div>
    </main>
  );
}
