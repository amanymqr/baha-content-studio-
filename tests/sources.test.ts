// Source registry and refresh. Fake sources only; runs in a temporary folder.
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { SourceDef } from "../lib/news/sources";
import { SOURCES } from "../lib/news/sources";
import type { NewsItem } from "../lib/news/types";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };
const repoRoot = process.cwd();

const story = (id: string, sourceId: NewsItem["sourceId"], title = `Story ${id}`): Omit<NewsItem, "firstSeenAt"> => ({
  id, sourceId, publisher: "Test publisher", title, summary: "", url: `https://example.invalid/${id}`,
  publishedAt: new Date().toISOString(), feedCategories: [], location: "canada", topic: "other",
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Read-only check of the real data before switching folders: the new layer reads it exactly as stored.
  const realNews = path.join(repoRoot, "data", "news.json");
  const raw = await fs.readFile(realNews, "utf8").catch(() => null);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "baha-sources-"));
  process.chdir(dir);
  try {
    const { REGISTRY, connectedNewsSources } = await import("../lib/sources/registry");
    const { refreshAll, dueSources } = await import("../lib/sources/refresh");
    const { newsRepo, sourceRunsRepo, RUNS_KEPT, emptyNews } = await import("../lib/storage/repositories");
    const { readNews, saveTranslation, toggleSelection, getNews } = await import("../lib/news/store");

    if (raw !== null) {
      process.chdir(repoRoot);
      const viaLayer = await newsRepo.read();
      const before = JSON.parse(raw);
      check("the current data/news.json reads through the new layer unchanged", JSON.stringify(viaLayer.items) === JSON.stringify(before.items) && JSON.stringify(viaLayer.selections) === JSON.stringify(before.selections) && JSON.stringify(viaLayer.translations ?? {}) === JSON.stringify(before.translations ?? {}));
      check("reading it did not change the file", (await fs.readFile(realNews, "utf8")) === raw);
      process.chdir(dir);
    }

    // Registry
    const ids = REGISTRY.map((s) => s.id);
    check("registry ids are unique", new Set(ids).size === ids.length);
    check("the four current feeds are the connected news sources", connectedNewsSources().map((s) => s.id).sort().join() === SOURCES.map((s) => s.id).sort().join());
    check("CREA, CMHC and Ontario are listed as unavailable, not fetched", ["crea", "cmhc", "ontario"].every((id) => REGISTRY.find((s) => s.id === id)?.status === "unavailable"));
    check("TRREB and CREA statistics need a licence", ["trreb-stats", "crea-stats"].every((id) => REGISTRY.find((s) => s.id === id)?.status === "license"));
    check("every source not connected says why", REGISTRY.filter((s) => s.status !== "connected").every((s) => !!s.note?.ar && !!s.note?.en));

    // Refresh with fake sources
    let calls: string[] = [];
    const okFetcher = async (def: SourceDef) => { calls.push(def.id); return [story(`${def.id}-1`, def.id)]; };
    const r1 = await refreshAll({ fetcher: okFetcher });
    check("a first refresh fetches every connected source", r1.runs.length === SOURCES.length && calls.length === SOURCES.length && Object.keys(r1.store.items).length === SOURCES.length);
    calls = [];
    const r2 = await refreshAll({ fetcher: okFetcher });
    check("sources checked within 30 minutes are skipped", r2.runs.length === 0 && calls.length === 0 && r2.skipped.length === SOURCES.length);
    const r3 = await refreshAll({ fetcher: okFetcher, force: true });
    check("forced refresh fetches everything again", r3.runs.length === SOURCES.length);
    const later = Date.now() + 31 * 60_000;
    check("sources are due again after 30 minutes", dueSources(await newsRepo.read(), later, false).length === SOURCES.length);

    const first = (await newsRepo.read()).items["boc-1"].firstSeenAt;
    await sleep(5);
    await refreshAll({ fetcher: okFetcher, force: true });
    check("a story keeps its first-seen time across refreshes", (await newsRepo.read()).items["boc-1"].firstSeenAt === first);

    const failing = async (def: SourceDef) => { if (def.id === "trreb") throw new Error("HTTP 503"); return [story(`${def.id}-2`, def.id)]; };
    const r4 = await refreshAll({ fetcher: failing, force: true });
    const st = await newsRepo.read();
    check("a failing source keeps its earlier stories", !!st.items["trreb-1"] && !st.items["trreb-2"]);
    check("its status records the error", st.sources.trreb?.ok === false && st.sources.trreb?.error === "HTTP 503" && st.sources.boc?.ok === true);
    check("the run log records success and failure", r4.runs.find((r) => r.sourceId === "trreb")?.ok === false && r4.runs.find((r) => r.sourceId === "boc")?.ok === true);
    const runs = (await sourceRunsRepo.read()).runs;
    check("runs are stored per source", (runs.boc?.length ?? 0) === 4 && runs.trreb?.at(-1)?.error === "HTTP 503");
    for (let i = 0; i < RUNS_KEPT + 5; i++) await refreshAll({ fetcher: okFetcher, force: true });
    check(`the run log keeps the newest ${RUNS_KEPT} per source`, (await sourceRunsRepo.read()).runs.boc.length === RUNS_KEPT);

    // User changes made while a refresh is fetching are not lost
    const slow = async (def: SourceDef) => { await sleep(300); return [story(`${def.id}-slow`, def.id)]; };
    const refreshing = refreshAll({ fetcher: slow, force: true });
    await sleep(50);
    await toggleSelection("amona", "boc-1");
    await saveTranslation("boc-1", { titleAr: "عنوان", summaryAr: "ملخص", model: "test", createdAt: new Date().toISOString() });
    await refreshing;
    const after = await newsRepo.read();
    check("a selection saved during a refresh is kept", after.selections.amona?.includes("boc-1") === true);
    check("a translation saved during a refresh is kept", after.translations["boc-1"]?.titleAr === "عنوان");
    check("and the refresh's stories are there too", !!after.items["boc-slow"]);

    // Damaged file
    const newsFile = newsRepo.file();
    await fs.writeFile(newsFile, "{ damaged");
    let threw = false;
    try { await refreshAll({ fetcher: okFetcher, force: true }); } catch { threw = true; }
    check("a refresh on a damaged news.json throws and leaves it as is", threw && (await fs.readFile(newsFile, "utf8")) === "{ damaged");
    check("pages still open: a damaged file reads as empty for display", JSON.stringify(await readNews()) === JSON.stringify(emptyNews()));
    const shown = await getNews();
    check("the news page falls back to the stored data instead of failing", Object.keys(shown.items).length === 0 && (await fs.readFile(newsFile, "utf8")) === "{ damaged");
    threw = false;
    try { await toggleSelection("amona", "x"); } catch { threw = true; }
    check("selecting on a damaged file fails without writing", threw && (await fs.readFile(newsFile, "utf8")) === "{ damaged");
  } finally {
    process.chdir(repoRoot);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

main().then(() => {
  console.log(fail ? `${fail} FAILED` : "ALL PASSED");
  process.exit(fail ? 1 : 0);
});
