function trimEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Vercel/dashboard paste sometimes includes wrapping quotes or whitespace.
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSupabaseUrl(): string {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!isHttpUrl(url)) {
    throw new Error(
      "Invalid NEXT_PUBLIC_SUPABASE_URL: must be a full http(s) URL like https://xxxx.supabase.co"
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = trimEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
  }
  return key;
}

export function hasSupabaseConfig(): boolean {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return Boolean(url && key && isHttpUrl(url));
}
