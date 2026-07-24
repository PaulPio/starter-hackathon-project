import { createClient } from "@/lib/supabase/client";
import {
  ResumeProfileSchema,
  type ResumeProfile,
} from "@/lib/schemas";

export const LOCAL_RESUME_KEY = "resumefit_saved_resume";
export const GUEST_FLAG_KEY = "resumefit_guest";

/** Keep under typical localStorage quotas and jsonb row comfort. */
export const MAX_RESUME_TEXT_CHARS = 200_000;

export type CachedResumeStep = "profile" | "jobs";

export interface CachedResume {
  profile: ResumeProfile;
  resumeText: string;
  step: CachedResumeStep;
}

function parseCached(raw: unknown): CachedResume | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const profileParsed = ResumeProfileSchema.safeParse(obj.profile);
  if (!profileParsed.success) return null;
  if (typeof obj.resumeText !== "string" || !obj.resumeText.trim()) return null;
  const step: CachedResumeStep = obj.step === "jobs" ? "jobs" : "profile";
  return {
    profile: profileParsed.data,
    resumeText: obj.resumeText,
    step,
  };
}

export function isResumeTextCacheable(resumeText: string): boolean {
  return resumeText.length > 0 && resumeText.length <= MAX_RESUME_TEXT_CHARS;
}

export function loadLocalResume(): CachedResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_RESUME_KEY);
    if (!raw) return null;
    return parseCached(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalResume(data: CachedResume): void {
  if (typeof window === "undefined") return;
  if (!isResumeTextCacheable(data.resumeText)) return;
  try {
    window.localStorage.setItem(LOCAL_RESUME_KEY, JSON.stringify(data));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function clearLocalResume(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_RESUME_KEY);
  } catch {
    // ignore
  }
}

export async function loadRemoteResume(): Promise<CachedResume | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("saved_resumes")
    .select("profile, resume_text, step")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return parseCached({
    profile: data.profile,
    resumeText: data.resume_text,
    step: data.step,
  });
}

export async function saveRemoteResume(data: CachedResume): Promise<void> {
  if (!isResumeTextCacheable(data.resumeText)) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("saved_resumes").upsert(
    {
      user_id: user.id,
      profile: data.profile,
      resume_text: data.resumeText,
      step: data.step,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function clearRemoteResume(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("saved_resumes").delete().eq("user_id", user.id);
}

/** Prefer remote for signed-in users; fall back to local for guests. */
export async function loadCachedResume(signedIn: boolean): Promise<CachedResume | null> {
  if (signedIn) {
    const remote = await loadRemoteResume();
    if (remote) return remote;
  }
  return loadLocalResume();
}

export async function saveCachedResume(
  signedIn: boolean,
  data: CachedResume
): Promise<void> {
  if (signedIn) {
    await saveRemoteResume(data);
    // Keep a local copy so a brief offline moment still works.
    saveLocalResume(data);
    return;
  }
  saveLocalResume(data);
}

export async function clearCachedResume(signedIn: boolean): Promise<void> {
  clearLocalResume();
  if (signedIn) {
    await clearRemoteResume();
  }
}
