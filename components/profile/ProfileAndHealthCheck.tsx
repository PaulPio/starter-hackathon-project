import type { ResumeProfile } from "@/lib/schemas";

export function ProfileAndHealthCheck({
  profile,
  onContinue,
}: {
  profile: ResumeProfile;
  onContinue: () => void;
}) {
  const { healthCheck } = profile;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-3.5 border-2 border-ink bg-card p-5">
        <h3 className="m-0 text-base font-extrabold">{profile.name ?? "Your profile"}</h3>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <span
              key={skill}
              className="border-2 border-ink px-2.5 py-1 text-xs font-bold text-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
        {profile.targetRoles.length > 0 && (
          <p className="m-0 text-sm text-muted-foreground">
            Looks like a good fit for:{" "}
            <span className="font-bold text-foreground">{profile.targetRoles.join(", ")}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3.5 border-2 border-ink bg-card p-5">
        <h3 className="m-0 text-base font-extrabold">
          Health check: {healthCheck.overallScore}/100
        </h3>
        <div className="h-2.5 overflow-hidden border-2 border-ink">
          <div
            className="h-full bg-brand"
            style={{ width: `${Math.min(100, Math.max(0, healthCheck.overallScore))}%` }}
          />
        </div>
        <p className="m-0 text-sm text-muted-foreground">{healthCheck.summary}</p>
      </div>

      {healthCheck.weakBullets.length > 0 && (
        <div className="flex flex-col gap-2.5 border-2 border-ink bg-card p-5 md:col-span-2">
          <h4 className="mono-label m-0">Weak bullets we caught</h4>
          {healthCheck.weakBullets.slice(0, 4).map((item, i) => (
            <div key={i} className="border-l-4 border-ink bg-surface-alt px-3.5 py-2.5">
              <p className="m-0 text-[13.5px] text-text-faint line-through">{item.text}</p>
              <p className="mt-1.5 m-0 text-[13.5px] text-muted-foreground">{item.reason}</p>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="brutal-press justify-self-start border-2 border-ink bg-brand px-[22px] py-3 text-[14.5px] font-bold text-white shadow-hard md:col-span-2"
      >
        See my matches →
      </button>
    </div>
  );
}
