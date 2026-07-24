import { z } from "zod";
import type OpenAI from "openai";
import { openrouter } from "./openrouter";
import { GEMMA_MODEL_ID } from "./config";

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export class LLMStructuredOutputError extends Error {
  constructor(public raw: string, public validationError: string) {
    super("Gemma failed to return valid structured JSON after retries");
    this.name = "LLMStructuredOutputError";
  }
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "status" in e && (e as { status: unknown }).status === 429;
}

// Rate-limit retry is a separate concern from the JSON-repair retry above: a
// 429 means the request never produced a completion at all (nothing to
// repair), so it gets its own short backoff loop.
async function createCompletionWithBackoff(params: ChatParams, options: { timeout: number }) {
  const delays = [1000, 3000, 8000];
  for (let i = 0; ; i++) {
    try {
      return await openrouter.chat.completions.create(params, options);
    } catch (e) {
      if (isRateLimitError(e) && i < delays.length) {
        await sleep(delays[i]);
        continue;
      }
      throw e;
    }
  }
}

// Gemma-via-OpenRouter does not reliably honor response_format/JSON-mode/tool-use
// structured output (confirmed failures on all three strategies). This never
// depends on that — the schema is communicated as prompt text, the response is
// parsed as plain text, and invalid output triggers a bounded repair retry that
// feeds the validation error back to the model.
export async function getStructuredJSON<T>(opts: {
  schema: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxRepairAttempts?: number; // default 1 — keep low to protect serverless time budgets
  timeoutMs?: number;
}): Promise<T> {
  const jsonSchema = z.toJSONSchema(opts.schema);
  const baseSystem = `${opts.systemPrompt}

You must output ONLY a single valid JSON value matching this JSON Schema, with no prose, no markdown code fences, and no commentary before or after it:
${JSON.stringify(jsonSchema)}`;

  let lastRaw = "";
  let lastError = "";
  const attempts = 1 + (opts.maxRepairAttempts ?? 1);

  for (let i = 0; i < attempts; i++) {
    const repairNote =
      i === 0
        ? ""
        : `\n\nYour previous output was invalid JSON or did not match the schema.
Previous output:
${lastRaw}
Validation error:
${lastError}
Return ONLY the corrected JSON value, nothing else.`;

    const res = await createCompletionWithBackoff(
      {
        model: GEMMA_MODEL_ID,
        temperature: opts.temperature ?? 0.2,
        messages: [
          { role: "system", content: baseSystem },
          { role: "user", content: opts.userPrompt + repairNote },
        ],
        // OpenRouter-specific extension (not in the OpenAI SDK's types): prefer
        // paid providers over the free "Google AI Studio" route, which is
        // aggressively rate-limited. `allow_fallbacks: true` means this is a
        // preference, not a hard exclusion — account-level privacy settings
        // still ultimately decide which providers are eligible.
        ...({
          provider: { order: ["CoreWeave", "OpenInference"], allow_fallbacks: true },
        } as object),
      } as ChatParams,
      { timeout: opts.timeoutMs ?? 20_000 }
    );

    if (process.env.LLM_DEBUG) {
      console.error("[llm debug] provider:", (res as unknown as { provider?: string }).provider);
    }
    lastRaw = res.choices[0]?.message?.content ?? "";
    const cleaned = stripCodeFence(lastRaw);

    try {
      const parsed = JSON.parse(cleaned);
      const result = opts.schema.safeParse(parsed);
      if (result.success) return result.data;
      lastError = result.error.message;
    } catch (e) {
      lastError = String(e);
    }
  }

  throw new LLMStructuredOutputError(lastRaw, lastError);
}
