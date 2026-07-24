export function Hero({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <section className="mx-auto grid max-w-[1160px] items-center gap-12 px-6 py-16 md:grid-cols-2 md:px-8 md:py-16">
      <div className="flex flex-col gap-[22px]">
        <span className="inline-block self-start bg-ink px-2.5 py-1.5 font-mono text-[11px] font-extrabold tracking-[0.05em] text-background">
          POWERED BY GEMMA — 160+ LIVE POSTINGS
        </span>
        <h1 className="m-0 text-[clamp(36px,5.2vw,58px)] font-black leading-[1.08] tracking-[-0.03em]">
          Stop guessing.
          <br />
          Start{" "}
          <span className="border-b-[6px] border-brand">tailoring.</span>
        </h1>
        <p className="m-0 max-w-[480px] text-[16.5px] leading-relaxed text-muted-foreground">
          Upload your resume, get an honest health check, and see it ranked against real internship
          postings — then tailor it to the one you want.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <button
            type="button"
            onClick={onUploadClick}
            className="brutal-press border-2 border-ink bg-brand px-[26px] py-3.5 text-[15px] font-bold text-white shadow-hard"
          >
            Upload your resume
          </button>
          <a
            href="#how"
            className="border-2 border-ink px-[22px] py-3.5 text-[15px] font-bold text-foreground no-underline"
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="brutal-card-lg bg-card p-6">
        <div className="mono-label mb-4">The pipeline</div>
        <div className="flex flex-col">
          {[
            { n: "1", title: "Upload & extract", sub: "Structured profile + health check", active: false },
            { n: "2", title: "Rank against listings", sub: "Evidence-backed fit scores", active: false },
            { n: "3", title: "Tailor & download", sub: "Rewritten bullets, shown as a diff", active: true },
          ].map((step, i) => (
            <div key={step.n} className={`flex gap-3.5 ${i < 2 ? "pb-[18px]" : ""}`}>
              <div
                className={`flex size-7 shrink-0 items-center justify-center border-2 border-ink text-[13px] font-extrabold ${
                  step.active ? "bg-brand text-white" : "text-foreground"
                }`}
              >
                {step.n}
              </div>
              <div>
                <p className="m-0 text-sm font-bold">{step.title}</p>
                <p className="mt-1 m-0 text-[12.5px] text-muted-foreground">{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
