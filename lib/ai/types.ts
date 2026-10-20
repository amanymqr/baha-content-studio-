import type { NewsItem, Translation } from "../news/types";

// Contract between the app and any AI provider. Pages and actions only use these
// types and the functions in ./index, never a provider SDK directly, so a provider
// can be added or swapped without touching the UI.

export type AiTask = "translate" | "marketImpact" | "arabicExplanation" | "reelScript" | "carousel" | "hooks" | "marketingCopy";

/** Every task, in the order the UI lists them. */
export const AI_TASKS: AiTask[] = ["marketImpact", "arabicExplanation", "reelScript", "carousel", "hooks", "marketingCopy", "translate"];

export type ContentLang = "ar" | "en";

export type StoryInput = { item: NewsItem; keyFacts: string[] };

export type MarketImpact = { summary: string; buyers: string; sellers: string; uncertainties: string[]; lang: ContentLang };
export type ReelScript = { hook: string; beats: string[]; cta: string; lang: ContentLang };
export type CarouselSlides = { slides: { title: string; body: string }[]; lang: ContentLang };

export interface AiProvider {
  readonly id: string;
  /** Tasks this provider has implemented. Anything else reports as unavailable. */
  readonly tasks: ReadonlySet<AiTask>;
  translate(item: NewsItem): Promise<Translation>;
  marketImpact?(input: StoryInput, lang: ContentLang): Promise<MarketImpact>;
  arabicExplanation?(input: StoryInput): Promise<string>;
  reelScript?(input: StoryInput & { angle: string }, lang: ContentLang): Promise<ReelScript>;
  carousel?(input: StoryInput & { angle: string }, lang: ContentLang): Promise<CarouselSlides>;
  hooks?(input: StoryInput & { angle: string }, lang: ContentLang): Promise<string[]>;
  marketingCopy?(input: StoryInput & { angle: string }, lang: ContentLang): Promise<string>;
}

export type AiStatus = { enabled: false; reason: "disabled" | "missing_key" } | { enabled: true; provider: string; tasks: AiTask[] };

/** Error codes the UI can translate. */
export class AiError extends Error {}
