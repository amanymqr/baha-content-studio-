import "server-only";
import { markDuplicates } from "../news/classify";
import { SOURCES, fetchSource, type SourceDef } from "../news/sources";
import type { NewsItem, NewsStore, SourceId } from "../news/types";
import { newsRepo, recordRuns, type SourceRun } from "../storage/repositories";
import { NEWS_REFRESH_MS, connectedNewsSources } from "./registry";

// One refresh path for the page, the "Refresh now" button and `npm run refresh`.
// Sources are fetched first, outside any lock. The results are then merged into
// the newest copy of news.json under the file lock, touching only the stories
// and the source status, so a selection or translation saved meanwhile is kept.

const KEEP_DAYS = 120;

type Fetched = Omit<NewsItem, "firstSeenAt">[];
export type Fetcher = (def: SourceDef) => Promise<Fetched>;
export type RefreshResult = { store: NewsStore; runs: SourceRun[]; skipped: SourceId[] };

/** Sources whose last check is older than their refresh interval, or all of them when forced. */
export function dueSources(store: NewsStore, now: number, force: boolean) {
  const ids = new Set(connectedNewsSources().map((s) => s.id));
  return SOURCES.filter((s) => ids.has(s.id)).filter((s) => {
    if (force) return true;
    const checked = store.sources[s.id as SourceId]?.checkedAt;
    return !checked || now - Date.parse(checked) > NEWS_REFRESH_MS;
  });
}

let inFlight: Promise<RefreshResult> | null = null;

/** Refreshes the sources that are due (all of them with force). Concurrent calls in one process share the same run. */
export function refreshAll(opts: { force?: boolean; fetcher?: Fetcher; now?: () => number } = {}): Promise<RefreshResult> {
  inFlight ??= run(opts).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run({ force = false, fetcher = fetchSource, now = Date.now }: { force?: boolean; fetcher?: Fetcher; now?: () => number }): Promise<RefreshResult> {
  const before = await newsRepo.read();
  const due = dueSources(before, now(), force);
  const skipped = SOURCES.filter((s) => !due.includes(s)).map((s) => s.id as SourceId);
  if (!due.length) return { store: before, runs: [], skipped };

  const results = await Promise.all(
    due.map(async (def) => {
      const startedAt = now();
      try {
        const items = await fetcher(def);
        return { def, startedAt, finishedAt: now(), items, error: null as string | null };
      } catch (e) {
        return { def, startedAt, finishedAt: now(), items: [] as Fetched, error: String((e as Error)?.message ?? e) };
      }
    }),
  );

  const checkedAt = new Date(now()).toISOString();
  const store = await newsRepo.update((s) => {
    for (const r of results) {
      const id = r.def.id as SourceId;
      if (r.error === null) {
        for (const item of r.items) s.items[item.id] = { ...item, firstSeenAt: s.items[item.id]?.firstSeenAt ?? checkedAt };
        s.sources[id] = { id, ok: true, checkedAt, itemCount: r.items.length };
      } else {
        // A failing source keeps its earlier stories and records why it failed.
        s.sources[id] = { id, ok: false, checkedAt, itemCount: 0, error: r.error };
      }
    }
    const cutoff = now() - KEEP_DAYS * 86_400_000;
    for (const [id, item] of Object.entries(s.items)) if (Date.parse(item.publishedAt ?? item.firstSeenAt) < cutoff) delete s.items[id];
    markDuplicates(Object.values(s.items));
    s.lastRefresh = checkedAt;
    return s;
  });

  const runs: SourceRun[] = results.map((r) => ({
    sourceId: r.def.id,
    startedAt: new Date(r.startedAt).toISOString(),
    finishedAt: new Date(r.finishedAt).toISOString(),
    durationMs: r.finishedAt - r.startedAt,
    ok: r.error === null,
    itemCount: r.items.length,
    ...(r.error === null ? {} : { error: r.error }),
  }));
  // The run log is for diagnosis; a problem writing it must not undo a good refresh.
  await recordRuns(runs).catch((e) => console.error("Could not record source runs:", (e as Error).message));
  return { store, runs, skipped };
}
