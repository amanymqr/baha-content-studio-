import type { NewsItem } from "../news/types";

// Rule-based relevance and content-opportunity scores. Every point comes from a
// keyword match in the source's own text, the story's location, its source, or
// its age, and each rule carries the sentence shown to the user. These are
// heuristic estimates, not AI analysis and not predictions of performance.

export type Bi = { ar: string; en: string };

export type Category = "boc" | "mortgage" | "prices_sales" | "first_time" | "policy_tax" | "inventory" | "rentals" | "general";

type Signal = { id: Category; points: number; re: RegExp; why: Bi };

/** Ordered by the priorities agreed for the studio. The strongest match sets the story's category. */
export const SIGNALS: Signal[] = [
  {
    id: "prices_sales",
    points: 40,
    re: /\b(home sales|homes? (prices?|sold)|benchmark price|average (selling |sale |home )?price|resale|mls|market watch|sales-to-new-listings|property (values?|prices?)|house prices?)/i,
    why: { ar: "الخبر عن أسعار البيوت أو المبيعات", en: "The story is about home prices or sales" },
  },
  {
    id: "boc",
    points: 40,
    re: /\b(policy (interest )?rate|overnight rate|rate announcement|monetary policy report|interest rate decision)/i,
    why: { ar: "الخبر عن قرار فائدة من بنك كندا", en: "The story is about a Bank of Canada rate decision" },
  },
  {
    id: "mortgage",
    points: 35,
    re: /\b(mortgages?|affordab(le|ility)|borrowing costs?|stress test|down payment)/i,
    why: { ar: "الخبر عن الرهن العقاري أو القدرة على الشراء", en: "The story is about mortgages or affordability" },
  },
  {
    id: "first_time",
    points: 35,
    re: /\b(first[- ]time (home ?)?buyers?|fhsa|first home savings|home buyers'? plan|gst rebate|homebuyers?)/i,
    why: { ar: "الخبر عن برامج أو دعم للمشترين لأول مرة", en: "The story is about first-time buyer programs or support" },
  },
  {
    id: "policy_tax",
    points: 30,
    re: /\b(land transfer tax|gst|hst|capital gains|foreign buyers?|underused housing tax|zoning|housing accelerator|housing (plan|strategy|policy|program)|development charges|vacant home tax|homes for canada|build(ing)? homes)/i,
    why: { ar: "الخبر عن سياسة سكن أو ضريبة", en: "The story is about housing policy or taxes" },
  },
  {
    id: "inventory",
    points: 30,
    re: /\b(new listings|active listings|inventory|months of supply|housing starts|building permits?|completions|housing supply|new homes?)/i,
    why: { ar: "الخبر عن المعروض من البيوت أو البناء الجديد", en: "The story is about housing supply or new construction" },
  },
  {
    id: "rentals",
    points: 30,
    re: /\b(rents?|rental|renters?|tenants?|vacancy|landlords?)\b/i,
    why: { ar: "الخبر عن سوق الإيجار", en: "The story is about the rental market" },
  },
  {
    id: "general",
    points: 12,
    re: /\b(consumer price index|cpi|inflation|gdp|gross domestic product|labour force|employment|unemployment|retail trade|wages?)\b/i,
    why: { ar: "خبر اقتصادي عام، صلته بالعقار غير مباشرة", en: "General economic news, only indirectly tied to real estate" },
  },
];

const HOUSING = SIGNALS.filter((s) => s.id !== "general");

export type Reason = { points: number; text: Bi };
export type Score = { value: number; reasons: Reason[] };

const DAY = 86_400_000;
export const ageDays = (item: NewsItem, now: number) => (item.publishedAt ? Math.max(0, (now - Date.parse(item.publishedAt)) / DAY) : null);

const textOf = (item: NewsItem) => `${item.title} ${item.summary} ${item.body ?? ""}`;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function matchedSignals(item: NewsItem) {
  const text = textOf(item);
  return SIGNALS.filter((s) => s.re.test(text));
}

/** The story's main category: the strongest matched signal, title matches first. */
export function categoryOf(item: NewsItem): Category {
  const inTitle = SIGNALS.filter((s) => s.re.test(item.title));
  const matched = inTitle.length ? inTitle : matchedSignals(item);
  if (!matched.length) return "general";
  return matched.reduce((a, b) => (b.points > a.points ? b : a)).id;
}

const LOCATION_POINTS = { gta: 25, ontario: 15, canada: 5 } as const;
const LOCATION_WHY: Record<NewsItem["location"], Bi> = {
  gta: { ar: "الخبر بذكر تورنتو أو منطقة GTA", en: "The story mentions Toronto or the GTA" },
  ontario: { ar: "الخبر عن أونتاريو", en: "The story is about Ontario" },
  canada: { ar: "خبر على مستوى كندا، مش خاص بتورنتو", en: "Canada-wide story, not specific to Toronto" },
};

/** Relevance to the Toronto, GTA, Ontario and Canadian real estate market (0–100). */
export function relevanceScore(item: NewsItem, now = Date.now()): Score {
  const reasons: Reason[] = [];
  const matched = matchedSignals(item);
  const housing = matched.filter((s) => s.id !== "general");

  if (housing.length) {
    const top = housing.reduce((a, b) => (b.points > a.points ? b : a));
    reasons.push({ points: top.points, text: top.why });
    const extra = Math.min(10, (housing.length - 1) * 5);
    if (extra) reasons.push({ points: extra, text: { ar: `بغطّي ${housing.length - 1} موضوع عقاري إضافي`, en: `Covers ${housing.length - 1} more housing topic(s)` } });
  } else if (matched.length) {
    reasons.push({ points: SIGNALS.find((s) => s.id === "general")!.points, text: SIGNALS.find((s) => s.id === "general")!.why });
  } else {
    reasons.push({ points: 0, text: { ar: "ما لقينا كلمات عقارية واضحة بنص الخبر", en: "No clear real estate keywords in the story text" } });
  }

  // BoC decisions are national but set borrowing costs everywhere, so they keep full location weight.
  const national = housing.some((s) => s.id === "boc");
  const loc = national && item.location === "canada" ? 20 : LOCATION_POINTS[item.location];
  reasons.push({ points: loc, text: national && item.location === "canada" ? { ar: "قرار وطني بأثّر على كل كندا ومنها تورنتو", en: "A national decision that applies across Canada, including Toronto" } : LOCATION_WHY[item.location] });

  const src = item.sourceId === "gc" ? 5 : 10;
  reasons.push({ points: src, text: item.sourceId === "gc" ? { ar: "إعلان حكومي رسمي", en: "Official government announcement" } : { ar: "مصدر بيانات رسمي أساسي", en: "Primary official data source" } });

  const age = ageDays(item, now);
  const rec = age === null ? 0 : age <= 3 ? 15 : age <= 7 ? 10 : age <= 30 ? 5 : 0;
  reasons.push({ points: rec, text: recencyWhy(age) });

  if (!housing.length && matched.length) {
    reasons.push({ points: -10, text: { ar: "خبر اقتصادي عام، فأولويته أقل", en: "General economic news gets lower priority" } });
  }

  return { value: clamp(reasons.reduce((s, r) => s + r.points, 0)), reasons };
}

function recencyWhy(age: number | null): Bi {
  if (age === null) return { ar: "المصدر ما ذكر تاريخ نشر", en: "The source gave no publication date" };
  if (age <= 3) return { ar: "منشور خلال آخر 3 أيام", en: "Published in the last 3 days" };
  if (age <= 7) return { ar: "منشور خلال آخر أسبوع", en: "Published in the last week" };
  if (age <= 30) return { ar: "منشور خلال آخر شهر", en: "Published in the last month" };
  return { ar: "عمره أكثر من شهر", en: "More than a month old" };
}

/** How much people usually ask about each category. A fixed editorial rule, not measured data. */
export const INTEREST: Record<Category, number> = {
  boc: 1,
  prices_sales: 1,
  mortgage: 0.9,
  first_time: 0.9,
  rentals: 0.8,
  policy_tax: 0.7,
  inventory: 0.6,
  general: 0.3,
};

const ACTIONABLE: Category[] = ["boc", "mortgage", "prices_sales", "first_time", "policy_tax"];

/** Weights shown on the Opportunities page. They add up to 100. */
export const OPPORTUNITY_WEIGHTS = { relevance: 35, interest: 25, recency: 20, leads: 20 } as const;

// Figures worth explaining: money, percentages, large counts, decimals, or counted units. Plain years do not count.
const NUMBER = /(\$\s?\d|\d[\d,.]*\s?(%|per cent|percent)|\b\d{1,3}(,\d{3})+\b|\b\d+\.\d+\b|\b\d+\s+(homes|units|sales|transactions|listings|basis points)\b)/i;

/** Content opportunity (0–100): relevance, usual audience interest, freshness and client potential. */
export function opportunityScore(item: NewsItem, now = Date.now()): Score & { category: Category; relevance: Score } {
  const relevance = relevanceScore(item, now);
  const category = categoryOf(item);
  const w = OPPORTUNITY_WEIGHTS;
  const reasons: Reason[] = [];

  reasons.push({ points: (relevance.value / 100) * w.relevance, text: { ar: `صلة الخبر بسوق تورنتو: ${relevance.value} من 100`, en: `Relevance to the Toronto market: ${relevance.value} of 100` } });
  reasons.push({ points: INTEREST[category] * w.interest, text: INTEREST_WHY[category] });

  const age = ageDays(item, now);
  const fresh = age === null ? 0 : age <= 2 ? 1 : age <= 7 ? 0.75 : age <= 14 ? 0.5 : age <= 30 ? 0.25 : 0;
  reasons.push({ points: fresh * w.recency, text: recencyWhy(age) });

  const hasNumbers = NUMBER.test(`${item.title} ${item.summary} ${item.body ?? ""}`);
  const actionable = ACTIONABLE.includes(category);
  const leads = (hasNumbers ? 0.5 : 0) + (actionable ? 0.5 : 0);
  reasons.push({
    points: leads * w.leads,
    text: {
      ar: [hasNumbers ? "فيه أرقام من المصدر نقدر نشرحها" : "ما فيه أرقام واضحة", actionable ? "وموضوعه بخلّي الناس تسأل عن قرار شراء أو بيع" : "وموضوعه مش مرتبط مباشرة بقرار شراء أو بيع"].join(" "),
      en: [hasNumbers ? "Has source figures we can explain" : "Has no clear figures", actionable ? "and the topic prompts buy or sell questions" : "and the topic is not directly tied to a buy or sell decision"].join(" "),
    },
  });

  return { value: clamp(reasons.reduce((s, r) => s + r.points, 0)), reasons: reasons.map((r) => ({ ...r, points: Math.round(r.points) })), category, relevance };
}

const INTEREST_WHY: Record<Category, Bi> = {
  boc: { ar: "قرارات الفائدة من أكثر المواضيع اللي بسأل عنها الجمهور", en: "Rate decisions are among the most asked-about topics" },
  prices_sales: { ar: "أسعار ومبيعات تورنتو من أكثر المواضيع متابعة", en: "Toronto prices and sales are among the most followed topics" },
  mortgage: { ar: "الرهن والقدرة على الشراء بهمّوا معظم المشترين", en: "Mortgages and affordability matter to most buyers" },
  first_time: { ar: "برامج المشترين لأول مرة بتجيب أسئلة كثيرة", en: "First-time buyer programs draw a lot of questions" },
  rentals: { ar: "الإيجار بهمّ المستأجرين والمستثمرين", en: "Rentals matter to renters and investors" },
  policy_tax: { ar: "السياسات والضرائب مهمة بس بدها شرح", en: "Policy and tax news matters but needs explaining" },
  inventory: { ar: "المعروض والبناء موضوع متخصص أكثر", en: "Supply and construction is a more specialist topic" },
  general: { ar: "الاقتصاد العام اهتمام الجمهور فيه أقل", en: "General economy draws less audience interest" },
};

/** Sentences from the source text that contain figures, quoted exactly. Nothing is reworded. */
export function keyFacts(item: NewsItem, max = 5): string[] {
  const text = item.body || item.summary;
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 400);
  const seen = new Set<string>();
  return sentences.filter((s) => NUMBER.test(s) && !seen.has(s) && seen.add(s)).slice(0, max);
}

export function isHousing(item: NewsItem) {
  const text = textOf(item);
  return HOUSING.some((s) => s.re.test(text));
}
