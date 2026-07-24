"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RankedJob, ResumeProfile, ResumePdfData, TailorResponse } from "@/lib/schemas";

// Every original bullet gets shown — tailored where the LLM covered it (matched
// by exact original text, which the tailor prompt requires it to echo verbatim),
// otherwise kept as-is so nothing from the resume is lost in the download.
function buildResumePdfData(profile: ResumeProfile, job: RankedJob, tailored: TailorResponse): ResumePdfData {
  const tailoredByOriginal = new Map(tailored.tailoredBullets.map((b) => [b.original, b.tailored]));

  return {
    name: profile.name,
    contact: profile.contact,
    tailoredSummary: tailored.tailoredSummary,
    skills: profile.skills,
    education: profile.education,
    experience: profile.workExperience.map((exp) => ({
      company: exp.company,
      title: exp.title,
      bullets: exp.bullets.map((bullet) => tailoredByOriginal.get(bullet) ?? bullet),
    })),
    targetJobLabel: `Tailored for ${job.position} at ${job.company}`,
  };
}

export function DownloadButton({
  profile,
  job,
  tailored,
}: {
  profile: ResumeProfile;
  job: RankedJob;
  tailored: TailorResponse;
}) {
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  async function handleDownload() {
    setStatus("generating");
    try {
      const res = await fetch("/api/download-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildResumePdfData(profile, job, tailored)),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-tailored-${job.company.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="gap-2" onClick={handleDownload} disabled={status === "generating"}>
        {status === "generating" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {status === "generating" ? "Generating PDF…" : "Download tailored resume (PDF)"}
      </Button>
      {status === "error" && (
        <p className="text-sm text-destructive">Couldn&apos;t generate the PDF — try again.</p>
      )}
    </div>
  );
}
