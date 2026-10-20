import { AUDIENCES, DURATIONS, HISTORY_MAX, SLIDE_MAX, SLIDE_MIN, STATUSES, type Draft, type DraftContent, type DraftLang, type HistoryEntry, type Kind, type ReelSegment, type Slide } from "./types";

// Reads a stored draft defensively. Drafts saved by older versions, or edited by
// hand, may miss fields or carry values this version doesn't know. Anything that
// can be filled safely gets a neutral default; a draft without its source story or
// any content is reported as unreadable instead of being guessed at. Nothing here
// writes back to the file, so the stored data is never changed by reading it.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const isDate = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const oneOf = <T>(list: readonly T[], v: unknown, fallback: T) => (list.includes(v as T) ? (v as T) : fallback);
const KINDS: Kind[] = ["fact", "explain", "cta"];

function segment(v: unknown): ReelSegment | null {
  if (!isObj(v)) return null;
  return {
    start: num(v.start, 0),
    end: num(v.end, 0),
    label: str(v.label),
    voiceover: str(v.voiceover),
    onScreen: str(v.onScreen),
    shot: str(v.shot),
    kind: oneOf(KINDS, v.kind, "explain"),
    ...(typeof v.note === "string" && v.note ? { note: v.note } : {}),
  };
}

function slide(v: unknown): Slide | null {
  if (!isObj(v)) return null;
  return {
    title: str(v.title),
    body: str(v.body),
    visual: str(v.visual),
    highlight: str(v.highlight),
    kind: oneOf(KINDS, v.kind, "explain"),
    ...(typeof v.note === "string" && v.note ? { note: v.note } : {}),
  };
}

function content(v: unknown): DraftContent | null {
  if (!isObj(v)) return null;
  const c: DraftContent = { title: str(v.title), hook: str(v.hook), caption: str(v.caption), cta: str(v.cta), hashtags: str(v.hashtags) };
  if (Array.isArray(v.segments)) c.segments = v.segments.map(segment).filter((s): s is ReelSegment => !!s);
  if (Array.isArray(v.slides)) c.slides = v.slides.map(slide).filter((s): s is Slide => !!s);
  const hasText = [c.title, c.hook, c.caption, ...(c.segments ?? []).map((s) => s.voiceover), ...(c.slides ?? []).map((s) => s.body)].some((t) => t.trim());
  return hasText ? c : null;
}

/** Returns a complete Draft, or null when the record has no id, no source link or no content. */
export function normalizeDraft(raw: unknown, key?: string): Draft | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id, key ?? "");
  const story = raw.story;
  if (!id || !isObj(story) || !str(story.url) || !str(story.title)) return null;

  const contentByLang: Partial<Record<DraftLang, DraftContent>> = {};
  if (isObj(raw.content)) {
    for (const lang of ["ar", "en"] as const) {
      const c = content(raw.content[lang]);
      if (c) contentByLang[lang] = c;
    }
  }
  const langs = Object.keys(contentByLang) as DraftLang[];
  if (!langs.length) return null;

  const first = contentByLang[langs[0]]!;
  const format = oneOf(["reel", "carousel"] as const, raw.format, first.segments ? "reel" : "carousel");
  const updatedAt = isDate(raw.updatedAt) ? raw.updatedAt : isDate(raw.createdAt) ? raw.createdAt : new Date(0).toISOString();
  const createdAt = isDate(raw.createdAt) ? raw.createdAt : updatedAt;
  const history: HistoryEntry[] = Array.isArray(raw.history)
    ? raw.history
        .filter((h): h is Obj => isObj(h) && isDate(h.at))
        .map((h) => ({
          at: h.at as string,
          by: str(h.by),
          action: oneOf(["created", "edited", "status", "regenerated", "duplicated"] as const, h.action, "edited"),
          ...(STATUSES.includes(h.status as Draft["status"]) ? { status: h.status as Draft["status"] } : {}),
        }))
        .slice(-HISTORY_MAX)
    : [];

  return {
    id,
    format,
    audience: oneOf(AUDIENCES, raw.audience, "arab"),
    language: langs.length === 2 ? "both" : langs[0],
    duration: oneOf(DURATIONS, raw.duration, 45),
    slideCount: Math.min(SLIDE_MAX, Math.max(SLIDE_MIN, Math.round(num(raw.slideCount, 7)))),
    ...(typeof raw.angleId === "string" ? { angleId: raw.angleId } : {}),
    // An unknown status is shown as a plain draft; it is never promoted to approved or ready.
    status: oneOf(STATUSES, raw.status, "draft"),
    story: {
      id: str(story.id),
      title: str(story.title),
      ...(typeof story.titleAr === "string" ? { titleAr: story.titleAr } : {}),
      ...(typeof story.summaryAr === "string" ? { summaryAr: story.summaryAr } : {}),
      publisher: str(story.publisher),
      sourceId: oneOf(["boc", "trreb", "statcan", "gc"] as const, story.sourceId, "gc"),
      sourceName: isObj(story.sourceName) ? { ar: str(story.sourceName.ar, str(story.publisher)), en: str(story.sourceName.en, str(story.publisher)) } : { ar: str(story.publisher), en: str(story.publisher) },
      url: str(story.url),
      publishedAt: isDate(story.publishedAt) ? story.publishedAt : null,
      summary: str(story.summary),
      facts: Array.isArray(story.facts) ? story.facts.filter((f): f is string => typeof f === "string") : [],
      category: oneOf(["boc", "mortgage", "prices_sales", "first_time", "policy_tax", "inventory", "rentals", "general"] as const, story.category, "general"),
      location: oneOf(["gta", "ontario", "canada"] as const, story.location, "canada"),
    },
    content: contentByLang,
    variant: Math.max(0, Math.round(num(raw.variant, 0))),
    generatedBy: "template",
    limited: typeof raw.limited === "boolean" ? raw.limited : !(Array.isArray(story.facts) && story.facts.length),
    createdBy: str(raw.createdBy),
    createdAt,
    updatedAt,
    history,
    ...(typeof raw.duplicatedFrom === "string" ? { duplicatedFrom: raw.duplicatedFrom } : {}),
  };
}

/** Appends a history line, keeping the newest HISTORY_MAX. */
export function withHistory(d: Draft, entry: HistoryEntry): HistoryEntry[] {
  return [...(d.history ?? []), entry].slice(-HISTORY_MAX);
}
