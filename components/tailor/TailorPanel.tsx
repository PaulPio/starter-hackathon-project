"use client";

import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { DownloadButton } from "./DownloadButton";
import { ResumeDiffView } from "./ResumeDiffView";
import type { RankedJob, ResumeProfile, TailorResponse } from "@/lib/schemas";

const LOADING_MESSAGES = [
  "Checking your GitHub…",
  "Reading the listing…",
  "Rewriting your bullets…",
  "Polishing the summary…",
];

export function TailorPanel({
  profile,
  job,
  status,
  tailored,
  error,
  onClose,
  onRetry,
}: {
  profile: ResumeProfile | null;
  job: RankedJob | null;
  status: "idle" | "loading" | "success" | "error";
  tailored: TailorResponse | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (!job) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/55"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="flex h-full w-full max-w-[520px] flex-col gap-[22px] overflow-y-auto border-l-2 border-ink bg-card p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tailor-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-extrabold tracking-wide text-brand">
              TAILORED RESUME
            </span>
            <h3 id="tailor-title" className="mt-1.5 m-0 text-[19px] font-extrabold">
              {job.position.split(" - ")[0].split(" — ")[0]} at {job.company}
            </h3>
            <p className="mt-2 m-0 text-[13.5px] text-muted-foreground">
              Light edits toward this listing&apos;s title, company &amp; location. GitHub repos may
              replace weaker projects when they fit better.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center border-2 border-ink bg-transparent text-base text-foreground"
          >
            ×
          </button>
        </div>

        {status === "loading" && <LoadingState messages={LOADING_MESSAGES} />}
        {status === "error" && (
          <ErrorState message={error ?? "Couldn't tailor this resume."} onRetry={onRetry} />
        )}
        {status === "success" && tailored && profile && (
          <div className="flex flex-col gap-6">
            <ResumeDiffView tailored={tailored} profile={profile} />
            <DownloadButton profile={profile} job={job} tailored={tailored} />
          </div>
        )}
      </aside>
    </div>
  );
}
