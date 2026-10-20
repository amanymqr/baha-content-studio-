import type { Bi, Category } from "../analysis/score";
import type { Location, SourceId } from "../news/types";

export type StudioAudience = "arab" | "buyers" | "sellers" | "investors" | "residents";
export type DraftFormat = "reel" | "carousel";
export type DraftLang = "ar" | "en";
export type DraftLanguage = DraftLang | "both";
/** Workflow order. "ready" means ready to export; drafts saved before step 5 used it for "ready to publish". */
export type DraftStatus = "draft" | "review" | "changes" | "approved" | "ready";
export type ReelDuration = 30 | 45 | 60;

/** fact = taken from the source; explain = general explanation or framing; cta = call to action. */
export type Kind = "fact" | "explain" | "cta";

export type ReelSegment = {
  start: number;
  end: number;
  label: string;
  voiceover: string;
  onScreen: string;
  shot: string;
  kind: Kind;
  /** Reviewer note, never part of copied or published text. */
  note?: string;
};

export type Slide = {
  title: string;
  body: string;
  visual: string;
  highlight: string;
  kind: Kind;
  note?: string;
};

/** One language version of a draft. Reels use segments, carousels use slides. */
export type DraftContent = {
  title: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string;
  segments?: ReelSegment[];
  slides?: Slide[];
};

/** A copy of the story at the time the draft was made, so the draft keeps its source even if the story ages out. */
export type StorySnapshot = {
  id: string;
  title: string;
  titleAr?: string;
  summaryAr?: string;
  publisher: string;
  sourceId: SourceId;
  sourceName: Bi;
  url: string;
  publishedAt: string | null;
  summary: string;
  facts: string[];
  category: Category;
  location: Location;
};

export type DraftOptions = {
  format: DraftFormat;
  audience: StudioAudience;
  language: DraftLanguage;
  duration: ReelDuration;
  slideCount: number;
  angleId?: string;
};

export type HistoryAction = "created" | "edited" | "status" | "regenerated" | "duplicated";

/** One line of a draft's change log. Kept short: who, when, what, and the status it moved to. */
export type HistoryEntry = { at: string; by: string; action: HistoryAction; status?: DraftStatus };

export type Draft = DraftOptions & {
  id: string;
  status: DraftStatus;
  story: StorySnapshot;
  content: Partial<Record<DraftLang, DraftContent>>;
  /** Which template variant produced the content. */
  variant: number;
  /** Always "template" until an AI provider implements these tasks. */
  generatedBy: "template";
  /** True when the story had no figures, so the draft stays general. */
  limited: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Newest last, capped at HISTORY_MAX. Missing on drafts made before step 5. */
  history: HistoryEntry[];
  /** Set on a copy made with "duplicate". */
  duplicatedFrom?: string;
};

export const AUDIENCES: StudioAudience[] = ["arab", "buyers", "sellers", "investors", "residents"];
export const DURATIONS: ReelDuration[] = [30, 45, 60];
export const SLIDE_MIN = 5;
export const SLIDE_MAX = 10;
export const STATUSES: DraftStatus[] = ["draft", "review", "changes", "approved", "ready"];
export const HISTORY_MAX = 30;
