import type { ResumeProfile, TailorResponse } from "@/lib/schemas";

export function ResumeDiffView({
  tailored,
  profile,
}: {
  tailored: TailorResponse;
  profile: ResumeProfile;
}) {
  const skillsChanged =
    tailored.tailoredSkills.length > 0 &&
    tailored.tailoredSkills.join("|").toLowerCase() !== profile.skills.join("|").toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-500">Suggested summary (preview only)</h3>
        <p className="mb-2 text-xs text-zinc-500">
          Shown here for context — not included on the one-page PDF, so the download stays closer to
          your base resume.
        </p>
        <p className="rounded-md bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
          {tailored.tailoredSummary}
        </p>
      </section>

      {skillsChanged && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">Technical skills</h3>
          <p className="text-sm text-zinc-500 line-through decoration-zinc-300">
            {profile.skills.join(", ")}
          </p>
          <p className="rounded bg-emerald-50 p-2 text-sm dark:bg-emerald-950/40">
            {tailored.tailoredSkills.join(", ")}
          </p>
          {tailored.skillsReason && (
            <p className="text-xs text-zinc-500">{tailored.skillsReason}</p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-zinc-500">Tailored bullets</h3>
        {tailored.tailoredBullets.map((b, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-md border p-3">
            <p className="text-sm text-zinc-500 line-through decoration-zinc-300">{b.original}</p>
            <p className="rounded bg-emerald-50 p-2 text-sm dark:bg-emerald-950/40">{b.tailored}</p>
            <p className="text-xs text-zinc-500">{b.reason}</p>
          </div>
        ))}
      </section>

      {tailored.projectOrder.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">Project order on PDF</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {tailored.projectOrder.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ol>
        </section>
      )}

      {tailored.removedProjects.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">Projects removed</h3>
          {tailored.removedProjects.map((p, i) => (
            <div key={i} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-medium line-through decoration-zinc-400">{p.name}</p>
              <p className="text-xs text-zinc-500">{p.reason}</p>
            </div>
          ))}
        </section>
      )}

      {tailored.tailoredProjects.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-500">Tailored projects</h3>
          {tailored.tailoredProjects.map((project, pi) => (
            <div key={pi} className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">{project.name}</p>
              {project.bullets.map((b, bi) => (
                <div key={bi} className="flex flex-col gap-1.5">
                  <p className="text-sm text-zinc-500 line-through decoration-zinc-300">{b.original}</p>
                  <p className="rounded bg-emerald-50 p-2 text-sm dark:bg-emerald-950/40">{b.tailored}</p>
                  <p className="text-xs text-zinc-500">{b.reason}</p>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {tailored.addedGithubProjects.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-500">Added from GitHub</h3>
          {tailored.addedGithubProjects.map((project, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-md border border-emerald-200 p-3 dark:border-emerald-900"
            >
              <p className="text-sm font-medium">{project.name}</p>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 underline underline-offset-2"
              >
                {project.url}
              </a>
              {project.technologies.length > 0 && (
                <p className="text-xs text-zinc-500">{project.technologies.join(" · ")}</p>
              )}
              <ul className="list-disc space-y-1 pl-4">
                {project.bullets.map((bullet, bi) => (
                  <li key={bi} className="text-sm">
                    {bullet}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500">{project.reason}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
