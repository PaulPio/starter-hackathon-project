"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { GUEST_FLAG_KEY } from "@/lib/resume-cache";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1.7 1.7 2.8 1.2.1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

type OAuthProvider = "google" | "github";

export function SignInCard({ authError }: { authError?: boolean }) {
  const router = useRouter();
  const { configured } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | "guest" | null>(null);
  const [error, setError] = useState<string | null>(
    authError ? "Sign-in didn't complete. Try again." : null
  );

  async function signInWith(provider: OAuthProvider) {
    if (!configured) {
      setError("Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.");
      return;
    }
    setBusy(provider);
    setError(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/#demo")}`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setBusy(null);
      }
    } catch {
      setError("Couldn't start sign-in. Check Supabase env vars.");
      setBusy(null);
    }
  }

  function continueAsGuest() {
    setBusy("guest");
    try {
      sessionStorage.setItem(GUEST_FLAG_KEY, "1");
    } catch {
      // ignore
    }
    router.push("/#demo");
  }

  const oauthBtn =
    "flex w-full items-center justify-center gap-2.5 border-2 border-ink bg-card px-3 py-2.5 text-sm font-bold text-foreground disabled:opacity-50";

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-5 border-2 border-ink bg-card p-9 shadow-hard-lg">
      <div>
        <h1 className="text-2xl font-black tracking-[-0.02em] text-foreground">Sign in</h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">
          Pick up where you left off.
        </p>
      </div>

      {error && (
        <p className="border-2 border-ink bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        className={oauthBtn}
        disabled={busy !== null}
        onClick={() => signInWith("google")}
      >
        <GoogleIcon />
        {busy === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <button
        type="button"
        className={oauthBtn}
        disabled={busy !== null}
        onClick={() => signInWith("github")}
      >
        <GitHubIcon />
        {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
      </button>

      <div className="flex items-center gap-2.5 text-[11.5px] font-bold text-text-faint">
        <div className="h-0.5 flex-1 bg-ink" />
        OR
        <div className="h-0.5 flex-1 bg-ink" />
      </div>

      <button
        type="button"
        disabled={busy !== null}
        onClick={continueAsGuest}
        className="w-full border-2 border-ink bg-brand px-3 py-3 text-[14.5px] font-extrabold text-white shadow-hard disabled:opacity-50"
      >
        {busy === "guest" ? "Entering…" : "Continue as Guest"}
      </button>

      <p className="text-center text-[13px] text-muted-foreground">
        Guests stay on this device only. Sign in to sync your resume across browsers.
      </p>
    </div>
  );
}
