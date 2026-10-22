import { STATUSES, type Draft, type DraftFormat, type DraftLang, type DraftLanguage, type DraftStatus } from "./types";

// Search, filters and counts for the content library and the dashboard. Pure
// functions over stored drafts, so both pages always show the same numbers.

/** What a library card needs; keeps the full content off the client. */
export type DraftSummary = {
  id: string;
  title: string;
  titleLang: DraftLang;
  format: DraftFormat;
  language: DraftLanguage;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  preview: string;
  previewLang: DraftLang;
  story: { title: string; titleAr?: string; publisher: string; url: string; publishedAt: string | null };
  duplicatedFrom?: string;
  /** Lower-cased, normalised text of everything searchable. */
  haystack: string;
};

export type LibraryFilter = {
  q?: string;
  format?: DraftFormat;
  language?: DraftLanguage;
  status?: DraftStatus;
  /** Inclusive calendar dates, yyyy-mm-dd, compared in Toronto time. */
  from?: string;
  to?: string;
};

/** Folds case, Arabic diacritics, tatweel and letter variants so "أسعار" matches "اسعار". */
export function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

const clip = (s: string, n: number) => {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1).trimEnd()}…` : flat;
};

export function summarize(d: Draft, prefer: DraftLang = "ar"): DraftSummary {
  const lang: DraftLang = d.content[prefer] ? prefer : d.content.ar ? "ar" : "en";
  const c = d.content[lang]!;
  const body = c.segments?.map((s) => s.voiceover).join(" ") ?? c.slides?.map((s) => `${s.title} ${s.body}`).join(" ") ?? "";
  const all = (["ar", "en"] as const).flatMap((l) => {
    const x = d.content[l];
    if (!x) return [];
    return [x.title, x.hook, x.caption, x.cta, x.hashtags, ...(x.segments ?? []).flatMap((s) => [s.voiceover, s.onScreen]), ...(x.slides ?? []).flatMap((s) => [s.title, s.body, s.highlight])];
  });
  return {
    id: d.id,
    title: c.title.trim() || d.story.title,
    titleLang: c.title.trim() ? lang : "en",
    format: d.format,
    language: d.language,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    preview: clip(c.hook.trim() || body, 180),
    previewLang: lang,
    story: { title: d.story.title, titleAr: d.story.titleAr, publisher: d.story.publisher, url: d.story.url, publishedAt: d.story.publishedAt },
    duplicatedFrom: d.duplicatedFrom,
    haystack: fold([...all, d.story.title, d.story.titleAr ?? "", d.story.publisher].join(" \n ")),
  };
}

/** Calendar date of an ISO timestamp in Toronto, as yyyy-mm-dd. */
export const torontoDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date(iso));

export function filterDrafts(list: DraftSummary[], f: LibraryFilter) {
  const words = f.q ? fold(f.q).split(" ").filter(Boolean) : [];
  return list.filter((d) => {
    if (f.format && d.format !== f.format) return false;
    if (f.language && d.language !== f.language) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.from || f.to) {
      const day = torontoDate(d.createdAt);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
    }
    return words.every((w) => d.haystack.includes(w));
  });
}

export type DraftStats = { total: number; byStatus: Record<DraftStatus, number>; reels: number; carousels: number };

/** Counts used by the dashboard and the library's status filter. */
export function draftStats(list: Pick<Draft, "status" | "format">[]): DraftStats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<DraftStatus, number>;
  for (const d of list) byStatus[d.status]++;
  return { total: list.length, byStatus, reels: list.filter((d) => d.format === "reel").length, carousels: list.filter((d) => d.format === "carousel").length };
}
