import { Activity, BarChart3, Sparkles } from "lucide-react";

const CARDS = [
  {
    icon: Activity,
    title: "Honest health check",
    body: "Flags missing sections, vague bullets, and weak phrasing — framed around equity, not just optimization.",
  },
  {
    icon: BarChart3,
    title: "Ranked with evidence",
    body: "Every fit score ships with matched-skill evidence and a one-line why.",
  },
  {
    icon: Sparkles,
    title: "One-click tailoring",
    body: "Rewrites your summary and bullets for one listing, shown as a diff, ready to download.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="mx-auto grid max-w-[1160px] gap-6 px-6 pb-24 md:grid-cols-3 md:px-8"
    >
      {CARDS.map(({ icon: Icon, title, body }) => (
        <div key={title} className="brutal-card brutal-press bg-card p-7">
          <div className="mb-3.5 flex size-[38px] items-center justify-center border-2 border-ink text-brand">
            <Icon className="size-[18px]" strokeWidth={2} />
          </div>
          <h3 className="mb-2 m-0 text-[17px] font-extrabold">{title}</h3>
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      ))}
    </section>
  );
}
