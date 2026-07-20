"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, Copy, Check, Key, Plus, Trash2, Fingerprint } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, status } = useAuthContext();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState(0);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/mfa")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setMfaEnabled(data.mfaEnabled);
          setRecoveryCodesRemaining(data.recoveryCodesRemaining);
        }
      })
      .catch(() => {});
  }, [status]);

  const handleGenerateRecoveryCodes = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/user/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-recovery-codes" }),
      });
      const data = await r.json();
      if (r.ok) {
        setRecoveryCodes(data.codes);
        setRecoveryCodesRemaining(data.codes.length);
      } else {
        setError(data.error || "Failed to generate codes.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        setRecoveryCodes(null);
        setRecoveryCodesRemaining(0);
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
  const labelCls = "font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-1";
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

        {/* Recovery codes */}
        <div className="border-t border-dark-lighter pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted" />
                <span className="font-headline text-[11px] font-bold uppercase tracking-widest">Recovery Codes</span>
              </div>
              <p className="text-muted text-[11px] mt-1">
                {recoveryCodesRemaining > 0
                  ? `${recoveryCodesRemaining} code${recoveryCodesRemaining === 1 ? "" : "s"} remaining`
                  : "No recovery codes generated yet."}
              </p>
            </div>
            <button onClick={handleGenerateRecoveryCodes} disabled={loading}
              className={btnCls + " border-primary/30 text-primary hover:bg-primary/10"}>
              <Plus className="w-3.5 h-3.5" /> Generate
            </button>
          </div>

          {recoveryCodes && (
            <div className="bg-dark rounded-lg p-4 space-y-2">
              <div className="font-headline text-[10px] uppercase tracking-widest text-amber-400 mb-2">
                Save these codes — they won&apos;t be shown again.
              </div>
              {recoveryCodes.map((code, i) => (
                <div key={i} className="font-mono text-[14px] tracking-wider text-light font-bold">
                  {code}
                </div>
              ))}
              <button onClick={handleCopyCodes} className="flex items-center gap-2 mt-2 text-muted hover:text-primary transition-colors font-headline text-[11px] uppercase tracking-widest">
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy all</>}
              </button>
            </div>
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
