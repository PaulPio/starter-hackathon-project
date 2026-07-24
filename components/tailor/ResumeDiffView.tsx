import type { TailorResponse } from "@/lib/schemas";

export function ResumeDiffView({ tailored }: { tailored: TailorResponse }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-500">Suggested summary</h3>
        <p className="rounded-md bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
          {tailored.tailoredSummary}
        </p>
      </section>

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
    </div>
  );
}
