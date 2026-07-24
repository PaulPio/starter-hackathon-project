import { ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RankedJob } from "@/lib/schemas";

function scoreColor(score: number | null): string {
  if (score === null) return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  if (score >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (score >= 50) return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400";
}

export function JobCard({ job, onTailor }: { job: RankedJob; onTailor: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium leading-tight">{job.position}</p>
            <p className="text-sm text-zinc-500">
              {job.company} · {job.location}
              {job.salary ? ` · ${job.salary}` : ""}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${scoreColor(job.fitScore)}`}
          >
            {job.fitScore ?? "—"}
          </span>
        </div>

        {job.why && <p className="text-sm text-zinc-700 dark:text-zinc-300">{job.why}</p>}

        {job.matchedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.matchedSkills.map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Posted {job.age} ago</span>
          <div className="flex gap-2">
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm", variant: "ghost", className: "gap-1.5" })}
            >
              Apply <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Button size="sm" className="gap-1.5" onClick={onTailor}>
              <Sparkles className="h-3.5 w-3.5" />
              Tailor
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
