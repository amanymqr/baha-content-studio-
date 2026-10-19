import "server-only";
import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";
import { isRelevant, locationOf, topicOf } from "./classify";
import type { Location, NewsItem, SourceId } from "./types";

// Official feeds, each checked by hand before being added here.
// None needs credentials. Sources without a public feed (CREA, CMHC, Ontario
// Newsroom) are listed in UNAVAILABLE_SOURCES instead of being scraped.

type Raw = Omit<NewsItem, "id" | "firstSeenAt" | "location" | "topic"> & { defaultLocation?: Location };

export type SourceDef = {
  id: SourceId;
  name: { ar: string; en: string };
  short: string;
  home: string;
  /** Only keep items that mention housing, rates or prices. */
  filterRelevant: boolean;
  feeds: string[];
  parse: (xml: string, feedUrl: string) => Raw[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true,
  isArray: (name) => ["item", "entry", "category", "link", "span", "p", "div"].includes(name),
});

/** Flattens text from string, CDATA or XHTML nodes. */
function text(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (typeof node === "object") {
    return Object.entries(node as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("@_"))
      .map(([, v]) => text(v))
      .join(" ");
  }
  return "";
}

const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#\d+;/g, " ")
    .replace(/\[…\]|\[&hellip;\]|The post .* appeared first on .*$/s, "")
    .replace(/\s+/g, " ")
    .trim();

const isoOrNull = (s: unknown) => {
  const t = Date.parse(String(s ?? ""));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

const atomLink = (links: unknown): string => {
  const list = (Array.isArray(links) ? links : [links]) as Record<string, string>[];
  const alt = list.find((l) => l && (l["@_rel"] === undefined || l["@_rel"] === "alternate"));
  return (alt?.["@_href"] ?? "").trim();
};

export const SOURCES: SourceDef[] = [
  {
    id: "boc",
    name: { ar: "بنك كندا", en: "Bank of Canada" },
    short: "BoC",
    home: "https://www.bankofcanada.ca",
    filterRelevant: true,
    feeds: ["https://www.bankofcanada.ca/content_type/press-releases/feed/"],
    // RSS 1.0 (RDF) with dc:date
    parse(xml) {
      const doc = parser.parse(xml);
      const items = doc?.RDF?.item ?? doc?.rss?.channel?.item ?? [];
      return items.map((i: Record<string, unknown>) => ({
        sourceId: "boc" as const,
        publisher: "Bank of Canada",
        title: clean(text(i.title)),
        summary: clean(text(i.description)),
        url: text(i.link).trim(),
        publishedAt: isoOrNull(i.date ?? i.pubDate),
        feedCategories: [],
      }));
    },
  },
  {
    id: "trreb",
    name: { ar: "TRREB", en: "TRREB" },
    short: "TRREB",
    home: "https://trreb.ca",
    filterRelevant: false,
    feeds: ["https://trreb.ca/tag/news-releases/feed/"],
    // RSS 2.0 with content:encoded
    parse(xml) {
      const items = parser.parse(xml)?.rss?.channel?.item ?? [];
      return items.map((i: Record<string, unknown>) => ({
        sourceId: "trreb" as const,
        publisher: "Toronto Regional Real Estate Board",
        title: clean(text(i.title)),
        summary: clean(text(i.description)),
        body: clean(text(i.encoded)) || undefined,
        url: text(i.link).trim(),
        publishedAt: isoOrNull(i.pubDate),
        feedCategories: ((i.category as unknown[]) ?? []).map((c) => clean(text(c))),
        defaultLocation: "gta" as const,
      }));
    },
  },
  {
    id: "statcan",
    name: { ar: "هيئة الإحصاء الكندية", en: "Statistics Canada" },
    short: "StatCan",
    home: "https://www.statcan.gc.ca",
    filterRelevant: false,
    feeds: [
      "https://www150.statcan.gc.ca/n1/rss/dai-quo/46-eng.atom", // Housing
      "https://www150.statcan.gc.ca/n1/rss/dai-quo/18-eng.atom", // Prices and price indexes
      "https://www150.statcan.gc.ca/n1/rss/dai-quo/34-eng.atom", // Construction
    ],
    // Atom with XHTML titles and summaries
    parse(xml, feedUrl) {
      const entries = parser.parse(xml)?.feed?.entry ?? [];
      const feedTopic = feedUrl.includes("/46-") ? "Housing" : feedUrl.includes("/18-") ? "Prices and price indexes" : "Construction";
      return entries.map((e: Record<string, unknown>) => ({
        sourceId: "statcan" as const,
        publisher: "Statistics Canada · The Daily",
        title: clean(text(e.title)).replace(/\s+,/g, ","),
        summary: clean(text(e.summary ?? e.content)),
        url: atomLink(e.link) || text(e.id).trim(),
        publishedAt: isoOrNull(e.published ?? e.updated),
        feedCategories: [feedTopic],
      }));
    },
  },
  {
    id: "gc",
    name: { ar: "حكومة كندا", en: "Government of Canada" },
    short: "Canada.ca",
    home: "https://www.canada.ca/en/news.html",
    filterRelevant: true,
    feeds: [],
    // Atom from the Canada News Centre API; author = department
    parse(xml) {
      const entries = parser.parse(xml)?.feed?.entry ?? [];
      return entries.map((e: Record<string, unknown>) => ({
        sourceId: "gc" as const,
        publisher: clean(text((e.author as Record<string, unknown>)?.name)) || "Government of Canada",
        title: clean(text(e.title)),
        summary: clean(text(e.summary)),
        url: atomLink(e.link) || text(e.id).trim(),
        publishedAt: isoOrNull(e.published ?? e.updated),
        feedCategories: ((e.category as Record<string, string>[]) ?? []).map((c) => c["@_term"]).filter(Boolean),
      }));
    },
  },
];

/** Canada News Centre query for the last 60 days (built per refresh). */
export function gcFeedUrl(now = new Date()) {
  const since = new Date(now.getTime() - 60 * 86_400_000).toISOString().slice(0, 10);
  return `https://api.io.canada.ca/io-server/gc/news/en/v2?sort=publishedDate&orderBy=desc&publishedDate%3E=${since}&pick=100&format=atom&atomtitle=National%20News`;
}

export const UNAVAILABLE_SOURCES = [
  { id: "crea", name: { ar: "CREA", en: "CREA" }, reason: { ar: "ما في خلاصة أخبار عامة (RSS أو API). الأخبار منشورة كصفحات فقط.", en: "No public news feed (RSS or API); releases are web pages only." }, home: "https://www.crea.ca/media-hub/news/" },
  { id: "cmhc", name: { ar: "CMHC", en: "CMHC" }, reason: { ar: "بتوفّر اشتراك بالإيميل فقط. إعلاناتها على canada.ca بتوصل عن طريق مصدر حكومة كندا.", en: "Email subscription only. Its announcements on canada.ca arrive through the Government of Canada source." }, home: "https://www.cmhc-schl.gc.ca/media-newsroom" },
  { id: "ontario", name: { ar: "أخبار حكومة أونتاريو", en: "Ontario Newsroom" }, reason: { ar: "الصفحة بتشتغل بـ JavaScript وما في خلاصة أخبار عامة مؤكدة.", en: "JavaScript-only page with no confirmed public feed." }, home: "https://news.ontario.ca" },
] as const;

export const itemId = (url: string) => createHash("sha1").update(url.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase()).digest("hex").slice(0, 16);

async function get(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "BahaContentStudio/0.2 (private news reader)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Fetches one source. Throws with a readable reason when every feed fails. */
export async function fetchSource(def: SourceDef): Promise<Omit<NewsItem, "firstSeenAt">[]> {
  const feeds = def.id === "gc" ? [gcFeedUrl()] : def.feeds;
  const results = await Promise.allSettled(feeds.map(async (f) => def.parse(await get(f), f)));
  const ok = results.filter((r): r is PromiseFulfilledResult<Raw[]> => r.status === "fulfilled");
  if (!ok.length) {
    const reason = (results[0] as PromiseRejectedResult).reason;
    const cause = reason?.cause?.code ?? reason?.cause?.message;
    throw new Error([reason?.name === "TimeoutError" ? "Timed out" : reason?.message, cause].filter(Boolean).join(" · "));
  }
  return ok
    .flatMap((r) => r.value)
    .filter((r) => r.title && r.url.startsWith("http"))
    .filter((r) => !def.filterRelevant || isRelevant(`${r.title} ${r.summary}`))
    .map(({ defaultLocation, ...r }) => {
      const all = `${r.title} ${r.summary} ${r.body ?? ""}`;
      return { ...r, id: itemId(r.url), location: locationOf(all, defaultLocation), topic: topicOf(`${r.title} ${r.summary}`) };
    });
}
