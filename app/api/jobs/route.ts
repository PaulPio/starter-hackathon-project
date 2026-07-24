import { NextResponse } from "next/server";
import { getJobs } from "@/lib/jobs-source";

export const runtime = "nodejs";

export async function GET() {
  const { jobs, source } = await getJobs();
  return NextResponse.json({ jobs, source, fetchedAt: new Date().toISOString() });
}
