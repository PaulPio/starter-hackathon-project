import { NextResponse } from "next/server";
import { LLMStructuredOutputError } from "@/lib/llm";
import { JobListingSchema, ResumeProfileSchema } from "@/lib/schemas";
import { tailorResume } from "@/lib/tailor";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  profile: ResumeProfileSchema,
  resumeText: z.string(),
  job: JobListingSchema,
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const tailored = await tailorResume(parsed.data.profile, parsed.data.resumeText, parsed.data.job);
    return NextResponse.json(tailored);
  } catch (e) {
    if (e instanceof LLMStructuredOutputError) {
      return NextResponse.json(
        { error: "Couldn't tailor your resume for this listing — please try again." },
        { status: 502 }
      );
    }
    throw e;
  }
}
