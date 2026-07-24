import { NextResponse } from "next/server";
import { ResumePdfDataSchema } from "@/lib/schemas";
import { generateResumePdf } from "@/lib/resume-pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ResumePdfDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const bytes = await generateResumePdf(parsed.data);
  const safeName = (parsed.data.name ?? "resume").replace(/[^a-zA-Z0-9_-]+/g, "_");

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}_Resume.pdf"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
