import "server-only";
import { refreshAll } from "../sources/refresh";
import { DataFileError } from "../storage/json-file";
import { emptyNews, newsRepo } from "../storage/repositories";
import type { NewsItem, NewsStore, Translation } from "./types";

// News stories, translations and selections, stored in data/news.json through
// the storage layer (lib/storage). Every change is applied to the newest copy of
// the file under its lock, and a file that can't be parsed is never written over.

/** For display. A damaged file reads as empty (and is reported) so pages still open; it is never overwritten. */
export async function readNews(): Promise<NewsStore> {
  try {
    return await newsRepo.read();
  } catch (e) {
    if (!(e instanceof DataFileError)) throw e;
    console.error(e.message);
    return emptyNews();
  }
}

/** Pulls every connected source now ("Refresh now"). A failing source keeps its earlier items and records the error. */
export async function refreshNews(): Promise<NewsStore> {
  return (await refreshAll({ force: true })).store;
}

/** The stored news, refreshing the sources whose last check is older than 30 minutes. */
export async function getNews({ refreshIfStale = true } = {}) {
  if (!refreshIfStale) return readNews();
  try {
    return (await refreshAll()).store;
  } catch (e) {
    // A busy or damaged file must not take the page down; show what is stored.
    console.error("News refresh skipped:", (e as Error).message);
    return readNews();
  }
}

export async function saveTranslation(id: string, t: Translation) {
  await newsRepo.update((s) => {
    s.translations[id] = t;
  });
}

export async function toggleSelection(userId: string, id: string) {
  return newsRepo.update((s) => {
    const list = new Set(s.selections[userId] ?? []);
    if (list.has(id)) list.delete(id);
    else list.add(id);
    s.selections[userId] = [...list];
    return list.has(id);
  });
}

const LOCATION_RANK = { gta: 0, ontario: 1, canada: 2 } as const;
const byDate = (a: NewsItem, b: NewsItem) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");

/** "local": Toronto/GTA first, then Ontario, then national, newest first within each. */
export function sortItems(items: NewsItem[], mode: "local" | "newest") {
  return items.sort(mode === "local" ? (a, b) => LOCATION_RANK[a.location] - LOCATION_RANK[b.location] || byDate(a, b) : byDate);
}
