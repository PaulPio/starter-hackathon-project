"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/shared/LoadingState";
import { JobCard } from "./JobCard";
import type { RankedJob } from "@/lib/schemas";

const LOADING_MESSAGES = [
  "Comparing you against real internship listings…",
  "Scoring your best matches…",
  "Ranking by fit…",
];

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.position.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <LoadingState messages={LOADING_MESSAGES} />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Filter by title, company, or location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <p className="shrink-0 text-sm text-zinc-500">
          Top {jobs.length} of {totalCount} recent postings
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">No matches for that filter.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onTailor={() => onTailor(job)} />
          ))}
        </div>
      )}
    </div>
  );
}
