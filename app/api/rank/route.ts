import { NextResponse } from "next/server";
import { getJobs } from "@/lib/jobs-source";
import { rankJobs } from "@/lib/rank";
import { ResumeProfileSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ResumeProfileSchema.safeParse(body?.profile);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }

  const { jobs } = await getJobs();
  const ranked = await rankJobs(parsed.data, jobs);

  return NextResponse.json({ ranked, consideredCount: ranked.length, totalCount: jobs.length });
}
