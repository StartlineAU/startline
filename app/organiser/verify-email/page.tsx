"use client";

import VerifyEmailForm from "@/components/VerifyEmailForm";

const config = {
  logoHref: "/organiser",
  sessionEndpoint: "/api/organiser/auth/session",
  redirectPath: "/organiser/dashboard",
  emailPlaceholder: "events@yourorg.com.au",
  inputIdPrefix: "org-verify",
  verifiedSubtext: "Taking you to your dashboard…",
  submitButtonLabel: "Verify email",
  bottomLinkText: "Wrong email?",
  bottomLinkHref: "/organiser",
  bottomLinkLabel: "Go back",
};

export default function OrganiserVerifyEmailPage() {
  return <VerifyEmailForm config={config} />;
}
