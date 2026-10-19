import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { markDuplicates } from "./classify";
import { SOURCES, fetchSource } from "./sources";
import type { NewsItem, NewsStore, SourceId, Translation } from "./types";

// Local JSON store, like lib/db.ts. Moves to Supabase with the rest of the data.

const STORE_PATH = path.join(process.cwd(), "data", "news.json");
const KEEP_DAYS = 120;
export const STALE_AFTER_MS = 30 * 60_000;

const empty = (): NewsStore => ({ items: {}, sources: {}, lastRefresh: null, translations: {}, selections: {} });

export async function readNews(): Promise<NewsStore> {
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(STORE_PATH, "utf8")) };
  } catch {
    return empty();
  }
}

async function writeNews(store: NewsStore) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, STORE_PATH);
}

let inFlight: Promise<NewsStore> | null = null;

/** Pulls every source in parallel. A failing source keeps its earlier items and records the error. */
export function refreshNews(): Promise<NewsStore> {
  inFlight ??= (async () => {
    const store = await readNews();
    const now = new Date().toISOString();
    const results = await Promise.allSettled(SOURCES.map((s) => fetchSource(s)));
    results.forEach((r, i) => {
      const id = SOURCES[i].id as SourceId;
      if (r.status === "fulfilled") {
        for (const item of r.value) {
          const prev = store.items[item.id];
          store.items[item.id] = { ...item, firstSeenAt: prev?.firstSeenAt ?? now };
        }
        store.sources[id] = { id, ok: true, checkedAt: now, itemCount: r.value.length };
      } else {
        store.sources[id] = { id, ok: false, checkedAt: now, itemCount: 0, error: String(r.reason?.message ?? r.reason) };
      }
    });
    const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
    for (const [id, item] of Object.entries(store.items)) {
      const t = Date.parse(item.publishedAt ?? item.firstSeenAt);
      if (t < cutoff) delete store.items[id];
    }
    markDuplicates(Object.values(store.items));
    store.lastRefresh = now;
    await writeNews(store);
    return store;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function getNews({ refreshIfStale = true } = {}) {
  const store = await readNews();
  const stale = !store.lastRefresh || Date.now() - Date.parse(store.lastRefresh) > STALE_AFTER_MS;
  return stale && refreshIfStale ? refreshNews() : store;
}

export async function saveTranslation(id: string, t: Translation) {
  const store = await readNews();
  store.translations[id] = t;
  await writeNews(store);
}

export async function toggleSelection(userId: string, id: string) {
  const store = await readNews();
  const list = new Set(store.selections[userId] ?? []);
  if (list.has(id)) list.delete(id);
  else list.add(id);
  store.selections[userId] = [...list];
  await writeNews(store);
  return list.has(id);
}

const LOCATION_RANK = { gta: 0, ontario: 1, canada: 2 } as const;
const byDate = (a: NewsItem, b: NewsItem) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");

/** "local": Toronto/GTA first, then Ontario, then national, newest first within each. */
export function sortItems(items: NewsItem[], mode: "local" | "newest") {
  return items.sort(mode === "local" ? (a, b) => LOCATION_RANK[a.location] - LOCATION_RANK[b.location] || byDate(a, b) : byDate);
}
