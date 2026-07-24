"use client";

import { useEffect, useReducer, useRef } from "react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PdfDropzone } from "@/components/upload/PdfDropzone";
import { ProfileAndHealthCheck } from "@/components/profile/ProfileAndHealthCheck";
import { JobList } from "@/components/jobs/JobList";
import { TailorPanel } from "@/components/tailor/TailorPanel";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  clearCachedResume,
  loadCachedResume,
  saveCachedResume,
  type CachedResumeStep,
} from "@/lib/resume-cache";
import type { JobListing, RankedJob, ResumeProfile, TailorResponse } from "@/lib/schemas";

type AsyncPhase = "idle" | "loading" | "success" | "error";

interface State {
  step: "upload" | "profile" | "jobs";
  profile: ResumeProfile | null;
  resumeText: string | null;
  parsePhase: AsyncPhase;
  parseError: string | null;
  hydratePhase: AsyncPhase;

  totalJobCount: number;
  ranked: RankedJob[];
  rankPhase: AsyncPhase;
  rankError: string | null;

  selectedJob: RankedJob | null;
  tailorPhase: AsyncPhase;
  tailorError: string | null;
  tailored: TailorResponse | null;
}

type Action =
  | { type: "HYDRATE_START" }
  | {
      type: "HYDRATE_SUCCESS";
      profile: ResumeProfile;
      resumeText: string;
      step: CachedResumeStep;
    }
  | { type: "HYDRATE_EMPTY" }
  | { type: "PARSE_START" }
  | { type: "PARSE_SUCCESS"; profile: ResumeProfile; resumeText: string }
  | { type: "PARSE_ERROR"; message: string }
  | { type: "RESTART" }
  | { type: "SET_STEP"; step: State["step"] }
  | { type: "RANK_START" }
  | { type: "RANK_SUCCESS"; ranked: RankedJob[]; totalCount: number }
  | { type: "RANK_ERROR"; message: string }
  | { type: "SELECT_JOB"; job: RankedJob }
  | { type: "CLOSE_TAILOR" }
  | { type: "TAILOR_START" }
  | { type: "TAILOR_SUCCESS"; tailored: TailorResponse }
  | { type: "TAILOR_ERROR"; message: string };

const initialState: State = {
  step: "upload",
  profile: null,
  resumeText: null,
  parsePhase: "idle",
  parseError: null,
  hydratePhase: "idle",
  totalJobCount: 0,
  ranked: [],
  rankPhase: "idle",
  rankError: null,
  selectedJob: null,
  tailorPhase: "idle",
  tailorError: null,
  tailored: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE_START":
      return { ...state, hydratePhase: "loading" };
    case "HYDRATE_SUCCESS":
      return {
        ...state,
        hydratePhase: "success",
        step: action.step,
        profile: action.profile,
        resumeText: action.resumeText,
        parsePhase: "success",
      };
    case "HYDRATE_EMPTY":
      return { ...state, hydratePhase: "success" };
    case "PARSE_START":
      return { ...state, parsePhase: "loading", parseError: null };
    case "PARSE_SUCCESS":
      return {
        ...state,
        step: "profile",
        parsePhase: "success",
        profile: action.profile,
        resumeText: action.resumeText,
      };
    case "PARSE_ERROR":
      return { ...state, parsePhase: "error", parseError: action.message };
    case "RESTART":
      return { ...initialState, hydratePhase: "success" };
    case "SET_STEP": {
      if (action.step === "profile" && !state.profile) return state;
      if (action.step === "jobs" && state.ranked.length === 0 && state.rankPhase !== "success") {
        return state;
      }
      return { ...state, step: action.step };
    }
    case "RANK_START":
      return { ...state, step: "jobs", rankPhase: "loading", rankError: null };
    case "RANK_SUCCESS":
      return {
        ...state,
        rankPhase: "success",
        ranked: action.ranked,
        totalJobCount: action.totalCount,
      };
    case "RANK_ERROR":
      return { ...state, rankPhase: "error", rankError: action.message };
    case "SELECT_JOB":
      return { ...state, selectedJob: action.job, tailorPhase: "idle", tailored: null, tailorError: null };
    case "CLOSE_TAILOR":
      return { ...state, selectedJob: null };
    case "TAILOR_START":
      return { ...state, tailorPhase: "loading", tailorError: null };
    case "TAILOR_SUCCESS":
      return { ...state, tailorPhase: "success", tailored: action.tailored };
    case "TAILOR_ERROR":
      return { ...state, tailorPhase: "error", tailorError: action.message };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

const PARSE_MESSAGES = [
  "Reading your resume…",
  "Identifying your skills and experience…",
  "Running the resume health check…",
];

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? "Something went wrong reading your resume.";
  } catch {
    return "Something went wrong reading your resume.";
  }
}

const STEP_PILLS: Array<{ key: State["step"]; label: string }> = [
  { key: "upload", label: "1 · Upload" },
  { key: "profile", label: "2 · Health check" },
  { key: "jobs", label: "3 · Matches" },
];

export function ResumeFitApp({ initialJobs }: { initialJobs: JobListing[] }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const demoRef = useRef<HTMLElement>(null);
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user);
  const hydratedForUser = useRef<string | null>(null);

  function scrollToDemo() {
    demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (authLoading) return;
    const key = user?.id ?? "guest";
    if (hydratedForUser.current === key) return;
    hydratedForUser.current = key;

    let cancelled = false;
    dispatch({ type: "HYDRATE_START" });

    (async () => {
      const cached = await loadCachedResume(signedIn);
      if (cancelled) return;
      if (!cached) {
        dispatch({ type: "HYDRATE_EMPTY" });
        return;
      }

      dispatch({
        type: "HYDRATE_SUCCESS",
        profile: cached.profile,
        resumeText: cached.resumeText,
        step: cached.step,
      });

      // Guest→account: promote local cache into Supabase.
      if (signedIn) {
        void saveCachedResume(true, cached);
      }

      if (cached.step === "jobs") {
        dispatch({ type: "RANK_START" });
        try {
          const res = await fetch("/api/rank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile: cached.profile }),
          });
          if (cancelled) return;
          if (!res.ok) {
            dispatch({
              type: "RANK_ERROR",
              message: "Couldn't rank internships against your profile.",
            });
            return;
          }
          const data = await res.json();
          dispatch({
            type: "RANK_SUCCESS",
            ranked: data.ranked,
            totalCount: data.totalCount,
          });
        } catch {
          if (!cancelled) {
            dispatch({
              type: "RANK_ERROR",
              message: "Couldn't reach the server. Check your connection and try again.",
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, signedIn, user?.id]);

  async function runParse(fetcher: () => Promise<Response>) {
    dispatch({ type: "PARSE_START" });
    try {
      const res = await fetcher();
      if (!res.ok) {
        dispatch({ type: "PARSE_ERROR", message: await parseErrorMessage(res) });
        return;
      }
      const data = await res.json();
      dispatch({ type: "PARSE_SUCCESS", profile: data.profile, resumeText: data.resumeText });
      void saveCachedResume(signedIn, {
        profile: data.profile,
        resumeText: data.resumeText,
        step: "profile",
      });
    } catch {
      dispatch({
        type: "PARSE_ERROR",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  function handleFileSelected(file: File) {
    const formData = new FormData();
    formData.append("resume", file);
    runParse(() => fetch("/api/parse-resume", { method: "POST", body: formData }));
  }

  function handleUseSample() {
    runParse(() => fetch("/api/parse-resume?sample=1", { method: "POST" }));
  }

  async function runRank() {
    if (!state.profile || !state.resumeText) return;
    const profile = state.profile;
    const resumeText = state.resumeText;
    dispatch({ type: "RANK_START" });
    try {
      const res = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) {
        dispatch({ type: "RANK_ERROR", message: "Couldn't rank internships against your profile." });
        return;
      }
      const data = await res.json();
      dispatch({ type: "RANK_SUCCESS", ranked: data.ranked, totalCount: data.totalCount });
      void saveCachedResume(signedIn, {
        profile,
        resumeText,
        step: "jobs",
      });
    } catch {
      dispatch({
        type: "RANK_ERROR",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  async function runTailor(job: RankedJob) {
    if (!state.profile || !state.resumeText) return;
    dispatch({ type: "TAILOR_START" });
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: state.profile, resumeText: state.resumeText, job }),
      });
      if (!res.ok) {
        dispatch({
          type: "TAILOR_ERROR",
          message: "Couldn't tailor your resume for this listing — please try again.",
        });
        return;
      }
      const data = await res.json();
      dispatch({ type: "TAILOR_SUCCESS", tailored: data });
    } catch {
      dispatch({
        type: "TAILOR_ERROR",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  function handleRestart() {
    void clearCachedResume(signedIn);
    dispatch({ type: "RESTART" });
  }

  function canGo(step: State["step"]): boolean {
    if (step === "upload") return true;
    if (step === "profile") return Boolean(state.profile);
    if (step === "jobs") return state.rankPhase === "success" || state.rankPhase === "loading";
    return false;
  }

  const showUploadLoading =
    state.parsePhase === "loading" ||
    (state.hydratePhase === "loading" && state.step === "upload" && !state.profile);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav onTryDemo={scrollToDemo} />
      <Hero onUploadClick={scrollToDemo} />
      <HowItWorks />

      <section
        id="demo"
        ref={demoRef}
        className="mx-auto mb-[120px] max-w-[1160px] px-6 md:px-8"
      >
        <div className="brutal-card-lg grid grid-cols-1 md:grid-cols-[200px_1fr]">
          <aside className="flex flex-col gap-1.5 border-b-2 border-ink bg-surface-alt p-5 md:border-r-2 md:border-b-0">
            <div className="mono-label mb-2.5">Live demo</div>
            {STEP_PILLS.map((pill) => {
              const active = state.step === pill.key;
              const enabled = canGo(pill.key);
              return (
                <button
                  key={pill.key}
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && dispatch({ type: "SET_STEP", step: pill.key })}
                  className={`border-2 px-3 py-2.5 text-left text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-ink bg-card text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
            {state.step !== "upload" && (
              <button
                type="button"
                onClick={handleRestart}
                className="mt-3 border-2 border-ink bg-transparent px-3 py-2 text-left text-xs font-bold text-muted-foreground"
              >
                Start over
              </button>
            )}
          </aside>

          <div className="bg-card p-6 md:p-8">
            {state.step === "upload" && (
              <>
                {showUploadLoading ? (
                  <LoadingState
                    messages={
                      state.hydratePhase === "loading"
                        ? ["Restoring your saved resume…"]
                        : PARSE_MESSAGES
                    }
                  />
                ) : (
                  <>
                    {state.parsePhase === "error" && state.parseError && (
                      <div className="mb-4">
                        <ErrorState message={state.parseError} />
                      </div>
                    )}
                    <PdfDropzone
                      onFileSelected={handleFileSelected}
                      onUseSample={handleUseSample}
                    />
                  </>
                )}
              </>
            )}

            {state.step === "profile" && state.profile && (
              <ProfileAndHealthCheck profile={state.profile} onContinue={runRank} />
            )}

            {state.step === "jobs" && (
              <>
                {state.rankPhase === "error" && state.rankError ? (
                  <ErrorState message={state.rankError} onRetry={runRank} />
                ) : (
                  <JobList
                    jobs={state.ranked}
                    loading={state.rankPhase === "loading"}
                    totalCount={state.totalJobCount || initialJobs.length}
                    onTailor={(job) => {
                      dispatch({ type: "SELECT_JOB", job });
                      runTailor(job);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <TailorPanel
        profile={state.profile}
        job={state.selectedJob}
        status={state.tailorPhase}
        tailored={state.tailored}
        error={state.tailorError}
        onClose={() => dispatch({ type: "CLOSE_TAILOR" })}
        onRetry={() => state.selectedJob && runTailor(state.selectedJob)}
      />
    </div>
  );
}
