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
        <h3 className="mb-2 text-sm font-extrabold text-text-faint">Suggested summary (preview only)</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Shown here for context — not included on the one-page PDF.
        </p>
        <p className="border-2 border-ink bg-surface-alt p-3.5 text-sm leading-relaxed">
          {tailored.tailoredSummary}
        </p>
      </section>

      {skillsChanged && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-extrabold text-text-faint">Technical skills</h3>
          <p className="text-sm text-text-faint line-through">{profile.skills.join(", ")}</p>
          <p className="border-2 border-ink bg-score-high-bg p-2 text-sm font-medium text-score-high">
            {tailored.tailoredSkills.join(", ")}
          </p>
          {tailored.skillsReason && (
            <p className="text-xs text-muted-foreground">{tailored.skillsReason}</p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold text-text-faint">Tailored bullets</h3>
        {tailored.tailoredBullets.map((b, i) => (
          <div key={i} className="flex flex-col gap-1.5 border-2 border-ink p-3">
            <p className="text-sm text-text-faint line-through">{b.original}</p>
            <p className="border border-ink bg-score-high-bg p-2 text-sm text-score-high">{b.tailored}</p>
            <p className="text-xs text-muted-foreground">{b.reason}</p>
          </div>
        ))}
      </section>

      {tailored.projectOrder.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-extrabold text-text-faint">Kept resume projects</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {tailored.projectOrder.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ol>
        </section>
      )}

      {tailored.removedProjects.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-extrabold text-text-faint">Projects removed</h3>
          {tailored.removedProjects.map((p, i) => (
            <div key={i} className="border-2 border-ink p-3">
              <p className="text-sm font-bold line-through decoration-text-faint">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.reason}</p>
            </div>
          ))}
        </section>
      )}

      {tailored.tailoredProjects.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-text-faint">Tailored projects</h3>
          {tailored.tailoredProjects.map((project, pi) => (
            <div key={pi} className="flex flex-col gap-2 border-2 border-ink p-3">
              <p className="text-sm font-bold">{project.name}</p>
              {project.bullets.map((b, bi) => (
                <div key={bi} className="flex flex-col gap-1.5">
                  <p className="text-sm text-text-faint line-through">{b.original}</p>
                  <p className="border border-ink bg-score-high-bg p-2 text-sm text-score-high">
                    {b.tailored}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.reason}</p>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {tailored.addedGithubProjects.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-text-faint">
            From GitHub (replacing weaker resume projects)
          </h3>
          {tailored.addedGithubProjects.map((project, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-2 border-ink border-brand/40 p-3">
              <p className="text-sm font-bold">{project.name}</p>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand underline underline-offset-2"
              >
                {project.url}
              </a>
              {project.technologies.length > 0 && (
                <p className="text-xs text-muted-foreground">{project.technologies.join(" · ")}</p>
              )}
              <ul className="list-disc space-y-1 pl-4">
                {project.bullets.map((bullet, bi) => (
                  <li key={bi} className="text-sm">
                    {bullet}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{project.reason}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
