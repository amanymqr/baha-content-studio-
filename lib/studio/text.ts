import type { Draft, DraftContent, DraftLang, ReelSegment, Slide } from "./types";

// Plain-text and Markdown versions of a draft, used by the copy buttons and the
// export. Reviewer notes are only included in the export, under their own heading.

const L = {
  ar: { hook: "الافتتاحية", script: "السكربت", onScreen: "على الشاشة", shot: "اللقطة", caption: "الكابشن", cta: "الدعوة", tags: "الهاشتاغات", slide: "الشريحة", visual: "اقتراح التصميم", highlight: "المعلومة البارزة", source: "المصدر الأصلي", published: "تاريخ النشر", notes: "ملاحظات للمراجعة", status: "الحالة", note: "مسودة من القوالب، بحاجة لمراجعة بشرية قبل النشر.", noDate: "بدون تاريخ" },
  en: { hook: "Hook", script: "Script", onScreen: "On screen", shot: "Shot", caption: "Caption", cta: "Call to action", tags: "Hashtags", slide: "Slide", visual: "Design suggestion", highlight: "Key point", source: "Original source", published: "Published", notes: "Review notes", status: "Status", note: "Template draft. Needs human review before publishing.", noDate: "no date" },
};

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

/** Full Markdown export: source block, each language version, and review notes. */
export function draftMarkdown(d: Pick<Draft, "story" | "content" | "status" | "format">, statusLabel: string) {
  const out: string[] = [];
  const first = (Object.keys(d.content) as DraftLang[])[0] ?? "ar";
  const t = L[first];
  out.push(`# ${d.content[first]?.title ?? d.story.title}`, "", `> ${L.ar.note} / ${L.en.note}`, "");
  out.push(`- ${t.status}: ${statusLabel}`, `- ${t.source}: ${d.story.publisher} — ${d.story.title}`, `- ${d.story.url}`, `- ${t.published}: ${d.story.publishedAt ? d.story.publishedAt.slice(0, 10) : t.noDate}`, "");
  for (const lang of Object.keys(d.content) as DraftLang[]) {
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

/** Plain-text export: the Markdown without its markup. */
export function draftPlainText(d: Parameters<typeof draftMarkdown>[0], statusLabel: string) {
  return draftMarkdown(d, statusLabel).replace(/^#+\s/gm, "").replace(/\*\*/g, "").replace(/^> /gm, "");
}
