import { createClient } from "@/lib/supabase/client";
import {
  ResumeProfileSchema,
  type ResumeProfile,
} from "@/lib/schemas";

export const LOCAL_RESUME_KEY = "resumefit_saved_resume";

/** Keep under typical localStorage quotas and jsonb row comfort. */
export const MAX_RESUME_TEXT_CHARS = 200_000;

export type CachedResumeStep = "profile" | "jobs";

export interface CachedResume {
  profile: ResumeProfile;
  resumeText: string;
  step: CachedResumeStep;
}

export type RemoteResumeLoad =
  | { status: "ok"; data: CachedResume }
  | { status: "empty" }
  | { status: "error"; message: string };

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

export async function loadRemoteResume(): Promise<RemoteResumeLoad> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { status: "error", message: userError.message };
  }
  if (!user) return { status: "empty" };

  const { data, error } = await supabase
    .from("saved_resumes")
    .select("profile, resume_text, step")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }
  if (!data) return { status: "empty" };

  const parsed = parseCached({
    profile: data.profile,
    resumeText: data.resume_text,
    step: data.step,
  });
  if (!parsed) {
    return { status: "error", message: "Saved resume failed validation." };
  }
  return { status: "ok", data: parsed };
}

export async function saveRemoteResume(data: CachedResume): Promise<boolean> {
  if (!isResumeTextCacheable(data.resumeText)) return false;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("saved_resumes").upsert(
    {
      user_id: user.id,
      profile: data.profile,
      resume_text: data.resumeText,
      step: data.step,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[resume-cache] saveRemoteResume failed:", error.message);
    return false;
  }
  return true;
}

export async function clearRemoteResume(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { error } = await supabase
    .from("saved_resumes")
    .delete()
    .eq("user_id", user.id);
  if (error) {
    console.error("[resume-cache] clearRemoteResume failed:", error.message);
    return false;
  }
  return true;
}

export type CachedResumeLoad = {
  resume: CachedResume | null;
  /** True when local should be upserted to Supabase (remote confirmed empty). */
  shouldPromoteLocal: boolean;
};

/**
 * Prefer remote for signed-in users. Never fall back to local on remote error
 * (avoids overwriting cloud data with stale guest cache).
 */
export async function loadCachedResume(signedIn: boolean): Promise<CachedResumeLoad> {
  if (signedIn) {
    const remote = await loadRemoteResume();
    if (remote.status === "ok") {
      return { resume: remote.data, shouldPromoteLocal: false };
    }
    if (remote.status === "error") {
      console.error("[resume-cache] loadRemoteResume failed:", remote.message);
      return { resume: null, shouldPromoteLocal: false };
    }
    // Remote empty — allow promoting a local guest cache once.
    const local = loadLocalResume();
    return { resume: local, shouldPromoteLocal: Boolean(local) };
  }
  return { resume: loadLocalResume(), shouldPromoteLocal: false };
}

export async function saveCachedResume(
  signedIn: boolean,
  data: CachedResume
): Promise<void> {
  if (signedIn) {
    await saveRemoteResume(data);
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
