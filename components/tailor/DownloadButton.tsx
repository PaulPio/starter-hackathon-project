"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project, RankedJob, ResumeProfile, ResumePdfData, TailorResponse } from "@/lib/schemas";

const MAX_GITHUB_PROJECTS_ON_PDF = 1;
const MAX_BULLETS_PER_ROLE = 4;
const MAX_BULLETS_PER_PROJECT = 2;

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function mergeResumeProjects(profile: ResumeProfile, tailored: TailorResponse): Project[] {
  const byName = new Map(profile.projects.map((p) => [normalizeName(p.name), p] as const));
  const tailoredByName = new Map(
    tailored.tailoredProjects.map((p) => [normalizeName(p.name), p] as const)
  );

  const order =
    tailored.projectOrder.length > 0
      ? tailored.projectOrder
      : profile.projects.map((p) => p.name);

  const fromResume: Project[] = [];
  const seen = new Set<string>();
  for (const name of order) {
    const key = normalizeName(name);
    const project = byName.get(key);
    if (!project || seen.has(key)) continue;
    seen.add(key);

    const tailoredProject = tailoredByName.get(key);
    if (!tailoredProject) {
      fromResume.push({
        ...project,
        url: null,
        bullets: project.bullets.slice(0, MAX_BULLETS_PER_PROJECT),
      });
      continue;
    }
    const tailoredByOriginal = new Map(
      tailoredProject.bullets.map((b) => [b.original, b.tailored] as const)
    );
    fromResume.push({
      name: project.name,
      url: null,
      technologies: project.technologies,
      bullets: project.bullets
        .map((bullet) => tailoredByOriginal.get(bullet) ?? bullet)
        .slice(0, MAX_BULLETS_PER_PROJECT),
    });
  }

  const fromGithub: Project[] = tailored.addedGithubProjects.slice(0, MAX_GITHUB_PROJECTS_ON_PDF).map((p) => ({
    name: p.name,
    url: null,
    bullets: p.bullets.slice(0, MAX_BULLETS_PER_PROJECT),
    technologies: p.technologies.slice(0, 4),
  }));

  return [...fromResume, ...fromGithub];
}

function mergeSkills(profile: ResumeProfile, tailored: TailorResponse): string[] {
  if (tailored.tailoredSkills.length === 0) return profile.skills;
  const allowed = new Map(profile.skills.map((s) => [s.trim().toLowerCase(), s] as const));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const skill of tailored.tailoredSkills) {
    const canonical = allowed.get(skill.trim().toLowerCase());
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out.length > 0 ? out : profile.skills;
}

// Prefer near-identical content to the uploaded resume: same roles, lightly tailored
// bullets, optional project reorder/drop + skills reorder/drop. Summary is UI-only.
function buildResumePdfData(profile: ResumeProfile, job: RankedJob, tailored: TailorResponse): ResumePdfData {
  const tailoredByOriginal = new Map(tailored.tailoredBullets.map((b) => [b.original, b.tailored]));

  return {
    name: profile.name,
    contact: profile.contact,
    tailoredSummary: "",
    skills: mergeSkills(profile, tailored),
    education: profile.education,
    experience: profile.workExperience.map((exp) => ({
      company: exp.company,
      title: exp.title,
      bullets: exp.bullets
        .map((bullet) => tailoredByOriginal.get(bullet) ?? bullet)
        .slice(0, MAX_BULLETS_PER_ROLE),
    })),
    projects: mergeResumeProjects(profile, tailored),
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
