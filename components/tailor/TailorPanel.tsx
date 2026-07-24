import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  return (
    <Sheet open={job !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>{job ? `${job.position} at ${job.company}` : "Tailor resume"}</SheetTitle>
          <SheetDescription>
            Light edits to your existing one-page resume toward this listing&apos;s title, company
            &amp; location. Bullets stay faithful; projects may be reordered or dropped, and skills
            reordered or trimmed — never invented. Optional public GitHub adds are capped at one.
          </SheetDescription>
        </SheetHeader>

        {status === "loading" && <LoadingState messages={LOADING_MESSAGES} />}
        {status === "error" && <ErrorState message={error ?? "Couldn't tailor this resume."} onRetry={onRetry} />}
        {status === "success" && tailored && job && profile && (
          <div className="flex flex-col gap-6">
            <ResumeDiffView tailored={tailored} profile={profile} />
            <DownloadButton profile={profile} job={job} tailored={tailored} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
