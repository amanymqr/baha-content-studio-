// Relevance scoring, classification, filtering and opportunity rules.
// Fixtures are synthetic and only exercise the rules; they never reach the app.
import { categoryOf, keyFacts, opportunityScore, relevanceScore } from "../lib/analysis/score";
import { locationOf, markDuplicates, topicOf } from "../lib/news/classify";
import { filterItems } from "../lib/news/filter";
import type { NewsItem } from "../lib/news/types";
import { buildOpportunities, rankStories } from "../lib/opportunities/build";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };
const eq = (name: string, a: unknown, b: unknown) => check(name, JSON.stringify(a) === JSON.stringify(b), `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`);

const NOW = Date.parse("2026-10-20T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
let n = 0;
const make = (p: Partial<NewsItem> & { title: string }): NewsItem => {
  const text = `${p.title} ${p.summary ?? ""}`;
  return { id: `t${++n}`, sourceId: "statcan", publisher: "Test", summary: "", url: `https://example.invalid/${n}`, publishedAt: daysAgo(1), firstSeenAt: daysAgo(1), feedCategories: [], location: locationOf(text, p.sourceId === "trreb" ? "gta" : "canada"), topic: topicOf(text), ...p };
};

// Classification
eq("category: BoC decision", categoryOf(make({ title: "Bank of Canada maintains policy rate at 2.25%" })), "boc");
eq("category: TRREB sales", categoryOf(make({ title: "GTA home sales down in September", sourceId: "trreb" })), "prices_sales");
eq("category: FHSA", categoryOf(make({ title: "Government expands support for first-time home buyers" })), "first_time");
eq("category: rentals", categoryOf(make({ title: "Rental vacancy rates rise in Ontario" })), "rentals");
eq("category: starts", categoryOf(make({ title: "Housing starts, September" })), "inventory");
eq("category: general CPI", categoryOf(make({ title: "Consumer Price Index, September" })), "general");
eq("category: unrelated", categoryOf(make({ title: "Fisheries quota update" })), "general");
eq("location: GTA place", locationOf("Condo sales in Mississauga"), "gta");
eq("location: Ontario", locationOf("Prices in Hamilton"), "ontario");
eq("location: national", locationOf("Canada-wide figures"), "canada");

// Relevance scoring
const gta = make({ title: "GTA home sales and benchmark price, September", sourceId: "trreb", publishedAt: daysAgo(1) });
const cpi = make({ title: "Consumer Price Index, September", publishedAt: daysAgo(1) });
const fish = make({ title: "Fisheries quota update", sourceId: "gc", publishedAt: daysAgo(1) });
const boc = make({ title: "Bank of Canada maintains policy rate", sourceId: "boc", publishedAt: daysAgo(1) });
const r = (i: NewsItem) => relevanceScore(i, NOW).value;
check("GTA sales scores high (≥80)", r(gta) >= 80, `got ${r(gta)}`);
check("BoC decision scores high (≥70)", r(boc) >= 70, `got ${r(boc)}`);
check("general CPI ranks below housing", r(cpi) < r(gta) && r(cpi) < 40, `cpi ${r(cpi)}`);
check("unrelated story scores lowest", r(fish) < r(cpi), `fish ${r(fish)} cpi ${r(cpi)}`);
check("scores stay within 0–100", [gta, cpi, fish, boc].every((i) => r(i) >= 0 && r(i) <= 100));
const old = make({ title: "GTA home sales and benchmark price, June", sourceId: "trreb", publishedAt: daysAgo(90) });
check("older story scores lower than same story fresh", r(old) < r(gta), `old ${r(old)} new ${r(gta)}`);
const undated = make({ title: "GTA home sales report", sourceId: "trreb", publishedAt: null });
check("undated story gets no recency points and says so", relevanceScore(undated, NOW).reasons.some((x) => x.points === 0 && /no publication date/.test(x.text.en)));
const sc = relevanceScore(gta, NOW);
eq("reasons add up to the score", sc.reasons.reduce((s, x) => s + x.points, 0) >= sc.value, true);
check("every reason has Arabic text", sc.reasons.every((x) => x.text.ar.length > 0));
const opp = opportunityScore(gta, NOW);
check("opportunity score within 0–100", opp.value >= 0 && opp.value <= 100, `${opp.value}`);
check("opportunity GTA sales > opportunity CPI", opp.value > opportunityScore(cpi, NOW).value);

// Key facts are verbatim sentences with figures
const factItem = make({ title: "x", summary: "GTA home sales totalled 5,040 in September. The market remained balanced. The average price was $1,050,000, down 2.1% year over year." });
eq("key facts quote only figure sentences", keyFacts(factItem), ["GTA home sales totalled 5,040 in September.", "The average price was $1,050,000, down 2.1% year over year."]);
eq("plain year is not a figure", keyFacts(make({ title: "x", summary: "The plan was launched in 2024 by the department." })), []);

// News filters
const store = { items: Object.fromEntries([gta, cpi, fish, boc, old].map((i) => [i.id, i])), translations: {} };
eq("filter by topic", filterItems(store, { topic: "rates", days: "all" }, new Set(), NOW).map((i) => i.id), [boc.id]);
eq("filter by location", filterItems(store, { loc: "gta", days: "all" }, new Set(), NOW).map((i) => i.id).sort(), [gta.id, old.id].sort());
eq("filter by period hides 90-day-old", filterItems(store, { days: "30" }, new Set(), NOW).some((i) => i.id === old.id), false);
eq("filter by source", filterItems(store, { src: "boc", days: "all" }, new Set(), NOW).length, 1);
eq("filter selected only", filterItems(store, { sel: "1", days: "all" }, new Set([cpi.id]), NOW).map((i) => i.id), [cpi.id]);
eq("search matches text", filterItems(store, { q: "fisheries", days: "all" }, new Set(), NOW).map((i) => i.id), [fish.id]);

// Duplicates
const a1 = make({ title: "Bank of Canada lowers policy interest rate to 2.25%", sourceId: "boc", publishedAt: daysAgo(1) });
const a2 = make({ title: "Bank of Canada lowers policy rate to 2.25 per cent", sourceId: "gc", publishedAt: daysAgo(1) });
const a3 = make({ title: "Bank of Canada lowers policy interest rate to 2.25%", sourceId: "gc", publishedAt: daysAgo(30) });
markDuplicates([a1, a2, a3]);
eq("duplicate within 3 days points to official source", a2.duplicateOf, a1.id);
eq("same title a month apart is not a duplicate", a3.duplicateOf, undefined);
const dupStore = { items: Object.fromEntries([a1, a2].map((i) => [i.id, i])), translations: {} };
eq("duplicates hidden by default", filterItems(dupStore, { days: "all" }, new Set(), NOW).length, 1);
eq("duplicates shown when asked", filterItems(dupStore, { days: "all", dup: "1" }, new Set(), NOW).length, 2);
eq("ranking skips duplicates", rankStories([a1, a2], NOW).length, 1);

// Opportunities
const ranked = rankStories([gta, cpi, fish, boc], NOW);
eq("ranked by relevance", ranked[0].relevance.value >= ranked[ranked.length - 1].relevance.value, true);
const all = buildOpportunities(ranked);
check("low-relevance stories produce no angles", !all.some((o) => o.story.item.id === fish.id));
check("audience filter: sellers", buildOpportunities(ranked, { audience: "sellers" }).every((o) => o.angle.audiences.includes("sellers")));
check("audience filter: arab", buildOpportunities(ranked, { audience: "arab" }).length > 0 && buildOpportunities(ranked, { audience: "arab" }).every((o) => o.angle.audiences.includes("arab")));
check("format filter: carousel", buildOpportunities(ranked, { format: "carousel" }).every((o) => o.angle.format === "carousel"));
check("every angle has Arabic and English", all.every((o) => o.angle.title.ar && o.angle.title.en));
check("opportunities sorted by score", all.every((o, i) => i === 0 || all[i - 1].story.opportunity.value >= o.story.opportunity.value));

console.log(fail ? `${fail} FAILED` : "ALL PASSED");
process.exit(fail ? 1 : 0);
