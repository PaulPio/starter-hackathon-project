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
import type { RankedJob, TailorResponse } from "@/lib/schemas";

const LOADING_MESSAGES = ["Reading the listing…", "Rewriting your bullets…", "Polishing the summary…"];

export function TailorPanel({
  job,
  status,
  tailored,
  error,
  onClose,
  onRetry,
}: {
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
            Tailored to this listing&apos;s title, company &amp; location — we don&apos;t have the
            full job description, so we don&apos;t invent requirements it didn&apos;t state.
          </SheetDescription>
        </SheetHeader>

        {status === "loading" && <LoadingState messages={LOADING_MESSAGES} />}
        {status === "error" && <ErrorState message={error ?? "Couldn't tailor this resume."} onRetry={onRetry} />}
        {status === "success" && tailored && job && (
          <div className="flex flex-col gap-6">
            <ResumeDiffView tailored={tailored} />
            <DownloadButton job={job} tailored={tailored} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
