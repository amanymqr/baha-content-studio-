import type { NewsItem, NewsStore } from "./types";

export type NewsFilter = { q?: string; topic?: string; loc?: string; src?: string; days?: string; sel?: string; dup?: string };

/** The News page filters, kept pure so they can be tested. Items without a date are never hidden by the period filter. */
export function filterItems(store: Pick<NewsStore, "items" | "translations">, f: NewsFilter, selections: Set<string>, now = Date.now()): NewsItem[] {
  const days = f.days === "all" ? null : Number(f.days ?? 30);
  const since = days ? now - days * 86_400_000 : null;
  const q = f.q?.trim().toLowerCase();
  return Object.values(store.items).filter((i) => {
    if (f.dup !== "1" && i.duplicateOf) return false;
    if (f.topic && i.topic !== f.topic) return false;
    if (f.loc && i.location !== f.loc) return false;
    if (f.src && i.sourceId !== f.src) return false;
    if (f.sel === "1" && !selections.has(i.id)) return false;
    if (since && i.publishedAt && Date.parse(i.publishedAt) < since) return false;
    if (q) {
      const tr = store.translations[i.id];
      const hay = `${i.title} ${i.summary} ${i.publisher} ${tr?.titleAr ?? ""} ${tr?.summaryAr ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
