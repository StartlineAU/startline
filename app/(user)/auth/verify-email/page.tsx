"use client";

import VerifyEmailForm from "@/components/VerifyEmailForm";

const config = {
  logoHref: "/",
  sessionEndpoint: "/api/user/auth/session",
  redirectPath: "/",
  emailPlaceholder: "you@example.com",
  inputIdPrefix: "verify",
  verifiedSubtext: "Taking you to Startline…",
  submitButtonLabel: "Verify & sign in",
  bottomLinkText: "Already verified?",
  bottomLinkHref: "/",
  bottomLinkLabel: "Back to home",
};

const applyPendingProfile = async () => {
  try {
    const pendingName = sessionStorage.getItem("startline_pending_name");
    const pendingUsername = sessionStorage.getItem("startline_pending_username");
    if (pendingName || pendingUsername) {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pendingName ? { name: pendingName } : {}),
          ...(pendingUsername ? { username: pendingUsername } : {}),
        }),
      });
    }
  } finally {
    sessionStorage.removeItem("startline_pending_name");
    sessionStorage.removeItem("startline_pending_username");
  }
};

export default function UserVerifyEmailPage() {
  return <VerifyEmailForm config={config} onVerified={applyPendingProfile} />;
}
