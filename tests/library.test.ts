// Content library, workflow and export checks (step 5). Fixtures are synthetic.
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { locationOf, topicOf } from "../lib/news/classify";
import type { NewsItem } from "../lib/news/types";
import { generateAll, snapshotOf } from "../lib/studio/generate";
import { draftStats, filterDrafts, fold, summarize, torontoDate } from "../lib/studio/library";
import { normalizeDraft, withHistory } from "../lib/studio/normalize";
import { draftJson, draftMarkdown, draftPlainText } from "../lib/studio/text";
import { HISTORY_MAX, type Draft, type DraftOptions } from "../lib/studio/types";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };

const item = (p: Partial<NewsItem> & { title: string }): NewsItem => ({
  id: "s1", sourceId: "trreb", publisher: "Toronto Regional Real Estate Board", summary: "", url: "https://example.invalid/story",
  publishedAt: "2026-10-03T13:00:00.000Z", firstSeenAt: "2026-10-03T13:00:00.000Z", feedCategories: [],
  location: locationOf(p.title, "gta"), topic: topicOf(p.title), ...p,
});
const story = snapshotOf(item({ title: "GTA home sales and benchmark price for test month", summary: "GTA home sales totalled 4,321 in the test month. The average selling price was $987,654, down 1.5% year over year." }), { ar: "TRREB", en: "TRREB" });
const opts: DraftOptions = { format: "reel", audience: "buyers", language: "both", duration: 45, slideCount: 7 };

function draft(id: string, patch: Partial<Draft> = {}): Draft {
  const o = { ...opts, ...patch };
  return {
    ...o, id, status: "draft", story, content: generateAll(story, o, 0), variant: 0, generatedBy: "template", limited: false,
    createdBy: "amona", createdAt: "2026-10-10T14:00:00.000Z", updatedAt: "2026-10-10T14:00:00.000Z", history: [], ...patch,
  } as Draft;
}

// 1. Drafts saved before step 5 still open
const legacy = { ...draft("old1"), status: "ready" } as Record<string, unknown>;
delete legacy.history;
const n1 = normalizeDraft(legacy);
check("legacy draft without history opens", !!n1 && Array.isArray(n1.history) && n1.history.length === 0);
check("legacy 'ready' stays ready (ready to export)", n1?.status === "ready");
check("unknown status falls back to draft, never approved", normalizeDraft({ ...legacy, status: "published" })?.status === "draft");
check("missing createdAt falls back to updatedAt", normalizeDraft({ ...legacy, createdAt: undefined })?.createdAt === "2026-10-10T14:00:00.000Z");
check("missing format is read from the content", normalizeDraft({ ...legacy, format: undefined })?.format === "reel");
check("language follows the stored content", normalizeDraft({ ...legacy, language: "en", content: { ar: (legacy.content as Draft["content"]).ar } })?.language === "ar");
check("draft without source link is rejected, not guessed", normalizeDraft({ ...legacy, story: { ...story, url: "" } }) === null);
check("draft without any content is rejected", normalizeDraft({ ...legacy, content: {} }) === null);
check("non-object is rejected", normalizeDraft("x") === null && normalizeDraft(null) === null);
const partial = normalizeDraft({ ...legacy, content: { ar: { title: "عنوان", hook: 5, segments: [{ voiceover: "نص" }, "bad"] } } });
check("partial content gets safe defaults", partial?.content.ar?.hook === "" && partial.content.ar.segments?.length === 1 && partial.content.ar.segments[0].kind === "explain");
check("normalising does not change facts or links", n1?.story.url === story.url && JSON.stringify(n1?.story.facts) === JSON.stringify(story.facts));

// 2. History is capped
let d = draft("h1");
for (let i = 0; i < HISTORY_MAX + 5; i++) d = { ...d, history: withHistory(d, { at: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(), by: "amona", action: "edited" }) };
check(`history keeps the newest ${HISTORY_MAX}`, d.history.length === HISTORY_MAX && d.history.at(-1)!.at.endsWith("00:34:00.000Z"));

// 3. Search, filters and stats
const list = [
  draft("a", { status: "draft", createdAt: "2026-10-01T15:00:00.000Z" }),
  draft("b", { status: "review", format: "carousel", language: "en", content: generateAll(story, { ...opts, format: "carousel", language: "en" }, 0), createdAt: "2026-10-05T15:00:00.000Z" }),
  draft("c", { status: "approved", language: "ar", content: generateAll(story, { ...opts, language: "ar" }, 0), createdAt: "2026-10-09T03:30:00.000Z" }),
  draft("d", { status: "ready", createdAt: "2026-10-12T15:00:00.000Z" }),
  draft("e", { status: "changes", format: "carousel", content: generateAll(story, { ...opts, format: "carousel" }, 0), createdAt: "2026-10-12T16:00:00.000Z" }),
];
const sums = list.map((x) => summarize(x, "ar"));
const ids = (f: Parameters<typeof filterDrafts>[1]) => filterDrafts(sums, f).map((x) => x.id).join();
check("no filter returns all", ids({}) === "a,b,c,d,e");
check("filter by format", ids({ format: "carousel" }) === "b,e");
check("filter by language", ids({ language: "en" }) === "b" && ids({ language: "both" }) === "a,d,e");
check("filter by status", ids({ status: "approved" }) === "c" && ids({ status: "changes" }) === "e");
check("date range is inclusive, in Toronto time", ids({ from: "2026-10-05", to: "2026-10-08" }) === "b,c", ids({ from: "2026-10-05", to: "2026-10-08" }));
check("Toronto date of an early-UTC timestamp is the day before", torontoDate("2026-10-09T03:30:00.000Z") === "2026-10-08");
check("filters combine", ids({ format: "carousel", status: "review" }) === "b");
check("search matches the story title", ids({ q: "benchmark" }) === "a,b,c,d,e");
check("search matches English content", ids({ q: "GTA home sales totalled 4,321", language: "en" }) === "b");
check("search ignores hamza and diacritics", fold("أسعارُ") === fold("اسعار"));
check("search with no match is empty", ids({ q: "zzzz-no-match" }) === "");
check("search matches Arabic content", filterDrafts(sums, { q: sums[2].title.split(" ")[0] }).some((x) => x.id === "c"));
const st = draftStats(list);
check("stats count every status", st.total === 5 && st.byStatus.draft === 1 && st.byStatus.review === 1 && st.byStatus.changes === 1 && st.byStatus.approved === 1 && st.byStatus.ready === 1);
check("stats match the library filters", (["draft", "review", "changes", "approved", "ready"] as const).every((s) => filterDrafts(sums, { status: s }).length === st.byStatus[s]));
check("stats split formats", st.reels === 3 && st.carousels === 2);
check("summary keeps source link and preview", sums[0].story.url === story.url && sums[0].preview.length > 0 && sums[0].preview.length <= 180);

// 4. Exports keep every character and line break
const full = { ...list[0], status: "approved" as const };
full.content.ar!.caption = "سطر أول بالعربي مع TRREB و 4,321 و 1.5%\n\nسطر ثاني: «اقتباس» — رموز $ % # @ & *نجمة*";
full.content.en!.caption = "First line\n\nSecond line with \"quotes\", $987,654 and 1.5% — done.";
const md = draftMarkdown(full);
const txt = draftPlainText(full);
const json = JSON.parse(draftJson(full));
check("markdown has the details block", ["نوع المحتوى: ريل", "اللغة: عربي وإنجليزي", "حالة المراجعة: معتمدة", "تاريخ إنشاء المسودة: 2026-10-01", story.title, story.url, "تاريخ الخبر: 2026-10-03"].every((x) => md.includes(x)));
check("markdown keeps Arabic caption with its blank line", md.includes(full.content.ar!.caption));
check("markdown keeps English caption", md.includes(full.content.en!.caption));
check("text export keeps both captions untouched", txt.includes(full.content.ar!.caption) && txt.includes(full.content.en!.caption));
check("text export has no markdown headings", !/^#/m.test(txt));
check("JSON export parses and round-trips the content exactly", JSON.stringify(json.content) === JSON.stringify(full.content));
check("JSON export has status, type, language and source", json.status === "approved" && json.contentType === "reel" && json.language === "both" && json.source.url === story.url && json.source.publishedAt === story.publishedAt && json.createdAt === full.createdAt);
check("JSON export says it is a template draft", json.generatedBy === "template" && json.reviewNote.en.includes("human review"));
const enOnly = draftMarkdown({ ...list[1] });
check("English-only export labels in English", enOnly.includes("- Format: Carousel") && enOnly.includes("- Review status: In review") && !enOnly.includes("## العربية"));

// 5. Store: old files open, unreadable records are kept, broken files are never overwritten
async function storeChecks() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "baha-store-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await fs.mkdir("data");
    const file = path.join(dir, "data", "drafts.json");
    await fs.writeFile(file, JSON.stringify({ drafts: { old1: legacy, broken: { id: "broken", story: {} } } }));
    const store = await import("../lib/studio/store");
    const r = await store.readDrafts();
    check("store reads a pre-step-5 file", r.drafts.length === 1 && r.drafts[0].id === "old1" && r.unreadable === 1);
    const patched = await store.patchDraft("old1", (x) => ({ ...x, status: "approved", history: withHistory(x, { at: new Date().toISOString(), by: "amona", action: "status", status: "approved" }) }));
    const after = JSON.parse(await fs.readFile(file, "utf8"));
    check("status change persists to the file", patched?.status === "approved" && after.drafts.old1.status === "approved" && after.drafts.old1.history.length === 1);
    check("unreadable record is left in the file", !!after.drafts.broken);
    await fs.writeFile(file, "{ not json");
    let threw = false;
    try { await store.putDraft(draft("new")); } catch { threw = true; }
    check("a broken file is not overwritten", threw && (await fs.readFile(file, "utf8")) === "{ not json");
    await fs.rm(file);
    check("a missing file reads as an empty library", (await store.readDrafts()).drafts.length === 0);
  } finally {
    process.chdir(cwd);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

storeChecks().then(() => {
  console.log(fail ? `${fail} FAILED` : "ALL PASSED");
  process.exit(fail ? 1 : 0);
});
