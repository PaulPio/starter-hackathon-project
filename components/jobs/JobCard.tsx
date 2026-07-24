import type { RankedJob } from "@/lib/schemas";

function scoreStyle(score: number | null): { color: string; bg: string } {
  if (score === null) return { color: "text-muted-foreground", bg: "bg-surface-alt" };
  if (score >= 80) return { color: "text-score-high", bg: "bg-score-high-bg" };
  if (score >= 50) return { color: "text-score-mid", bg: "bg-score-mid-bg" };
  return { color: "text-muted-foreground", bg: "bg-surface-alt" };
}

export function JobCard({
  job,
  onTailor,
  featured,
}: {
  job: RankedJob;
  onTailor: () => void;
  featured?: boolean;
}) {
  const sc = scoreStyle(job.fitScore);

  return (
    <div
      className={`brutal-press flex flex-col gap-2.5 border-2 border-ink bg-card p-[18px] shadow-hard ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className="m-0 text-sm font-bold leading-snug">{job.position}</p>
          <p className="mt-1 m-0 text-[12.5px] text-muted-foreground">
            {job.company} · {job.location}
            {job.salary ? ` · ${job.salary}` : ""}
          </p>
        </div>
        <div
          className={`flex size-[38px] shrink-0 items-center justify-center border-2 border-ink text-[13px] font-extrabold tabular-nums ${sc.bg} ${sc.color}`}
        >
          {job.fitScore ?? "—"}
        </div>
      </div>

      {job.why && (
        <p className="m-0 text-[12.5px] leading-relaxed text-muted-foreground">{job.why}</p>
      )}

      {job.matchedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.matchedSkills.map((skill) => (
            <span
              key={skill}
              className="border border-ink px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-0.5 flex items-center justify-between gap-2.5">
        <span className="text-[11px] text-text-faint">Posted {job.age} ago</span>
        <div className="flex gap-2">
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-ink px-2.5 py-1.5 text-xs font-bold text-foreground no-underline"
          >
            Apply
          </a>
          <button
            type="button"
            onClick={onTailor}
            className="border-2 border-ink bg-brand px-2.5 py-1.5 text-xs font-bold text-white"
          >
            Tailor
          </button>
        </div>
      </div>
    </div>
  );
}
