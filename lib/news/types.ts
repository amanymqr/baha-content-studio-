export type SourceId = "boc" | "trreb" | "statcan" | "gc";
export type Location = "gta" | "ontario" | "canada";
export type Topic = "rates" | "prices" | "market" | "rentals" | "construction" | "policy" | "other";

export type NewsItem = {
  id: string;
  sourceId: SourceId;
  /** Publisher as written by the source, e.g. the federal department name. */
  publisher: string;
  title: string;
  /** Plain-text summary from the feed itself (English). */
  summary: string;
  /** Longer article text when the feed includes it (TRREB does). */
  body?: string;
  url: string;
  /** ISO timestamp exactly as published in the feed; null when the feed has none. */
  publishedAt: string | null;
  firstSeenAt: string;
  feedCategories: string[];
  location: Location;
  topic: Topic;
  /** Set when another item is the same story; points to the item shown first. */
  duplicateOf?: string;
};

export type SourceStatus = {
  id: SourceId;
  ok: boolean;
  checkedAt: string;
  itemCount: number;
  error?: string;
};

export type Translation = {
  titleAr: string;
  summaryAr: string;
  model: string;
  createdAt: string;
};

export type NewsStore = {
  items: Record<string, NewsItem>;
  sources: Partial<Record<SourceId, SourceStatus>>;
  lastRefresh: string | null;
  translations: Record<string, Translation>;
  selections: Record<string, string[]>;
};
