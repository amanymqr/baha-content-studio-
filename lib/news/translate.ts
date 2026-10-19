import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { NewsItem, Translation } from "./types";

const MODEL = "claude-opus-5-5";

export const translationAvailable = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const Output = z.object({
  title_ar: z.string(),
  summary_ar: z.string(),
});

const SYSTEM = `You translate and summarize official Canadian real estate and economic news into Arabic for a Toronto real estate content team.

Rules:
- Use only facts present in the source text. Do not add context, causes, forecasts or numbers that are not in it.
- Keep every number, percentage, dollar amount, date and proper name exactly as written. Write digits as Western digits (0-9).
- Keep organization names and abbreviations in English where they are commonly used that way (TRREB, CMHC, GTA, CPI).
- Write clear, natural, easy Arabic for a non-specialist reader, not a word-for-word translation.
- title_ar: one line. summary_ar: two to four short sentences.
- If the source text is too short to summarize, translate it as-is without padding.`;

export class TranslationError extends Error {}

export async function translateItem(item: NewsItem): Promise<Translation> {
  if (!translationAvailable()) throw new TranslationError("missing_key");
  const client = new Anthropic();
  const source = [`Title: ${item.title}`, `Publisher: ${item.publisher}`, item.publishedAt && `Published: ${item.publishedAt}`, `Text: ${item.body || item.summary}`]
    .filter(Boolean)
    .join("\n");
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: source }],
      output_config: { effort: "low", format: zodOutputFormat(Output) },
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) throw new TranslationError("no_output");
    return { titleAr: res.parsed_output.title_ar.trim(), summaryAr: res.parsed_output.summary_ar.trim(), model: MODEL, createdAt: new Date().toISOString() };
  } catch (e) {
    if (e instanceof TranslationError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new TranslationError("bad_key");
    if (e instanceof Anthropic.RateLimitError) throw new TranslationError("rate_limited");
    if (e instanceof Anthropic.APIConnectionError) throw new TranslationError("unreachable");
    if (e instanceof Anthropic.APIError) throw new TranslationError(`api_${e.status}`);
    throw e;
  }
}
