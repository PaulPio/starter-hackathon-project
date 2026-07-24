import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MAX_RESUME_FILE_BYTES } from "@/lib/config";
import { LLMStructuredOutputError } from "@/lib/llm";
import { extractResumeText, PdfExtractionError } from "@/lib/pdf";
import { parseResumeProfile } from "@/lib/resume";
import type { ResumeProfile } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

function fallbackProfile(): ResumeProfile {
  return {
    name: null,
    skills: [],
    experienceLevel: "student",
    education: [],
    workExperience: [],
    targetRoles: [],
    healthCheck: {
      overallScore: 0,
      missingSections: [],
      weakBullets: [],
      summary:
        "We couldn't automatically analyze this resume. Please review it manually — the job matching below will still work using general keywords.",
    },
  };
}

export async function POST(request: Request) {
  const useSample = new URL(request.url).searchParams.get("sample") === "1";

  let bytes: ArrayBuffer;
  if (useSample) {
    const buf = await readFile(path.join(process.cwd(), "data", "sample-resume.pdf"));
    bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } else {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No resume file provided." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }
    if (file.size > MAX_RESUME_FILE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (max ${Math.round(MAX_RESUME_FILE_BYTES / 1024 / 1024)}MB).` },
        { status: 400 }
      );
    }
    bytes = await file.arrayBuffer();
  }

  let resumeText: string;
  try {
    resumeText = await extractResumeText(bytes);
  } catch (e) {
    if (e instanceof PdfExtractionError) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    throw e;
  }

  try {
    const profile = await parseResumeProfile(resumeText);
    return NextResponse.json({ profile, resumeText });
  } catch (e) {
    if (e instanceof LLMStructuredOutputError) {
      // Degrade gracefully rather than 500ing — the rest of the flow can
      // still run on a minimal profile.
      return NextResponse.json({ profile: fallbackProfile(), resumeText });
    }
    throw e;
  }
}
