"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RankedJob, TailorResponse } from "@/lib/schemas";

function buildMarkdown(job: RankedJob, tailored: TailorResponse): string {
  const bullets = tailored.tailoredBullets.map((b) => `- ${b.tailored}`).join("\n");
  return `# Tailored for ${job.position} at ${job.company}\n\n## Summary\n${tailored.tailoredSummary}\n\n## Experience\n${bullets}\n`;
}

export function DownloadButton({ job, tailored }: { job: RankedJob; tailored: TailorResponse }) {
  function handleDownload() {
    const blob = new Blob([buildMarkdown(job, tailored)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-tailored-${job.company.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button className="gap-2" onClick={handleDownload}>
      <Download className="h-4 w-4" />
      Download tailored resume
    </Button>
  );
}
