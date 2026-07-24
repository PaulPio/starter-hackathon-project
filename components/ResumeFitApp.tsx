"use client";

import { useReducer } from "react";
import { PdfDropzone } from "@/components/upload/PdfDropzone";
import { ProfileAndHealthCheck } from "@/components/profile/ProfileAndHealthCheck";
import { JobList } from "@/components/jobs/JobList";
import { TailorPanel } from "@/components/tailor/TailorPanel";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { JobListing, RankedJob, ResumeProfile, TailorResponse } from "@/lib/schemas";

type AsyncPhase = "idle" | "loading" | "success" | "error";

interface State {
  step: "upload" | "profile" | "jobs";
  profile: ResumeProfile | null;
  resumeText: string | null;
  parsePhase: AsyncPhase;
  parseError: string | null;

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
  | { type: "PARSE_START" }
  | { type: "PARSE_SUCCESS"; profile: ResumeProfile; resumeText: string }
  | { type: "PARSE_ERROR"; message: string }
  | { type: "RESTART" }
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
      return initialState;
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
    default:
      return state;
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

export function ResumeFitApp({ initialJobs }: { initialJobs: JobListing[] }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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
    } catch {
      dispatch({ type: "PARSE_ERROR", message: "Couldn't reach the server. Check your connection and try again." });
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
    if (!state.profile) return;
    dispatch({ type: "RANK_START" });
    try {
      const res = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: state.profile }),
      });
      if (!res.ok) {
        dispatch({ type: "RANK_ERROR", message: "Couldn't rank internships against your profile." });
        return;
      }
      const data = await res.json();
      dispatch({ type: "RANK_SUCCESS", ranked: data.ranked, totalCount: data.totalCount });
    } catch {
      dispatch({ type: "RANK_ERROR", message: "Couldn't reach the server. Check your connection and try again." });
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
        dispatch({ type: "TAILOR_ERROR", message: "Couldn't tailor your resume for this listing — please try again." });
        return;
      }
      const data = await res.json();
      dispatch({ type: "TAILOR_SUCCESS", tailored: data });
    } catch {
      dispatch({ type: "TAILOR_ERROR", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">ResumeFit</h1>
        <p className="text-zinc-500">
          Upload your resume, get an honest health check, and see real internships ranked to fit
          you — built for students without a curated pipeline of leads.
        </p>
      </header>

      {state.step === "upload" && (
        <>
          {state.parsePhase === "loading" ? (
            <LoadingState messages={PARSE_MESSAGES} />
          ) : (
            <>
              {state.parsePhase === "error" && state.parseError && (
                <ErrorState message={state.parseError} />
              )}
              <PdfDropzone onFileSelected={handleFileSelected} onUseSample={handleUseSample} />
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

      <TailorPanel
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
