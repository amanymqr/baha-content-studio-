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
import { duplicateWithGuard } from "../lib/studio/guard";
import { APPROVED_STATUSES, applySave, contentChanged } from "../lib/studio/workflow";
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

// 5. Approval follows the text: changed text on an approved draft goes back to review
const at = "2026-10-21T10:00:00.000Z";
const edited = (x: Draft) => { const c = structuredClone(x.content); c.ar!.caption += " (معدّل)"; return c; };
const approvedDraft = draft("ap", { status: "approved" });
const a1 = applySave(approvedDraft, { content: edited(approvedDraft) }, "amona", at);
check("editing approved text sends it back to review", a1.status === "review" && a1.content.ar!.caption.endsWith("(معدّل)"));
check("the change is logged as an edit and a status change", JSON.stringify(a1.history.slice(-2).map((h) => [h.action, h.status ?? null])) === JSON.stringify([["edited", null], ["status", "review"]]) && a1.updatedAt === at);
const readyDraft = draft("rd", { status: "ready" });
check("editing 'ready to export' text also sends it back to review", applySave(readyDraft, { content: edited(readyDraft) }, "amona", at).status === "review");
const reorder = (v: unknown): unknown => (Array.isArray(v) ? v.map(reorder) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reorder(x)])) : v);
const sameText = applySave(approvedDraft, { content: reorder(approvedDraft.content) as Draft["content"] }, "amona", at);
check("saving approved text unchanged keeps the approval", sameText.status === "approved" && !sameText.history.some((h) => h.action === "status"));
check("a changed segment or slide counts as a text change", applySave(approvedDraft, { content: { ...approvedDraft.content, en: { ...approvedDraft.content.en!, segments: approvedDraft.content.en!.segments!.map((s, i) => (i ? s : { ...s, onScreen: s.onScreen + "!" })) } } }, "amona", at).status === "review");
check("dropping a language counts as a text change", applySave(approvedDraft, { content: { ar: approvedDraft.content.ar } }, "amona", at).status === "review");
for (const s of ["draft", "review", "changes"] as const) {
  const x = draft(`n-${s}`, { status: s });
  const r = applySave(x, { content: edited(x) }, "amona", at);
  check(`editing a '${s}' draft keeps its status`, r.status === s && !r.history.some((h) => h.action === "status"));
}
const chosen = applySave(draft("ch", { status: "review" }), { status: "approved", content: edited(draft("ch")) }, "baha", at);
check("a status picked with the save is applied as chosen", chosen.status === "approved" && chosen.history.at(-1)?.status === "approved" && chosen.history.at(-1)?.by === "baha");
check("contentChanged ignores key order and missing optional notes", !contentChanged(approvedDraft.content, structuredClone(approvedDraft.content)) && !contentChanged({ ar: { ...approvedDraft.content.ar!, segments: approvedDraft.content.ar!.segments!.map((s) => ({ ...s, note: undefined })) } }, { ar: { ...approvedDraft.content.ar!, segments: approvedDraft.content.ar!.segments!.map(({ note, ...s }) => s) } }));
// Every combination: after a plain save, an approved status only remains when the text is the one that was approved
const combos = (["draft", "review", "changes", "approved", "ready"] as const).flatMap((s) => [false, true].map((change) => {
  const x = draft(`c-${s}`, { status: s });
  const r = applySave(x, { content: change ? edited(x) : structuredClone(x.content) }, "amona", at);
  return !APPROVED_STATUSES.includes(r.status) || (APPROVED_STATUSES.includes(s) && !contentChanged(x.content, r.content));
}));
check("approval always matches the current text after a save", combos.every(Boolean));

// 6. Duplicate never drops unsaved edits: it asks, then saves before copying, or does nothing
async function duplicateChecks() {
  /** A saved draft, the text on screen, and the copies made, with every step recorded. */
  const setup = (dirty: boolean, answer: boolean, saveOk = true) => {
    const saved = draft("orig", { status: "approved" });
    const original = structuredClone(saved.content);
    const screen = dirty ? edited(saved) : structuredClone(saved.content);
    const s = { stored: saved, screen, copies: [] as Draft[], steps: [] as string[] };
    const run = () => duplicateWithGuard({
      dirty,
      ask: async () => (s.steps.push("ask"), answer),
      save: async () => {
        s.steps.push("save");
        if (!saveOk) return false;
        s.stored = applySave(s.stored, { content: structuredClone(s.screen) }, "amona", at);
        return true;
      },
      duplicate: async () => (s.steps.push("duplicate"), s.copies.push({ ...structuredClone(s.stored), id: "copy", status: "draft" }), true),
    });
    return { s, original, run };
  };

  const clean = setup(false, true);
  const r1 = await clean.run();
  check("duplicate without unsaved edits copies at once, no question", r1 === "duplicated" && clean.s.steps.join() === "duplicate");
  check("the copy has the saved text and the original is unchanged", JSON.stringify(clean.s.copies[0].content) === JSON.stringify(clean.original) && JSON.stringify(clean.s.stored.content) === JSON.stringify(clean.original) && clean.s.stored.status === "approved");

  const cancel = setup(true, false);
  const screenBefore = JSON.stringify(cancel.s.screen);
  const r2 = await cancel.run();
  check("duplicate with unsaved edits asks first", cancel.s.steps[0] === "ask");
  check("cancelling saves nothing and copies nothing", r2 === "cancelled" && cancel.s.steps.join() === "ask" && cancel.s.copies.length === 0);
  check("after cancelling, the saved text and the edits on screen are both intact", JSON.stringify(cancel.s.stored.content) === JSON.stringify(cancel.original) && JSON.stringify(cancel.s.screen) === screenBefore && cancel.s.stored.status === "approved");

  const ok = setup(true, true);
  const r3 = await ok.run();
  check("confirming saves the edits, then duplicates", r3 === "duplicated" && ok.s.steps.join() === "ask,save,duplicate");
  check("the edits are kept in the draft and in the copy", JSON.stringify(ok.s.stored.content) === JSON.stringify(ok.s.screen) && JSON.stringify(ok.s.copies[0].content) === JSON.stringify(ok.s.screen) && ok.s.copies[0].content.ar!.caption.endsWith("(معدّل)"));
  check("saving edited approved text before copying still sends it back to review", ok.s.stored.status === "review");

  const failed = setup(true, true, false);
  const failedScreen = JSON.stringify(failed.s.screen);
  const r4 = await failed.run();
  check("if saving fails, no copy is made and the edits stay on screen", r4 === "save_failed" && failed.s.copies.length === 0 && failed.s.steps.join() === "ask,save" && JSON.stringify(failed.s.screen) === failedScreen);
  let copied = false;
  const thrown = await duplicateWithGuard({ dirty: true, ask: async () => true, save: async () => { throw new Error("network"); }, duplicate: async () => (copied = true) }).then(() => "resolved", (e: Error) => e.message);
  check("a save that throws reaches the caller (so the editor can stop loading) and no copy is made", thrown === "network" && !copied);
  check("a failed copy is reported", (await duplicateWithGuard({ dirty: false, ask: async () => true, save: async () => true, duplicate: async () => false })) === "duplicate_failed");
}

// 7. Store: old files open, unreadable records are kept, broken files are never overwritten
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
    await store.patchDraft("old1", (x) => applySave(x, { content: edited(x) }, "amona", new Date().toISOString()));
    const reopened = JSON.parse(await fs.readFile(file, "utf8")).drafts.old1;
    check("edited approved text is stored back in review", reopened.status === "review" && reopened.content.ar.caption.endsWith("(معدّل)") && !!after.drafts.broken);

    // Safe storage layer: backups, simultaneous saves and conflicts
    const backups = await fs.readdir(path.join(dir, "data", "backups")).catch(() => [] as string[]);
    check("drafts.json gets a daily backup before the day's first change", backups.some((n) => /^drafts-\d{4}-\d{2}-\d{2}\.json$/.test(n)));
    await store.putDraft(draft("c1"));
    await store.putDraft(draft("c2"));
    await Promise.all([
      store.patchDraft("c1", (x) => ({ ...x, status: "review" })),
      store.patchDraft("c2", (x) => ({ ...x, status: "changes" })),
      store.putDraft(draft("c3")),
    ]);
    const both = JSON.parse(await fs.readFile(file, "utf8")).drafts;
    check("changes saved at the same moment are all kept", both.c1.status === "review" && both.c2.status === "changes" && !!both.c3 && !!both.old1 && !!both.broken);
    const opened = (await store.getDraft("c1"))!;
    const stamp = new Date(Date.now() + 1000).toISOString();
    await store.patchDraft("c1", (x) => ({ ...x, content: edited(x), updatedAt: stamp }), { expectedUpdatedAt: opened.updatedAt });
    const beforeConflict = await fs.readFile(file, "utf8");
    let conflict: unknown = null;
    try { await store.patchDraft("c1", (x) => ({ ...x, status: "approved" }), { expectedUpdatedAt: opened.updatedAt }); } catch (e) { conflict = e; }
    check("a save based on an older copy is refused (someone saved meanwhile)", conflict instanceof store.DraftConflictError && (conflict as InstanceType<typeof store.DraftConflictError>).current.updatedAt === stamp);
    check("a refused save writes nothing", (await fs.readFile(file, "utf8")) === beforeConflict);
    check("a save based on the current copy goes through", (await store.patchDraft("c1", (x) => ({ ...x, status: "approved" }), { expectedUpdatedAt: stamp }))?.status === "approved");
    await fs.writeFile(file, JSON.stringify({ drafts: [] }));
    let shape = false;
    try { await store.putDraft(draft("x")); } catch { shape = true; }
    check("a drafts file with the wrong shape reads as empty and is never written over", shape && (await store.readDrafts()).drafts.length === 0 && (await fs.readFile(file, "utf8")) === JSON.stringify({ drafts: [] }));
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

duplicateChecks().then(storeChecks).then(() => {
  console.log(fail ? `${fail} FAILED` : "ALL PASSED");
  process.exit(fail ? 1 : 0);
});
