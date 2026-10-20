import { categoryOf, keyFacts, type Bi, type Category } from "../analysis/score";
import { GLOSSARY, IMPACT, type ImpactAudience } from "../analysis/rules";
import type { NewsItem, Translation } from "../news/types";
import type { DraftContent, DraftLang, DraftOptions, ReelSegment, Slide, StorySnapshot, StudioAudience } from "./types";

// Template draft generator. Everything here is fixed wording plus data copied
// from the chosen story: its source, date, title and the sentences in it that
// contain figures. It never adds numbers, forecasts or statements that are not
// in the source, and drafts are labelled as template output that needs review.
//
// Arabic and English versions are written from separate templates, not
// translated from each other. When the story has no Arabic translation, the
// Arabic draft quotes the source figures and leaves a reviewer note with the
// original English sentence instead of guessing what the figure measures.

export function snapshotOf(item: NewsItem, sourceName: Bi, translation?: Pick<Translation, "titleAr" | "summaryAr">): StorySnapshot {
  return {
    id: item.id,
    title: item.title,
    titleAr: translation?.titleAr,
    summaryAr: translation?.summaryAr,
    publisher: item.publisher,
    sourceId: item.sourceId,
    sourceName,
    url: item.url,
    publishedAt: item.publishedAt,
    summary: item.summary || item.body?.slice(0, 800) || "",
    facts: keyFacts(item, 6),
    category: categoryOf(item),
    location: item.location,
  };
}

const FIGURE = /\$\s?\d[\d,.]*(?:\s?(?:million|billion|M|K)\b)?|\d[\d,.]*\s?(?:%|per cent|percent)|\b\d{1,3}(?:,\d{3})+\b|\b\d+\.\d+\b/gi;

/** Figures exactly as written in a sentence ("per cent" shortened to "%"). */
export function figuresIn(sentence: string): string[] {
  return [...new Set((sentence.match(FIGURE) ?? []).map((f) => f.replace(/\s?(per cent|percent)/i, "%").replace(/[.,]$/, "").trim()))];
}

export function formatStoryDate(iso: string | null, lang: DraftLang) {
  if (!iso) return lang === "ar" ? "بدون تاريخ منشور" : "date not given";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Toronto" }).format(new Date(iso));
}

const pick = <T,>(list: T[], variant: number) => list[((variant % list.length) + list.length) % list.length];

/** What the story is about, in a phrase. */
const ABOUT: Record<Category, Bi> = {
  boc: { ar: "قرار الفائدة من بنك كندا", en: "the Bank of Canada's rate decision" },
  prices_sales: { ar: "أرقام مبيعات وأسعار البيوت", en: "the latest home sales and price numbers" },
  mortgage: { ar: "خبر عن الرهن العقاري", en: "new mortgage news" },
  first_time: { ar: "دعم المشترين لأول مرة", en: "support for first-time buyers" },
  policy_tax: { ar: "قرار حكومي عن السكن", en: "a government housing announcement" },
  inventory: { ar: "أرقام البناء والمعروض من البيوت", en: "new construction and supply numbers" },
  rentals: { ar: "خبر عن سوق الإيجار", en: "rental market news" },
  general: { ar: "رقم اقتصادي جديد", en: "new economic data" },
};

/** Audience framing. Only says who the content is for; assumes nothing about their situation. */
const AUDIENCE: Record<StudioAudience, { q: Bi; for: Bi; impact: ImpactAudience; tags: Bi }> = {
  arab: { q: { ar: "إذا إنت من الجالية العربية بكندا ومهتم بالعقار", en: "If you're part of the Arab community in Canada and follow real estate" }, for: { ar: "للجالية العربية بكندا", en: "for the Arab community in Canada" }, impact: "firstTime", tags: { ar: "#العرب_في_كندا #عقارات_كندا", en: "#ArabCanadians #CanadaRealEstate" } },
  buyers: { q: { ar: "إذا ناوي تشتري بيت بكندا", en: "If you're planning to buy a home in Canada" }, for: { ar: "للمشترين", en: "for buyers" }, impact: "firstTime", tags: { ar: "#شراء_بيت #أول_بيت", en: "#HomeBuyers #FirstTimeHomeBuyer" } },
  sellers: { q: { ar: "إذا بتفكّر تبيع بيتك", en: "If you're thinking about selling your home" }, for: { ar: "للبائعين", en: "for sellers" }, impact: "sellers", tags: { ar: "#بيع_بيت", en: "#HomeSellers #SellingYourHome" } },
  investors: { q: { ar: "إذا بتستثمر بالعقار أو ناوي", en: "If you invest in real estate, or plan to" }, for: { ar: "للمستثمرين", en: "for investors" }, impact: "investors", tags: { ar: "#استثمار_عقاري", en: "#RealEstateInvesting" } },
  residents: { q: { ar: "إذا ساكن بكندا وبتتابع سوق السكن", en: "If you live in Canada and follow the housing market" }, for: { ar: "للي ساكنين بكندا", en: "for people living in Canada" }, impact: "homeowners", tags: { ar: "#كندا #سوق_العقار", en: "#CanadaHousing #HousingMarket" } },
};

const TOPIC_TAGS: Record<Category, Bi> = {
  boc: { ar: "#بنك_كندا #سعر_الفائدة", en: "#BankOfCanada #InterestRates #Mortgage" },
  prices_sales: { ar: "#عقارات_تورنتو #سوق_تورنتو", en: "#TorontoRealEstate #GTARealEstate #HousingMarket" },
  mortgage: { ar: "#رهن_عقاري #تمويل_عقاري", en: "#Mortgage #MortgageTips" },
  first_time: { ar: "#أول_بيت #مشتري_لأول_مرة", en: "#FirstTimeHomeBuyer #FHSA" },
  policy_tax: { ar: "#سياسات_السكن #كندا", en: "#CanadaHousing #HousingPolicy" },
  inventory: { ar: "#بناء_جديد #سوق_العقار", en: "#HousingSupply #NewConstruction" },
  rentals: { ar: "#إيجار #سوق_الإيجار", en: "#RentalMarket #TorontoRentals" },
  general: { ar: "#اقتصاد_كندا", en: "#CanadianEconomy" },
};

/** Practical, general takeaways. They point people to professionals rather than advise. */
const TAKEAWAY: Record<Category, Bi> = {
  boc: { ar: "إذا عندك رهن أو ناوي تشتري، احكي مع مختص رهن مرخّص عن وضعك قبل أي قرار.", en: "If you have a mortgage or plan to buy, talk to a licensed mortgage professional about your own situation before deciding." },
  prices_sales: { ar: "أرقام السوق العامة بتختلف من حي لحي ومن نوع بيت لنوع. اطلب أرقام منطقتك قبل ما تقرّر.", en: "Market-wide numbers vary by neighbourhood and home type. Ask for numbers for your area before deciding." },
  mortgage: { ar: "قبل أي خطوة، اعرف وضعك المالي واحكي مع مختص رهن مرخّص.", en: "Before any step, know your numbers and speak with a licensed mortgage professional." },
  first_time: { ar: "تأكد من شروط الأهلية من الموقع الرسمي، واسأل مختص قبل ما تعتمد على أي برنامج.", en: "Check eligibility on the official website and ask a professional before counting on any program." },
  policy_tax: { ar: "التفاصيل والشروط بالنص الرسمي. استشر محامي أو محاسب مختص إذا بتمسّ وضعك.", en: "The details are in the official text. Ask a lawyer or accountant if it may apply to you." },
  inventory: { ar: "أرقام البناء بتعطي صورة عامة، مش قرار. تابع أرقام منطقتك.", en: "Construction data gives a general picture, not a decision. Follow the numbers for your area." },
  rentals: { ar: "قارن أرقام الإيجار بمنطقتك تحديداً قبل أي قرار إيجار أو استثمار.", en: "Compare rental numbers for your specific area before any renting or investing decision." },
  general: { ar: "المؤشرات العامة جزء من صورة أكبر. ما تبني قرار على رقم واحد.", en: "Broad indicators are one part of a bigger picture. Don't base a decision on one number." },
};

const CTAS: Bi[] = [
  { ar: "إذا عندك سؤال عن وضعك، ابعتلي رسالة وبنحكي.", en: "Have a question about your situation? Send me a message." },
  { ar: "احفظ المنشور وشاركه مع حدا بهمّه.", en: "Save this and share it with someone who needs it." },
  { ar: "اكتبلي «سؤال» بالتعليقات وبرد عليك.", en: "Comment \"QUESTION\" and I'll get back to you." },
];

const DISCLAIMER: Bi = {
  ar: "المحتوى للتوعية العامة، مش استشارة مالية أو قانونية.",
  en: "For general information only, not financial or legal advice.",
};

type Ctx = {
  lang: DraftLang;
  story: StorySnapshot;
  audience: StudioAudience;
  variant: number;
  src: string;
  date: string;
  about: string;
  /** Source facts for this language: English sentences, or Arabic sentences from an existing translation. */
  facts: string[];
  /** Figures from the English facts, used by the Arabic version when no translation exists. */
  figures: string[][];
  translatedAr: boolean;
};

function context(story: StorySnapshot, audience: StudioAudience, lang: DraftLang, variant: number): Ctx {
  const src = lang === "ar" ? (story.sourceId === "gc" ? `حكومة كندا (${story.publisher})` : story.sourceName.ar) : story.sourceId === "gc" ? story.publisher : story.sourceName.en;
  const arSentences = story.summaryAr ? story.summaryAr.split(/(?<=[.!؟?])\s+/).map((s) => s.trim()).filter((s) => s.length > 10) : [];
  const translatedAr = lang === "ar" && arSentences.length > 0;
  return {
    lang,
    story,
    audience,
    variant,
    src,
    date: formatStoryDate(story.publishedAt, lang),
    about: ABOUT[story.category][lang],
    facts: lang === "en" ? story.facts : translatedAr ? arSentences : [],
    figures: story.facts.map(figuresIn),
    translatedAr,
  };
}

function hooks(c: Ctx): string[] {
  const aud = AUDIENCE[c.audience].q[c.lang];
  const fig = c.figures.flat()[0];
  if (c.lang === "ar") {
    return [
      `${aud}، هاد الخبر من ${c.src} لازم تعرفه.`,
      `${c.about}: شو بيعني إلك؟`,
      fig ? `${fig}: هاد رقم من ${c.src}، وهيك بتقراه.` : `قبل ما تاخد أي قرار، اسمع شو نشر ${c.src}.`,
    ];
  }
  return [
    `${aud}, here's what ${c.src} just published.`,
    `${cap(c.about)}: what does it mean for you?`,
    fig ? `${fig}: that's a number from ${c.src}. Here's how to read it.` : `Before you make a move, here's what ${c.src} just put out.`,
  ];
}

function titles(c: Ctx): string[] {
  const label = cap(c.about);
  const aud = AUDIENCE[c.audience].for[c.lang];
  return c.lang === "ar"
    ? [`${label}: شو لازم تعرف`, `${c.src}: الخلاصة بدقيقة`, `${label} بكلام بسيط ${aud}`]
    : [`${label}: what you should know`, `${c.src}: the short version`, `${label}, in plain words ${aud}`];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The n-th fact as a line for this language, plus a reviewer note when the Arabic needs the English source. */
function factLine(c: Ctx, n: number): { text: string; highlight: string; note?: string } | null {
  if (c.lang === "en") {
    const f = c.facts[n];
    return f ? { text: f, highlight: figuresIn(f)[0] ?? "" } : null;
  }
  if (c.translatedAr) {
    const f = c.facts[n];
    return f ? { text: f, highlight: figuresIn(f)[0] ?? "", note: "مأخوذ من ترجمة آلية سابقة للخبر. راجعيه مع المصدر الإنجليزي." } : null;
  }
  const figs = c.figures[n];
  const original = c.story.facts[n];
  if (!original) return null;
  return {
    // Joined with "و" so each figure stays its own left-to-right run inside the Arabic line.
    text: figs.length ? `من الأرقام اللي ذكرها ${c.src} بهالخبر: ${figs.join(" و ")}.` : `${c.src} ذكر تفاصيل بهالخبر.`,
    highlight: figs[0] ?? "",
    note: `اكتبي بالعربي شو بيقيس كل رقم، حسب الجملة الأصلية: «${original}»`,
  };
}

function meaning(c: Ctx) {
  const rule = IMPACT[c.story.category][AUDIENCE[c.audience].impact];
  return c.lang === "ar" ? `بشكل عام، ${rule.note.ar}` : `In general: ${rule.note.en}`;
}

function caption(c: Ctx, hook: string, cta: string) {
  const sourceLine = c.lang === "ar" ? `المصدر: ${c.src}، ${c.date}.` : `Source: ${c.src}, ${c.date}.`;
  const what = c.lang === "ar" ? `الخبر عن ${c.about}. التفاصيل الكاملة بالرابط الرسمي.` : `This is about ${c.about}. Full details are at the official link.`;
  return [hook, what, `${sourceLine}\n${c.story.url}`, cta, DISCLAIMER[c.lang]].join("\n\n");
}

function hashtags(c: Ctx) {
  const local = c.lang === "ar" ? "#عقارات_تورنتو #بهاء_الشريف" : "#TorontoRealEstate #GTA";
  const all = `${TOPIC_TAGS[c.story.category][c.lang]} ${AUDIENCE[c.audience].tags[c.lang]} ${local}`.split(/\s+/);
  return [...new Set(all)].join(" ");
}

function reel(c: Ctx, duration: number): DraftContent {
  const hook = pick(hooks(c), c.variant);
  const title = pick(titles(c), c.variant);
  const cta = pick(CTAS, c.variant)[c.lang];
  const L = c.lang === "ar";
  const shot = {
    face: L ? "بهاء قدام الكاميرا، لقطة قريبة وإضاءة طبيعية" : "Baha to camera, close-up, natural light",
    source: L ? `لقطة شاشة لصفحة ${c.src} الرسمية بيبيّن فيها التاريخ` : `Screen capture of the official ${c.src} page showing the date`,
    city: L ? "لقطات عامة لأحياء تورنتو من تصويرك أو مكتبة مرخّصة (مش لعقار معيّن)" : "General Toronto neighbourhood footage, your own or licensed (not a specific listing)",
    cta: L ? "بهاء قدام الكاميرا مع نص الدعوة على الشاشة" : "Baha to camera with the call to action on screen",
  };
  const f1 = factLine(c, 0);
  const f2 = factLine(c, 1);
  const contextLine = L ? `الخبر عن ${c.about}، ونشره ${c.src} بتاريخ ${c.date}.` : `This is about ${c.about}, published by ${c.src} on ${c.date}.`;
  const noFacts = L ? `الخبر ما فيه أرقام واضحة، فالتفاصيل الكاملة بالرابط الرسمي.` : `The release has no clear figures, so the full details are at the official link.`;

  const seg = (label: string, voiceover: string, onScreen: string, shotText: string, kind: ReelSegment["kind"], note?: string) => ({ label, voiceover, onScreen, shot: shotText, kind, ...(note ? { note } : {}) });
  const parts = [
    seg(L ? "الافتتاحية" : "Hook", hook, title, shot.face, "explain"),
    ...(duration >= 45 ? [seg(L ? "السياق" : "Context", contextLine, `${c.src} · ${c.date}`, shot.source, "fact")] : []),
    f1
      ? seg(L ? "المعلومة" : "The fact", L ? (c.translatedAr ? `حسب ${c.src}: ${f1.text}` : f1.text) : `According to ${c.src}: ${f1.text}`, f1.highlight || `${c.src} · ${c.date}`, shot.source, "fact", f1.note)
      : seg(L ? "المعلومة" : "The fact", `${contextLine} ${noFacts}`, `${c.src} · ${c.date}`, shot.source, "fact"),
    ...(duration >= 60
      ? [f2 ? seg(L ? "معلومة ثانية" : "Second fact", f2.text, f2.highlight, shot.source, "fact", f2.note) : glossarySegment(c, shot.city)]
      : []),
    seg(L ? "شو يعني إلك" : "What it means", meaning(c), L ? "بشكل عام" : "In general", shot.city, "explain"),
    seg(L ? "الدعوة" : "Call to action", `${TAKEAWAY[c.story.category][c.lang]} ${cta}`, cta, shot.cta, "cta"),
  ];
  return { title, hook, cta, caption: caption(c, hook, cta), hashtags: hashtags(c), segments: timeParts(parts, duration) };
}

function glossarySegment(c: Ctx, shot: string) {
  const g = GLOSSARY.find((x) => x.categories.includes(c.story.category));
  const L = c.lang === "ar";
  const term = g ? g.term[c.lang] : L ? "المصطلح" : "Key term";
  return {
    label: L ? "مصطلح بكلام بسيط" : "Term in plain words",
    voiceover: g ? `${term}: ${g.def[c.lang]}` : L ? "التفاصيل الكاملة بالرابط الرسمي." : "Full details are at the official link.",
    onScreen: term,
    shot,
    kind: "explain" as const,
  };
}

/** Splits the duration: 3 seconds for the hook, the rest shared, the call to action last. */
function timeParts(parts: Omit<ReelSegment, "start" | "end">[], duration: number): ReelSegment[] {
  const hook = 3;
  const rest = (duration - hook) / (parts.length - 1);
  let t = 0;
  return parts.map((p, i) => {
    const start = t;
    t = i === 0 ? hook : i === parts.length - 1 ? duration : Math.round(hook + rest * i);
    return { ...p, start, end: t };
  });
}

function carousel(c: Ctx, count: number): DraftContent {
  const L = c.lang === "ar";
  const hook = pick(hooks(c), c.variant);
  const title = pick(titles(c), c.variant);
  const cta = pick(CTAS, c.variant)[c.lang];
  const visual = {
    cover: L ? "خلفية داكنة بهوية بهاء، عنوان كبير، شعار صغير" : "Dark brand background, large headline, small logo",
    source: L ? `أيقونة المصدر واسم ${c.src} والتاريخ` : `Source icon with ${c.src} and the date`,
    figure: L ? "الرقم بخط كبير بالنص، والجملة تحته" : "The figure large in the centre, the sentence below",
    text: L ? "نص قصير على خلفية فاتحة، أيقونة بسيطة" : "Short text on a light background, simple icon",
    cta: L ? "صورة بهاء، الدعوة واضحة، معلومات التواصل" : "Baha's photo, clear call to action, contact details",
  };
  const context: Slide = { title: L ? "شو صار؟" : "What happened?", body: L ? `${c.src} نشر بتاريخ ${c.date} ${c.about}.` : `${c.src} published ${c.about} on ${c.date}.`, visual: visual.source, highlight: c.date, kind: "fact" };
  const fixed = 5; // cover, context, meaning, takeaway, cta
  const slots = Math.max(0, count - fixed);
  const middle: Slide[] = [];
  const terms = GLOSSARY.filter((g) => g.categories.includes(c.story.category));
  const questions = L
    ? ["شو بيتغيّر بوضعي أنا؟", "مين المختص اللي لازم أسأله؟", "شو الأرقام الخاصة بمنطقتي؟", "في تحديث أحدث من تاريخ الخبر؟"]
    : ["What does this change in my own situation?", "Which professional should I ask?", "What are the numbers for my area?", "Is there a newer update since this was published?"];
  let factIdx = 0;
  let termIdx = 0;
  let qIdx = 0;
  while (middle.length < slots) {
    const f = factLine(c, factIdx);
    if (f) {
      factIdx++;
      middle.push({ title: L ? "من المصدر" : "From the source", body: f.text, visual: visual.figure, highlight: f.highlight, kind: "fact", ...(f.note ? { note: f.note } : {}) });
    } else if (termIdx < terms.length) {
      const term = terms[termIdx++];
      middle.push({ title: term.term[c.lang], body: term.def[c.lang], visual: visual.text, highlight: term.en, kind: "explain" });
    } else {
      middle.push({ title: L ? "اسأل حالك" : "Ask yourself", body: questions[qIdx++ % questions.length], visual: visual.text, highlight: "", kind: "explain" });
    }
  }
  const first = count === fixed ? factLine(c, 0) : null;
  if (first) {
    const f = first;
    context.body = `${context.body} ${f.text}`;
    context.highlight = f.highlight || context.highlight;
    if (f.note) context.note = f.note;
  }
  const slides: Slide[] = [
    { title, body: hook, visual: visual.cover, highlight: c.figures.flat()[0] ?? "", kind: "explain" },
    context,
    ...middle,
    { title: L ? `شو يعني هالشي ${AUDIENCE[c.audience].for.ar}؟` : `What this means ${AUDIENCE[c.audience].for.en}`, body: meaning(c), visual: visual.text, highlight: "", kind: "explain" },
    { title: L ? "الخلاصة العملية" : "The practical takeaway", body: TAKEAWAY[c.story.category][c.lang], visual: visual.text, highlight: "", kind: "explain" },
    { title: L ? "حابب تحكي عن وضعك؟" : "Want to talk about your situation?", body: `${cta}\n${L ? "المصدر" : "Source"}: ${c.src} · ${c.date}`, visual: visual.cta, highlight: "", kind: "cta" },
  ];
  return { title, hook, cta, caption: caption(c, hook, cta), hashtags: hashtags(c), slides };
}

export function generateContent(story: StorySnapshot, opts: Pick<DraftOptions, "format" | "audience" | "duration" | "slideCount">, lang: DraftLang, variant = 0): DraftContent {
  const c = context(story, opts.audience, lang, variant);
  return opts.format === "reel" ? reel(c, opts.duration) : carousel(c, opts.slideCount);
}

export function languagesOf(language: DraftOptions["language"]): DraftLang[] {
  return language === "both" ? ["ar", "en"] : [language];
}

export function generateAll(story: StorySnapshot, opts: DraftOptions, variant = 0) {
  const content: Partial<Record<DraftLang, DraftContent>> = {};
  for (const lang of languagesOf(opts.language)) content[lang] = generateContent(story, opts, lang, variant);
  return content;
}

/** Template alternatives for one field, for the "another version" button. */
export function alternatives(story: StorySnapshot, audience: StudioAudience, lang: DraftLang, field: "title" | "hook" | "cta"): string[] {
  const c = context(story, audience, lang, 0);
  if (field === "title") return titles(c);
  if (field === "hook") return hooks(c);
  return CTAS.map((x) => x[lang]);
}

/** Days since publication, or null when the source gave no date. */
export function storyAgeDays(story: StorySnapshot, now = Date.now()) {
  return story.publishedAt ? Math.floor((now - Date.parse(story.publishedAt)) / 86_400_000) : null;
}
