"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Check, X } from "lucide-react";

function Banner() {
  const searchParams = useSearchParams();
  const router        = useRouter();
  const pathname       = usePathname();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || searchParams.get("verified") !== "1") return null;

  const dismiss = () => {
    setDismissed(true);
    router.replace(pathname);
  };

  return (
    <div className="bg-green-900/20 border-b border-green-500/30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-3">
        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
        <p className="text-green-400 font-headline text-[13px] text-center">
          Email verified — sign in below to continue.
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-green-400/60 hover:text-green-400 transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function VerifiedBanner() {
  return (
    <Suspense>
      <Banner />
    </Suspense>
  );
}
