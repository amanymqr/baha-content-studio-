import type { Location, NewsItem, Topic } from "./types";

// Rule-based tagging. It only reads the source's own words; nothing is inferred
// beyond keyword matches, and the UI labels these tags as automatic.

const GTA = /\b(toronto|gta|greater toronto|york region|peel|durham|halton|mississauga|brampton|markham|vaughan|oakville|richmond hill|scarborough|etobicoke|north york|pickering|ajax|whitby|oshawa|burlington|milton)\b/i;
const ONTARIO = /\b(ontario|ottawa|hamilton|london, ont|kitchener|waterloo|windsor|barrie|guelph|sudbury)\b/i;

export function locationOf(text: string, fallback: Location = "canada"): Location {
  if (GTA.test(text)) return "gta";
  if (ONTARIO.test(text)) return "ontario";
  return fallback;
}

const TOPICS: [Topic, RegExp][] = [
  ["rates", /\b(policy rate|interest rate|overnight rate|rate announcement|monetary policy|mortgage rate|bond yield)/i],
  ["rentals", /\b(rent|rental|renters?|tenants?|vacancy|landlords?)\b/i],
  ["construction", /\b(building permits?|housing starts|construction|homebuilding|new homes? built|residential building)/i],
  ["market", /\b(home sales|listings|benchmark price|average (selling|sale|home) price|resale|homebuyers?|real estate market|market watch|mls)/i],
  ["prices", /\b(consumer price index|cpi|inflation|price index|prices)\b/i],
  ["policy", /\b(tax|gst|hst|land transfer|program|funding|invest(s|ment)?|legislation|regulation|government|minister|federal|municipal|budget)\b/i],
];

export function topicOf(text: string): Topic {
  for (const [topic, re] of TOPICS) if (re.test(text)) return topic;
  return "other";
}

// Used to keep only housing-relevant stories from broad feeds (Bank of Canada, Canada.ca).
const RELEVANT = /\b(hous(e|es|ing)|homes?|homebuyers?|homeowners?|mortgages?|rent(al|ers)?|real estate|condo|property|properties|interest rates?|policy rate|overnight rate|monetary policy|inflation|consumer price|cmhc|residential|affordab(le|ility)|construction|building permits?|land transfer)\b/i;

export function isRelevant(text: string) {
  return RELEVANT.test(text);
}

const STOP = new Set("a an the of in on for to and or as at by from with into over its is are was were be has have this that new says said canada canadian".split(" "));

export function titleTokens(title: string) {
  return new Set(
    title
      .toLowerCase()
      // Canadian government releases write "per cent"; BoC and StatCan write "%".
      .replace(/\s?(per cent|percent)\b/g, "%")
      .replace(/[^a-z0-9%$. ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function similarity(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

const SOURCE_PRIORITY: Record<NewsItem["sourceId"], number> = { boc: 0, statcan: 1, trreb: 2, gc: 3 };
const DAY = 86_400_000;

/**
 * Marks repeated coverage of the same story. Two items match when they were
 * published within 3 days of each other and most of the words in the shorter
 * title appear in the other. The primary source (by official priority, then
 * earliest date) stays visible; the rest point to it with duplicateOf.
 */
export function markDuplicates(items: NewsItem[]) {
  for (const i of items) delete i.duplicateOf;
  const sorted = [...items].sort(
    (a, b) => SOURCE_PRIORITY[a.sourceId] - SOURCE_PRIORITY[b.sourceId] || (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
  );
  const tokens = new Map(sorted.map((i) => [i.id, titleTokens(i.title)]));
  for (let x = 0; x < sorted.length; x++) {
    const a = sorted[x];
    if (a.duplicateOf) continue;
    for (let y = x + 1; y < sorted.length; y++) {
      const b = sorted[y];
      if (b.duplicateOf) continue;
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : NaN;
      if (Number.isNaN(ta) || Number.isNaN(tb) || Math.abs(ta - tb) > 3 * DAY) continue;
      if (similarity(tokens.get(a.id)!, tokens.get(b.id)!) >= 0.7) b.duplicateOf = a.id;
    }
  }
}
