"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type Step = "request" | "confirm";

function ForgotPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [step,        setStep]        = useState<Step>("request");
  const [email,       setEmail]       = useState(searchParams.get("email") ?? "");
  const [code,        setCode]        = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/forgot-password?email=${encodeURIComponent(email)}`,
      });
      if (resetError) throw resetError;
      setStep("confirm");
      setSuccess("A verification code has been sent to your email.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "recovery",
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSuccess("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => router.push("/?reset=1"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password.";
      if (msg.includes("invalid")) {
        setError("That code is incorrect or has expired.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls   = "w-full bg-dark border border-dark-lighter rounded-md pl-10 pr-4 py-3 text-[15px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors";
  const labelCls   = "font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-1.5";
  const btnCls     = "bg-machined shadow-machined w-full text-dark font-headline text-sm font-bold uppercase tracking-widest py-3 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="block mb-10">
          <Image src="/logo.svg" alt="Startline" width={140} height={28} priority />
        </Link>

        <h1 className="font-headline text-4xl font-black italic tracking-tighter leading-[0.9] mb-2">
          {step === "request" ? <>Reset your<br /><span className="text-primary">password.</span></>
          : <>Enter verification<br /><span className="text-primary">code.</span></>}
        </h1>
        <p className="text-muted text-[15px] leading-relaxed mb-8">
          {step === "request"
            ? "Enter your email and we'll send you a verification code."
            : `A code was sent to ${email}`}
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

        {step === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className={labelCls}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  id="reset-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls} autoFocus
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading
                ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Sending&#8230;</>
                : <>Send code <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-5">
            <div>
              <label htmlFor="reset-code" className={labelCls}>Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  id="reset-code" type="text" inputMode="numeric" required
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-dark border border-dark-lighter rounded-md pl-10 pr-4 py-3 text-[20px] tracking-[0.3em] text-center font-bold text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label htmlFor="reset-new-password" className={labelCls}>New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  id="reset-new-password"
                  type={showPw ? "text" : "password"} required value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className={inputCls + " pr-11"}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-dark hover:text-primary transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className={labelCls}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  id="reset-confirm-password"
                  type={showPw ? "text" : "password"} required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className={inputCls}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className={btnCls}>
              {loading
                ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Resetting&#8230;</>
                : <>Reset password <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="font-headline text-[11px] uppercase tracking-widest text-muted hover:text-primary transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted font-headline text-[11px] tracking-widest uppercase">Loading&#8230;</p>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
