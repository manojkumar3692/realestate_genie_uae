import OpenAI from "openai";

/**
 * Thin provider abstraction so the app is never hardwired to one LLM vendor.
 * Every AI-assisted feature (column mapping fallback, note extraction, match
 * explanations, outreach generation) goes through `completeJson`, never
 * calls the OpenAI SDK directly. Swapping providers means implementing this
 * interface once, not touching every call site.
 *
 * When no API key is configured, `configured` is false and every call
 * resolves to `null` — every caller in this codebase treats `null` as "fall
 * back to the deterministic/templated result," so the app is fully
 * functional (just less nuanced) without an AI key.
 */
export interface AiCompleteJsonParams {
  system: string;
  user: string;
  /** Rough cap to keep batched calls bounded/cheap. */
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  readonly configured: boolean;
  readonly name: string;
  completeJson<T>(params: AiCompleteJsonParams): Promise<T | null>;
}

class NoopProvider implements AiProvider {
  readonly configured = false;
  readonly name = "none";
  async completeJson<T>(): Promise<T | null> {
    return null;
  }
}

class OpenAiProvider implements AiProvider {
  readonly configured = true;
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async completeJson<T>(params: AiCompleteJsonParams): Promise<T | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxOutputTokens ?? 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      });
      const text = response.choices[0]?.message?.content;
      if (!text) return null;
      return JSON.parse(text) as T;
    } catch (err) {
      // AI is always an enhancement layer in this app — never let a
      // provider failure break the deterministic pipeline it sits on top of.
      console.error(`[ai:${this.name}] completeJson failed:`, err instanceof Error ? err.message : err);
      return null;
    }
  }
}

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  cached = apiKey
    ? new OpenAiProvider(apiKey, process.env.OPENAI_MODEL || "gpt-4o-mini")
    : new NoopProvider();
  return cached;
}
