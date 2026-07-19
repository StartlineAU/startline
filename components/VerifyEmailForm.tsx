"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowRight, RotateCcw, Check } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";

interface VerifyEmailConfig {
  logoHref: string;
  sessionEndpoint: string;
  redirectPath: string;
  emailPlaceholder: string;
  inputIdPrefix: string;
  verifiedSubtext: string;
  submitButtonLabel: string;
  bottomLinkText: string;
  bottomLinkHref: string;
  bottomLinkTarget?: string;
}

function VerifyForm({ config }: { config: VerifyEmailConfig }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const emailParam   = searchParams.get("email") ?? "";
  const { refresh, supabase } = useAuthContext();

  const [email,     setEmail]     = useState(emailParam);
  const [code,      setCode]      = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [verified,  setVerified]  = useState(false);

  const applyPendingProfile = async () => {
    try {
      const pendingName     = sessionStorage.getItem("startline_pending_name");
      const pendingUsername = sessionStorage.getItem("startline_pending_username");
      if (pendingName || pendingUsername) {
        await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(pendingName     ? { name: pendingName }        : {}),
            ...(pendingUsername ? { username: pendingUsername } : {}),
          }),
        });
      }
    } finally {
      sessionStorage.removeItem("startline_pending_name");
      sessionStorage.removeItem("startline_pending_dob");
      sessionStorage.removeItem("startline_pending_phone");
      sessionStorage.removeItem("startline_pending_username");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: verifyError } = await supabase?.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "signup",
      }) ?? {};
      if (verifyError) throw verifyError;

      await fetch(config.sessionEndpoint, { method: "POST" });
      await applyPendingProfile();
      await refresh();
      setVerified(true);
      setLoading(false);
      setTimeout(() => router.push(config.redirectPath), 1400);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid")) {
        setError("That code is incorrect. Please check and try again.");
      } else if (msg.includes("expired")) {
        setError("That code has expired. Use the resend button below.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const { error: resendError } = await supabase?.auth.resend({
        type: "signup",
        email,
      }) ?? {};
      if (resendError) throw resendError;
      setSuccess("A new code has been sent to your email.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend code.";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const inputCls       = "w-full bg-dark border border-dark-lighter rounded-md text-center text-[20px] tracking-[0.3em] font-bold py-4 text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors";
  const inputClsText   = "w-full bg-dark border border-dark-lighter rounded-md px-4 py-3 text-[15px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors";
  const btnCls         = "bg-machined shadow-machined w-full text-dark font-headline text-sm font-bold uppercase tracking-widest py-3 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed";
  const labelCls       = "font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-1.5";

  if (verified) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="font-headline text-3xl font-black italic tracking-tighter mb-2">Email verified!</h1>
          <p className={config.verifiedSubtext} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="w-full max-w-[420px]">
        <Link href={config.logoHref} className="block mb-10">
          <Image src="/logo.svg" alt="Startline" width={140} height={28} priority />
        </Link>

        <h1 className="font-headline text-4xl font-black italic tracking-tighter leading-[0.9] mb-2">
          Verify your<br /><span className="text-primary">email.</span>
        </h1>
        <p className="text-muted text-[15px] leading-relaxed mb-8">
          Enter the 6-digit code sent to <strong className="text-light">{email}</strong>
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-md bg-red-900/20 border border-red-500/30 text-red-400 font-headline text-[13px]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 px-4 py-3 rounded-md bg-green-900/20 border border-green-500/30 text-green-400 font-headline text-[13px]">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <p className={labelCls}>Verification code</p>
            <input
              id={`${config.inputIdPrefix}-code`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className={inputCls}
              autoFocus
            />
          </div>

          <button type="submit" disabled={loading || code.length < 6} className={btnCls}>
            {loading
              ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Verifying&#8230;</>
              : <>{config.submitButtonLabel} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full mt-4 font-headline text-[11px] uppercase tracking-widest text-muted hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-2 disabled:opacity-50"
        >
          {resending
            ? <><span className="w-3 h-3 border-2 border-muted border-t-transparent rounded-full animate-spin" /> Sending&#8230;</>
            : <><RotateCcw className="w-3.5 h-3.5" /> Resend code</>}
        </button>

        <div className="mt-8 text-center">
          <Link href={config.bottomLinkHref} target={config.bottomLinkTarget} className="font-headline text-[11px] uppercase tracking-widest text-muted hover:text-primary transition-colors">
            {config.bottomLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailForm(props: { config: VerifyEmailConfig }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted font-headline text-[11px] tracking-widest uppercase">Loading&#8230;</p>
      </div>
    }>
      <VerifyForm {...props} />
    </Suspense>
  );
}
