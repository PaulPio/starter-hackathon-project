"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { JobCard } from "./JobCard";
import type { RankedJob } from "@/lib/schemas";

const LOADING_MESSAGES = [
  "Comparing you against real internship listings…",
  "Scoring your best matches…",
  "Ranking by fit…",
];

type FilterKey = "all" | "high" | "remote" | "ai";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "high", label: "High Match (>80)" },
  { key: "remote", label: "Remote" },
  { key: "ai", label: "AI/ML" },
];

function isRemote(job: RankedJob): boolean {
  return /remote/i.test(job.location);
}

function isAi(job: RankedJob): boolean {
  const hay = `${job.position} ${job.category}`.toLowerCase();
  return /ai|ml|machine learning|research scientist/.test(hay);
}

export function JobList({
  jobs,
  loading,
  totalCount,
  onTailor,
}: {
  jobs: RankedJob[];
  loading: boolean;
  totalCount: number;
  onTailor: (job: RankedJob) => void;
}) {
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    let list = jobs;
    if (filterKey === "high") list = list.filter((j) => (j.fitScore ?? 0) >= 80);
    else if (filterKey === "remote") list = list.filter(isRemote);
    else if (filterKey === "ai") list = list.filter(isAi);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          j.position.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, query, filterKey]);

  if (loading) {
    return <LoadingState messages={LOADING_MESSAGES} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 border-2 border-ink bg-card px-3.5 py-2.5">
        <Search className="size-4 shrink-0 text-text-faint" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, company, or location…"
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-text-faint"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((fp) => {
          const active = filterKey === fp.key;
          return (
            <button
              key={fp.key}
              type="button"
              onClick={() => setFilterKey(fp.key)}
              className={`border-2 border-ink px-3 py-1.5 text-[12.5px] font-bold ${
                active ? "bg-brand text-white" : "bg-card text-foreground"
              }`}
            >
              {fp.label}
            </button>
          );
        })}
      </div>

      <p className="m-0 text-[12.5px] text-text-faint">
        Showing {filtered.length} of {totalCount} recent postings
      </p>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No matches for that filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((job, i) => (
            <JobCard
              key={job.id}
              job={job}
              featured={i === 0 && !query && filterKey === "all"}
              onTailor={() => onTailor(job)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
