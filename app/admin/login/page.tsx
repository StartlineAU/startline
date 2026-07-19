"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from "lucide-react";
import { signIn, signOut, confirmSignIn, fetchAuthSession } from "aws-amplify/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Force-change-password challenge (admin-created accounts)
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [newPassword,      setNewPassword]      = useState("");
  const [showNewPw,        setShowNewPw]        = useState(false);

  // MFA state
  const [mfaStep,       setMfaStep]       = useState<"none" | "setup" | "challenge">("none");
  const [totpCode,      setTotpCode]      = useState("");
  const [totpSetupUri,  setTotpSetupUri]  = useState<string | null>(null);

  const completeAdminSignIn = async () => {
    const session = await fetchAuthSession();
    const groups  = (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[] | undefined) ?? [];

    if (!groups.includes("admins")) {
      await signOut({ global: false }).catch(() => {});
      setError("Your account does not have admin access.");
      return;
    }

    await fetch("/api/admin/auth/session", { method: "POST" }).catch(() => {});
    router.push("/admin/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signOut({ global: false }).catch(() => {});

      const result = await signIn({
        username: email,
        password,
      });

      if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        setNeedsNewPassword(true);
        return;
      }

      if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
        setMfaStep("challenge");
        setTotpCode("");
        return;
      }

      if (result.nextStep.signInStep === "CONTINUE_SIGN_IN_WITH_TOTP_SETUP") {
        const details = result.nextStep.totpSetupDetails;
        if (details) {
          const uri = typeof details.getSetupUri === "function" ? details.getSetupUri("Startline") : null;
          setTotpSetupUri(uri ? uri.toString() : null);
        }
        setMfaStep("setup");
        setTotpCode("");
        return;
      }

      if (result.nextStep.signInStep !== "DONE") {
        setError("Additional verification required. Please contact support.");
        return;
      }

      await completeAdminSignIn();
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name ?? "";
      const msg  = err instanceof Error ? err.message : "";
      if (name === "NotAuthorizedException" || msg.includes("Incorrect username or password")) {
        setError("Incorrect email or password.");
      } else if (name === "UserNotFoundException") {
        setError("No account found with that email.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.nextStep.signInStep !== "DONE") {
        setError("Something went wrong setting your password. Please try again.");
        setNeedsNewPassword(false);
        return;
      }
      await completeAdminSignIn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Failed to set new password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaConfirm = async () => {
    setError("");
    if (!totpCode || totpCode.length < 6) { setError("Please enter the 6-digit code."); return; }
    setLoading(true);
    try {
      const result = await confirmSignIn({ challengeResponse: totpCode });

      if (result.nextStep.signInStep === "DONE") {
        await completeAdminSignIn();
        return;
      }

      if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
        setError("Invalid code. Try again.");
        return;
      }

      setError("Something went wrong. Please try again.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid code. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSetupConfirm = async () => {
    setError("");
    if (!totpCode || totpCode.length < 6) { setError("Please enter the 6-digit code from your authenticator app."); return; }
    setLoading(true);
    try {
      const result = await confirmSignIn({ challengeResponse: totpCode });

      if (result.nextStep.signInStep === "DONE") {
        await completeAdminSignIn();
        return;
      }

      setError("Invalid code. Please try again.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Setup failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-dark-darker px-6">
      <div className="w-full max-w-[400px] page-in">
        <span className="font-headline text-[11px] font-medium uppercase tracking-[0.25em] text-primary block mb-8">
          Admin Portal
        </span>

        <h1 className="font-headline text-5xl font-black italic tracking-tighter leading-[0.9] mb-4">
          Admin<br /><span className="text-primary">sign in.</span>
        </h1>
        <p className="text-muted text-[15px] leading-relaxed mb-10">
          Access is restricted to members of the admins group in Cognito.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-md bg-red-900/20 border border-red-500/30 text-red-400 font-headline text-[13px]">
            {error}
          </div>
        )}

        {mfaStep === "challenge" ? (
          <>
            <div className="mb-6">
              <span className="font-headline text-[11px] font-medium uppercase tracking-[0.25em] text-primary block mb-2">Admin Portal</span>
              <h1 className="font-headline text-5xl font-black italic tracking-tighter leading-[0.9] mb-2">
                Two-Factor<br /><span className="text-primary">auth.</span>
              </h1>
              <p className="text-muted text-[15px] leading-relaxed mb-6">Enter the 6-digit code from your authenticator app.</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-md bg-red-900/20 border border-red-500/30 text-red-400 font-headline text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleMfaConfirm(); }} className="space-y-5">
              <div>
                <label className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-2">
                  Authenticator Code
                </label>
                <input
                  type="text" inputMode="numeric" autoComplete="one-time-code" required
                  value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-dark border border-dark-lighter rounded-md px-4 py-3 text-[22px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors tracking-[0.5em] text-center font-bold"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || totpCode.length < 6}
                className="bg-machined shadow-machined w-full text-dark font-headline text-sm font-bold uppercase tracking-widest py-4 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                {loading
                  ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Verifying…</>
                  : <>Verify & sign in <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        ) : mfaStep === "setup" ? (
          <>
            <div className="mb-6">
              <span className="font-headline text-[11px] font-medium uppercase tracking-[0.25em] text-primary block mb-2">Admin Portal</span>
              <h1 className="font-headline text-5xl font-black italic tracking-tighter leading-[0.9] mb-2">
                Set up<br /><span className="text-primary">MFA.</span>
              </h1>
              <p className="text-muted text-[15px] leading-relaxed mb-6">
                Admins are required to set up multi-factor authentication. Scan the QR code with your authenticator app, then enter the code.
              </p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-md bg-red-900/20 border border-red-500/30 text-red-400 font-headline text-[13px]">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {totpSetupUri && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSetupUri)}`}
                      alt="TOTP Setup QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-2">
                  Code from App
                </label>
                <input
                  type="text" inputMode="numeric" required
                  value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-dark border border-dark-lighter rounded-md px-4 py-3 text-[22px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors tracking-[0.5em] text-center font-bold"
                  autoFocus
                />
              </div>
              <button type="button" onClick={handleMfaSetupConfirm} disabled={loading || totpCode.length < 6}
                className="bg-machined shadow-machined w-full text-dark font-headline text-sm font-bold uppercase tracking-widest py-4 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                {loading
                  ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Verifying…</>
                  : <>Verify & sign in <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </>
        ) : needsNewPassword ? (
          <form onSubmit={handleSetNewPassword} className="space-y-5">
            <div className="mb-2 px-4 py-3 rounded-md bg-primary/10 border border-primary/30 text-primary font-headline text-[13px]">
              Your account requires a new password before you can sign in.
            </div>
            <div>
              <label className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-2">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  type={showNewPw ? "text" : "password"} required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  className="w-full bg-dark border border-dark-lighter rounded-md pl-10 pr-11 py-3 text-[15px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowNewPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-dark hover:text-primary transition-colors">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="font-headline text-[11px] uppercase tracking-widest text-muted-dark mt-1.5">Minimum 8 characters</p>
            </div>
            <button type="submit" disabled={loading}
              className="bg-machined shadow-machined w-full text-dark font-headline text-sm font-bold uppercase tracking-widest py-4 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Setting password…</>
                : <>Set password & sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@startlineau.com"
                  className="w-full bg-dark border border-dark-lighter rounded-md pl-10 pr-4 py-3 text-[15px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted block mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
                <input
                  type={showPw ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-dark border border-dark-lighter rounded-md pl-10 pr-11 py-3 text-[15px] text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button" onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-dark hover:text-primary transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="bg-machined shadow-machined w-full text-dark font-headline text-sm font-bold uppercase tracking-widest py-4 rounded-md flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><span className="w-2 h-2 bg-dark rounded-full animate-pulse-dot" /> Signing in…</>
                : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
