// Studio draft generator and export checks. Fixtures are synthetic and only
// exercise the templates; they never reach the app.
import { locationOf, topicOf } from "../lib/news/classify";
import type { NewsItem } from "../lib/news/types";
import { alternatives, figuresIn, generateAll, generateContent, snapshotOf } from "../lib/studio/generate";
import { contentText, draftMarkdown } from "../lib/studio/text";
import type { DraftContent, DraftOptions } from "../lib/studio/types";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };

const item = (p: Partial<NewsItem> & { title: string }): NewsItem => ({
  id: "s1", sourceId: "trreb", publisher: "Toronto Regional Real Estate Board", summary: "", url: "https://example.invalid/story",
  publishedAt: "2026-10-03T13:00:00.000Z", firstSeenAt: "2026-10-03T13:00:00.000Z", feedCategories: [],
  location: locationOf(p.title, "gta"), topic: topicOf(p.title), ...p,
});
const SRC = { ar: "TRREB", en: "TRREB" };
const sales = snapshotOf(item({ title: "GTA home sales and benchmark price for test month", summary: "GTA home sales totalled 4,321 in the test month. The average selling price was $987,654, down 1.5% year over year. Buyers had more choice." }), SRC);
const bare = snapshotOf(item({ id: "s2", sourceId: "gc", publisher: "Canada Mortgage and Housing Corporation", title: "Minister announces housing program for first-time home buyers", summary: "The program will support first-time home buyers." }), { ar: "حكومة كندا", en: "Government of Canada" });

const base: DraftOptions = { format: "reel", audience: "buyers", language: "both", duration: 45, slideCount: 7 };
const all = (c: DraftContent) => [c.title, c.hook, c.caption, c.cta, c.hashtags, ...(c.segments ?? []).flatMap((s) => [s.voiceover, s.onScreen, s.shot]), ...(c.slides ?? []).flatMap((s) => [s.title, s.body, s.highlight, s.visual])].join("\n");
const numbers = (s: string) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[.,]+$/, ""));

/** Every number in the draft must come from the story (title, facts, date or link). */
function noInventedNumbers(name: string, story: typeof sales, c: DraftContent) {
  const allowed = new Set([...numbers(`${story.title} ${story.facts.join(" ")} ${story.url}`), ...numbers("3 October 2026 2026-10-03")]);
  const extra = numbers(all(c)).filter((n) => !allowed.has(n));
  check(name, extra.length === 0, `numbers not in source: ${extra.join(", ")}`);
}

// Snapshot keeps the source details
check("snapshot keeps url, publisher, date", sales.url === "https://example.invalid/story" && sales.publisher === "Toronto Regional Real Estate Board" && sales.publishedAt === "2026-10-03T13:00:00.000Z");
check("snapshot facts are verbatim figure sentences", sales.facts.length === 2 && sales.facts[0] === "GTA home sales totalled 4,321 in the test month.");
check("figures parsed as written", JSON.stringify(figuresIn(sales.facts[1])) === JSON.stringify(["$987,654", "1.5%"]), JSON.stringify(figuresIn(sales.facts[1])));

// Reels
for (const duration of [30, 45, 60] as const) {
  const r = generateContent(sales, { ...base, duration }, "en");
  const segs = r.segments!;
  check(`reel ${duration}s: hook is 0–3s`, segs[0].start === 0 && segs[0].end === 3);
  check(`reel ${duration}s: segments are contiguous and end at ${duration}`, segs.every((s, i) => i === 0 || s.start === segs[i - 1].end) && segs.at(-1)!.end === duration);
  check(`reel ${duration}s: last segment is the CTA`, segs.at(-1)!.kind === "cta");
  check(`reel ${duration}s: has on-screen text and shots`, segs.every((s) => s.onScreen.length > 0 && s.shot.length > 0));
  noInventedNumbers(`reel ${duration}s EN: no invented numbers`, sales, r);
  noInventedNumbers(`reel ${duration}s AR: no invented numbers`, sales, generateContent(sales, { ...base, duration }, "ar"));
}
const en = generateContent(sales, base, "en");
check("EN reel quotes a source sentence", en.segments!.some((s) => s.kind === "fact" && s.voiceover.includes("GTA home sales totalled 4,321")));
check("EN reel caption has source, date and link", en.caption.includes("TRREB") && en.caption.includes("October 3, 2026") && en.caption.includes("https://example.invalid/story"));
check("caption carries the not-advice line", en.caption.includes("not financial or legal advice"));
check("hashtags are topic-related", en.hashtags.includes("#TorontoRealEstate") && en.hashtags.split(" ").every((h) => h.startsWith("#")));

// Arabic is its own template, not a copy of the English
const ar = generateContent(sales, base, "ar");
check("AR reel is Arabic", /[؀-ۿ]/.test(ar.hook) && /[؀-ۿ]/.test(ar.segments![1].voiceover));
check("EN reel has no Arabic", !/[؀-ۿ]/.test(all(en)));
check("AR without translation keeps figures and leaves a reviewer note with the source sentence", ar.segments!.some((s) => s.voiceover.includes("4,321") && s.note?.includes("GTA home sales totalled 4,321")));
check("both languages generated", Object.keys(generateAll(sales, base)).join() === "ar,en");
check("single language generated", Object.keys(generateAll(sales, { ...base, language: "ar" })).join() === "ar");

// Audience changes the angle
const sellers = generateContent(sales, { ...base, audience: "sellers" }, "en");
check("audience changes the hook", sellers.hook !== en.hook && sellers.hook.toLowerCase().includes("selling"));
check("audience changes the explanation", sellers.segments!.find((s) => s.kind === "explain" && s.voiceover.startsWith("In general"))!.voiceover !== en.segments!.find((s) => s.kind === "explain" && s.voiceover.startsWith("In general"))!.voiceover);

// Carousels
const car = generateContent(sales, { ...base, format: "carousel" }, "en");
check("carousel defaults to 7 slides", car.slides!.length === 7);
check("carousel: cover first, CTA last", car.slides![0].visual.length > 0 && car.slides!.at(-1)!.kind === "cta");
check("carousel uses source facts", car.slides!.filter((s) => s.kind === "fact").some((s) => s.body.includes("$987,654")));
for (const n of [5, 6, 8, 10]) check(`carousel honours ${n} slides`, generateContent(sales, { ...base, format: "carousel", slideCount: n }, "ar").slides!.length === n);
noInventedNumbers("carousel EN: no invented numbers", sales, car);
noInventedNumbers("carousel AR (10 slides): no invented numbers", sales, generateContent(sales, { ...base, format: "carousel", slideCount: 10 }, "ar"));

// A story without figures stays general
check("story without figures has no facts", bare.facts.length === 0);
const bareReel = generateContent(bare, { ...base, duration: 60 }, "en");
noInventedNumbers("figure-less story: no invented numbers", bare, bareReel);
noInventedNumbers("figure-less carousel AR: no invented numbers", bare, generateContent(bare, { ...base, format: "carousel", slideCount: 10 }, "ar"));
check("figure-less story says details are at the link", bareReel.segments!.some((s) => s.voiceover.includes("official link")));

// Alternatives and exports
const alts = alternatives(sales, "buyers", "ar", "hook");
check("three distinct hook alternatives", new Set(alts).size === 3);
const md = draftMarkdown({ story: sales, content: generateAll(sales, base), status: "review", format: "reel" });
check("markdown export has source link and date", md.includes("https://example.invalid/story") && md.includes("2026-10-03"));
check("markdown export has both languages", md.includes("## العربية") && md.includes("## English"));
check("markdown export lists review notes", md.includes("ملاحظات للمراجعة"));
check("copy-all text leaves review notes out", !contentText(ar, "ar").includes("الجملة الأصلية"));

console.log(fail ? `${fail} FAILED` : "ALL PASSED");
process.exit(fail ? 1 : 0);
