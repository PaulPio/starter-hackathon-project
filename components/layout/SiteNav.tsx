"use client";

import Link from "next/link";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/components/auth/AuthProvider";

export function SiteNav({
  onTryDemo,
  variant = "default",
}: {
  onTryDemo?: () => void;
  variant?: "default" | "sign-in";
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, loading, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <header className="sticky top-0 z-[60] flex items-center justify-between border-b-2 border-ink bg-background px-6 py-4 md:px-8">
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <div className="size-[26px] shrink-0 border-2 border-ink bg-brand" aria-hidden />
        <span className="text-base font-extrabold tracking-[-0.02em] text-foreground">
          ResumeFit
        </span>
      </Link>

      {variant === "default" && (
        <nav className="hidden items-center gap-7 md:flex">
          <a href="/#demo" className="text-[13.5px] font-bold text-foreground no-underline">
            Product
          </a>
          <a href="/#how" className="text-[13.5px] font-bold text-foreground no-underline">
            How it works
          </a>
        </nav>
      )}

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex size-9 items-center justify-center border-2 border-ink bg-card text-[15px] text-foreground shadow-hard"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>

        {variant === "sign-in" ? (
          <Link
            href="/"
            className="border-2 border-ink bg-card px-4 py-2 text-[13.5px] font-bold text-foreground shadow-hard no-underline"
          >
            ← Back
          </Link>
        ) : loading ? null : user ? (
          <>
            <span className="hidden max-w-[140px] truncate text-[13px] font-bold text-muted-foreground sm:inline">
              {displayName}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="border-2 border-ink bg-card px-4 py-2 text-[13.5px] font-bold text-foreground shadow-hard"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/sign-in"
            className="border-2 border-ink bg-card px-4 py-2 text-[13.5px] font-bold text-foreground shadow-hard no-underline"
          >
            Sign in
          </Link>
        )}

        <a
          href="/#demo"
          onClick={(e) => {
            if (onTryDemo) {
              e.preventDefault();
              onTryDemo();
            }
          }}
          className="border-2 border-ink bg-brand px-4 py-2 text-[13.5px] font-bold text-white shadow-hard no-underline"
        >
          Try the demo
        </a>
      </div>
    </header>
  );
}
