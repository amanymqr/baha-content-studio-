import { torontoDate } from "./library";
import type { Draft, DraftContent, DraftLang, ReelSegment, Slide } from "./types";

// Plain-text and Markdown versions of a draft, used by the copy buttons and the
// export. Reviewer notes are only included in the export, under their own heading.

const L = {
  ar: {
    hook: "الافتتاحية", script: "السكربت", onScreen: "على الشاشة", shot: "اللقطة", caption: "الكابشن", cta: "الدعوة", tags: "الهاشتاغات", slide: "الشريحة", visual: "اقتراح التصميم", highlight: "المعلومة البارزة",
    source: "الخبر الأصلي", publisher: "الجهة الناشرة", link: "رابط المصدر", published: "تاريخ الخبر", created: "تاريخ إنشاء المسودة", updated: "آخر تعديل", notes: "ملاحظات للمراجعة", status: "حالة المراجعة", format: "نوع المحتوى", language: "اللغة",
    note: "مسودة من القوالب، بحاجة لمراجعة بشرية قبل النشر.", noDate: "بدون تاريخ",
    formats: { reel: "ريل", carousel: "كاروسيل" }, langs: { ar: "عربي", en: "إنجليزي", both: "عربي وإنجليزي" },
    statuses: { draft: "مسودة", review: "قيد المراجعة", changes: "بحاجة لتعديلات", approved: "معتمدة", ready: "جاهزة للتصدير" },
  },
  en: {
    hook: "Hook", script: "Script", onScreen: "On screen", shot: "Shot", caption: "Caption", cta: "Call to action", tags: "Hashtags", slide: "Slide", visual: "Design suggestion", highlight: "Key point",
    source: "Original story", publisher: "Publisher", link: "Source link", published: "Story date", created: "Draft created", updated: "Last edited", notes: "Review notes", status: "Review status", format: "Format", language: "Language",
    note: "Template draft. Needs human review before publishing.", noDate: "no date",
    formats: { reel: "Reel", carousel: "Carousel" }, langs: { ar: "Arabic", en: "English", both: "Arabic and English" },
    statuses: { draft: "Draft", review: "In review", changes: "Needs changes", approved: "Approved", ready: "Ready to export" },
  },
} satisfies Record<DraftLang, Record<string, unknown>>;

const time = (s: number) => `0:${String(s).padStart(2, "0")}`;

export function segmentText(s: ReelSegment, lang: DraftLang) {
  const t = L[lang];
  return [`[${time(s.start)}–${time(s.end)}] ${s.label}`, s.voiceover, s.onScreen && `${t.onScreen}: ${s.onScreen}`, s.shot && `${t.shot}: ${s.shot}`].filter(Boolean).join("\n");
}

export function slideText(s: Slide, n: number, lang: DraftLang) {
  const t = L[lang];
  return [`${t.slide} ${n}: ${s.title}`, s.body, s.highlight && `${t.highlight}: ${s.highlight}`, s.visual && `${t.visual}: ${s.visual}`].filter(Boolean).join("\n");
}

/** Every publishable element of one language version, for "copy all". */
export function contentText(c: DraftContent, lang: DraftLang) {
  const t = L[lang];
  const body = c.segments
    ? `${t.script}:\n\n${c.segments.map((s) => segmentText(s, lang)).join("\n\n")}`
    : (c.slides ?? []).map((s, i) => slideText(s, i + 1, lang)).join("\n\n");
  return [c.title, `${t.hook}: ${c.hook}`, body, `${t.caption}:\n${c.caption}`, `${t.cta}: ${c.cta}`, `${t.tags}: ${c.hashtags}`].join("\n\n");
}

export function carouselText(c: DraftContent, lang: DraftLang) {
  return (c.slides ?? []).map((s, i) => slideText(s, i + 1, lang)).join("\n\n");
}

/** What an export needs. Older callers may leave out the dates and language. */
export type ExportDraft = Pick<Draft, "story" | "content" | "status" | "format"> & Partial<Pick<Draft, "id" | "language" | "audience" | "createdAt" | "updatedAt" | "generatedBy">>;

const langsOf = (d: ExportDraft) => (["ar", "en"] as const).filter((l) => d.content[l]);
const day = (iso: string | null | undefined, t: (typeof L)[DraftLang]) => (iso ? torontoDate(iso) : t.noDate);

/** Full Markdown export: details, each language version, and review notes. */
export function draftMarkdown(d: ExportDraft) {
  const out: string[] = [];
  const langs = langsOf(d);
  const first = langs[0] ?? "ar";
  const t = L[first];
  const language = d.language ?? (langs.length === 2 ? "both" : first);
  out.push(`# ${d.content[first]?.title || d.story.title}`, "", `> ${L.ar.note} / ${L.en.note}`, "");
  out.push(
    `- ${t.format}: ${t.formats[d.format]}`,
    `- ${t.language}: ${t.langs[language]}`,
    `- ${t.status}: ${t.statuses[d.status]}`,
    ...(d.createdAt ? [`- ${t.created}: ${day(d.createdAt, t)}`] : []),
    ...(d.updatedAt ? [`- ${t.updated}: ${day(d.updatedAt, t)}`] : []),
    "",
    `## ${t.source}`,
    "",
    `- ${d.story.title}`,
    ...(d.story.titleAr ? [`- ${d.story.titleAr}`] : []),
    `- ${t.publisher}: ${d.story.publisher}`,
    `- ${t.published}: ${day(d.story.publishedAt, t)}`,
    `- ${t.link}: ${d.story.url}`,
    "",
  );
  for (const lang of langs) {
    const c = d.content[lang]!;
    const tl = L[lang];
    out.push(`## ${lang === "ar" ? "العربية" : "English"}`, "", `### ${c.title}`, "", `**${tl.hook}:** ${c.hook}`, "");
    if (c.segments) {
      out.push(`### ${tl.script}`, "");
      for (const s of c.segments) out.push(`**${time(s.start)}–${time(s.end)} · ${s.label}**`, "", s.voiceover, "", `- ${tl.onScreen}: ${s.onScreen}`, `- ${tl.shot}: ${s.shot}`, "");
    } else {
      (c.slides ?? []).forEach((s, i) => out.push(`### ${tl.slide} ${i + 1}: ${s.title}`, "", s.body, "", ...(s.highlight ? [`- ${tl.highlight}: ${s.highlight}`] : []), `- ${tl.visual}: ${s.visual}`, ""));
    }
    out.push(`### ${tl.caption}`, "", c.caption, "", `**${tl.cta}:** ${c.cta}`, "", `**${tl.tags}:** ${c.hashtags}`, "");
    const notes = [...(c.segments ?? []), ...(c.slides ?? [])].map((x) => x.note).filter(Boolean);
    if (notes.length) out.push(`### ${tl.notes}`, "", ...notes.map((n) => `- ${n}`), "");
  }
  return out.join("\n");
}

/** Plain-text export: the Markdown without its markup. Only line-leading markup is removed, so the text itself is untouched. */
export function draftPlainText(d: ExportDraft) {
  return draftMarkdown(d).replace(/^#+\s/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^> /gm, "");
}

/** Structured export for handing over or importing elsewhere. Content is copied as stored, review notes included. */
export function draftJson(d: ExportDraft) {
  const langs = langsOf(d);
  return JSON.stringify(
    {
      format: "baha-content-draft",
      version: 1,
      id: d.id ?? null,
      title: d.content[langs[0]]?.title || d.story.title,
      contentType: d.format,
      language: d.language ?? (langs.length === 2 ? "both" : langs[0]),
      audience: d.audience ?? null,
      status: d.status,
      statusLabel: { ar: L.ar.statuses[d.status], en: L.en.statuses[d.status] },
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
      generatedBy: d.generatedBy ?? "template",
      reviewNote: { ar: L.ar.note, en: L.en.note },
      source: { title: d.story.title, titleAr: d.story.titleAr ?? null, publisher: d.story.publisher, url: d.story.url, publishedAt: d.story.publishedAt, facts: d.story.facts },
      content: Object.fromEntries(langs.map((l) => [l, d.content[l]])),
    },
    null,
    2,
  );
}
