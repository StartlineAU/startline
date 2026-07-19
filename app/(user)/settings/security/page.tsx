"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, Clipboard, Check, Trash2, ArrowLeft, RefreshCw, Fingerprint } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { associateWebAuthnCredential, listWebAuthnCredentials, deleteWebAuthnCredential } from "aws-amplify/auth";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, status } = useAuthContext();

  const [mfaStatus,      setMfaStatus]      = useState<{ mfaEnabled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [passkeys,       setPasskeys]        = useState<any[]>([]);
  const [loading,        setLoading]         = useState(true);
  const [error,          setError]           = useState("");
  const [success,        setSuccess]         = useState("");

  const [newCodes,       setNewCodes]        = useState<string[] | null>(null);
  const [codesCopied,    setCodesCopied]     = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mfaRes, passkeyRes] = await Promise.all([
        fetch("/api/user/mfa"),
        listWebAuthnCredentials().catch(() => ({ credentials: [] as any[] })),
      ]);
      if (mfaRes.ok) {
        const mfaData = await mfaRes.json();
        setMfaStatus(mfaData);
      }
      setPasskeys(passkeyRes.credentials ?? []);
    } catch {
      setError("Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !user) { router.push("/"); return; }
    startTransition(() => { loadData(); });
  }, [status, user, loadData, router]);

  const generateCodes = async () => {
    const res = await fetch("/api/user/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-recovery-codes" }),
    });
    if (!res.ok) throw new Error("Failed to generate codes.");
    return await res.json();
  };

  const handleEnableMfa = async () => {
    setError(""); setSuccess("");
    try {
      const data = await generateCodes();
      setNewCodes(data.codes);
      setMfaStatus(prev => prev ? { ...prev, mfaEnabled: true, recoveryCodesRemaining: 10 } : prev);
      setSuccess("MFA enabled. Save your recovery codes.");
    } catch {
      setError("Failed to enable MFA.");
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm("Disabling MFA will remove this security layer. Your existing recovery codes will be invalidated. Continue?")) return;
    setError(""); setSuccess("");
    try {
      const res = await fetch("/api/user/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      if (!res.ok) { setError("Failed to disable MFA."); return; }
      setMfaStatus(prev => prev ? { ...prev, mfaEnabled: false, recoveryCodesRemaining: 0 } : prev);
      setNewCodes(null);
      setSuccess("MFA disabled.");
    } catch {
      setError("Failed to disable MFA.");
    }
  };

  const handleRegisterPasskey = async () => {
    setError(""); setSuccess("");
    try {
      await associateWebAuthnCredential();
      const res = await listWebAuthnCredentials().catch(() => ({ credentials: [] as any[] }));
      setPasskeys(res.credentials ?? []);
      setSuccess("Passkey registered.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to register passkey.";
      setError(msg);
    }
  };

  const handleDeletePasskey = async (credentialId: any) => {
    if (typeof credentialId !== "string") return;
    setError(""); setSuccess("");
    try {
      await deleteWebAuthnCredential({ credentialId });
      setPasskeys(prev => prev.filter(p => p.credentialId !== credentialId));
      setSuccess("Passkey removed.");
    } catch {
      setError("Failed to remove passkey.");
    }
  };

  const handleCopyCodes = () => {
    if (!newCodes) return;
    navigator.clipboard.writeText(newCodes.join("\n")).then(() => {
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    });
  };

  const handleDismissCodes = () => {
    setNewCodes(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-dark-darker flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const cardCls  = "bg-dark border border-dark-lighter rounded-xl p-5 space-y-4";

  return (
    <main className="min-h-screen bg-dark-darker">
      <div className="max-w-[600px] mx-auto px-4 py-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 font-headline text-[11px] uppercase tracking-widest text-muted hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <span className="font-headline text-[11px] font-medium uppercase tracking-[0.25em] text-primary block mb-2">Security</span>
        <h1 className="font-headline text-4xl font-black italic tracking-tighter leading-[0.9] mb-2">
          Security<br /><span className="text-primary">settings.</span>
        </h1>
        <p className="text-muted text-[15px] leading-relaxed mb-10">Manage your account security and authentication methods.</p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-md bg-red-900/20 border border-red-500/30 text-red-400 font-headline text-[13px] flex items-center gap-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 px-4 py-3 rounded-md bg-green-900/20 border border-green-500/30 text-green-400 font-headline text-[13px] flex items-center gap-2">
            <Check className="w-4 h-4" /> {success}
          </div>
        )}

        {/* Recovery codes prompt */}
        {newCodes && (
          <div className={cardCls + " border-primary/30 mb-6"}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-headline text-[12px] font-bold uppercase tracking-widest text-primary">Recovery codes</span>
            </div>
            <p className="text-muted text-[13px] leading-relaxed mb-3">
              These codes can be used to sign in if you lose access to your authenticator app.
              Store them securely — they will not be shown again.
            </p>
            <div className="bg-dark-darker border border-dark-lighter rounded-lg p-4 mb-3">
              <code className="block text-light text-[14px] font-mono leading-loose whitespace-pre">
                {newCodes.join("\n")}
              </code>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopyCodes}
                className="flex-1 font-headline text-[11px] uppercase tracking-widest py-2.5 rounded-md border border-dark-lighter text-muted hover:text-light hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
              >
                <Clipboard className="w-3.5 h-3.5" /> {codesCopied ? "Copied!" : "Copy codes"}
              </button>
              <button onClick={handleDismissCodes}
                className="flex-1 font-headline text-[11px] uppercase tracking-widest py-2.5 rounded-md border border-dark-lighter text-muted hover:text-light hover:border-primary/50 transition-all"
              >
                I&apos;ve saved them
              </button>
            </div>
          </div>
        )}

        {/* MFA section */}
        <div className={cardCls + " mb-6"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-headline text-[12px] font-bold uppercase tracking-widest text-light">Two-factor auth</span>
            </div>
            {mfaStatus?.mfaEnabled ? (
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-headline text-[10px] uppercase tracking-widest font-bold">
                Enabled
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-muted/10 text-muted font-headline text-[10px] uppercase tracking-widest font-bold">
                Disabled
              </span>
            )}
          </div>
          <p className="text-muted text-[13px] leading-relaxed">
            {mfaStatus?.mfaEnabled
              ? "Your account is protected with TOTP (authenticator app)."
              : "Add an extra layer of security by requiring a one-time code from your authenticator app when signing in."}
          </p>
          {mfaStatus?.recoveryCodesRemaining !== undefined && mfaStatus.recoveryCodesRemaining > 0 && (
            <p className="text-muted-dark text-[11px]">
              {mfaStatus.recoveryCodesRemaining} recovery code{mfaStatus.recoveryCodesRemaining !== 1 ? "s" : ""} remaining
            </p>
          )}

          {!mfaStatus?.mfaEnabled ? (
            <button onClick={handleEnableMfa}
              className="w-full font-headline text-[11px] uppercase tracking-widest py-2.5 rounded-md bg-machined shadow-machined text-dark font-bold hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" /> Enable TOTP MFA
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleDisableMfa}
                className="flex-1 font-headline text-[11px] uppercase tracking-widest py-2.5 rounded-md border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Disable MFA
              </button>
              <button onClick={async () => {
                setError(""); setSuccess("");
                try { const data = await generateCodes(); setNewCodes(data.codes); setMfaStatus(prev => prev ? { ...prev, recoveryCodesRemaining: 10 } : prev); setSuccess("New recovery codes generated."); }
                catch { setError("Failed to generate codes."); }
              }}
                className="flex-1 font-headline text-[11px] uppercase tracking-widest py-2.5 rounded-md border border-dark-lighter text-muted hover:text-light hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> New codes
              </button>
            </div>
          )}
        </div>

        {/* Passkey section */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              <span className="font-headline text-[12px] font-bold uppercase tracking-widest text-light">Passkeys</span>
            </div>
            {passkeys.length > 0 && (
              <span className="text-muted-dark font-headline text-[10px] uppercase tracking-widest">{passkeys.length} registered</span>
            )}
          </div>
          <p className="text-muted text-[13px] leading-relaxed">
            Passkeys let you sign in using your device&apos;s biometrics (Face ID, Touch ID) or PIN. Faster than a password, and MFA is not required when using a passkey.
          </p>

          {passkeys.map((pk, i) => (
            <div key={pk.credentialId ?? i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-darker border border-dark-lighter">
              <div>
                <span className="font-headline text-[11px] text-light block">{pk.friendlyCredentialName ?? ""}</span>
                <span className="text-muted-dark text-[10px]">
                  Registered {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
              <button onClick={() => handleDeletePasskey(pk.credentialId)}
                className="text-muted-dark hover:text-red-400 transition-colors p-1"
                aria-label="Remove passkey"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button onClick={handleRegisterPasskey}
            className="w-full font-headline text-[11px] uppercase tracking-widest py-2.5 rounded-md border border-dark-lighter text-muted hover:text-light hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
          >
            <Fingerprint className="w-3.5 h-3.5" /> Register a passkey
          </button>
        </div>
      </div>
    </main>
  );
}
