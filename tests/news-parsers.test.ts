// Structural fixtures only: shaped like the verified feeds, text is obviously synthetic.
import { SOURCES, itemId } from "../lib/news/sources";
import { markDuplicates, topicOf, locationOf } from "../lib/news/classify";
import type { NewsItem } from "../lib/news/types";
const S = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };

const boc = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel rdf:about="x"><title>BoC</title></channel>
<item rdf:about="https://www.bankofcanada.ca/test-a/"><title>FIXTURE policy rate announcement</title><link>https://www.bankofcanada.ca/test-a/</link><description>FIXTURE &lt;p&gt;text&lt;/p&gt;</description><dc:date>2026-10-15T09:45:00-04:00</dc:date></item>
</rdf:RDF>`;
const b = S.boc.parse(boc, "");
eq("boc count", b.length, 1);
eq("boc url", b[0].url, "https://www.bankofcanada.ca/test-a/");
eq("boc date", b[0].publishedAt, "2026-10-15T13:45:00.000Z");
eq("boc summary html stripped", b[0].summary, "FIXTURE text");

const trreb = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>TRREB</title>
<item><title>FIXTURE Market Watch release</title><link>https://trreb.ca/test-b/</link><pubDate>Fri, 03 Oct 2026 13:00:00 +0000</pubDate>
<category><![CDATA[News Releases]]></category><category><![CDATA[Market Watch]]></category>
<description><![CDATA[<p>FIXTURE short [&#8230;]</p>]]></description><content:encoded><![CDATA[<p>FIXTURE body &amp; more</p>]]></content:encoded></item></channel></rss>`;
const t = S.trreb.parse(trreb, "");
eq("trreb url", t[0].url, "https://trreb.ca/test-b/");
eq("trreb date", t[0].publishedAt, "2026-10-03T13:00:00.000Z");
eq("trreb cats", t[0].feedCategories, ["News Releases", "Market Watch"]);
eq("trreb body", t[0].body, "FIXTURE body & more");

const sc = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Daily</title>
<entry><title type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><span>FIXTURE Building permits</span>, August 2026</div></title>
<link href="https://www150.statcan.gc.ca/n1/daily-quotidien/test-c.htm"/><id>urn:x</id><updated>2026-10-14T08:30:00-04:00</updated>
<summary type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>FIXTURE summary one.</p><p>Two.</p></div></summary></entry></feed>`;
const s = S.statcan.parse(sc, "https://www150.statcan.gc.ca/n1/rss/dai-quo/34-eng.atom");
eq("statcan title", s[0].title, "FIXTURE Building permits, August 2026");
eq("statcan url", s[0].url, "https://www150.statcan.gc.ca/n1/daily-quotidien/test-c.htm");
eq("statcan date from updated", s[0].publishedAt, "2026-10-14T12:30:00.000Z");
eq("statcan cat", s[0].feedCategories, ["Construction"]);
eq("statcan summary", s[0].summary, "FIXTURE summary one. Two.");

const gc = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>National News</title>
<entry><title>FIXTURE housing program</title><link rel="alternate" href="https://www.canada.ca/en/test-d.html"/><id>https://www.canada.ca/en/test-d.html</id>
<author><name>Canada Mortgage and Housing Corporation</name></author><category term="Housing"/><updated>2026-10-10T10:00:00-04:00</updated><summary>FIXTURE summary</summary></entry></feed>`;
const g = S.gc.parse(gc, "");
eq("gc publisher", g[0].publisher, "Canada Mortgage and Housing Corporation");
eq("gc cat", g[0].feedCategories, ["Housing"]);
eq("gc url", g[0].url, "https://www.canada.ca/en/test-d.html");

eq("topic rates", topicOf("Bank of Canada lowers policy rate"), "rates");
eq("topic construction", topicOf("Building permits, August"), "construction");
eq("loc gta", locationOf("Mississauga condo sales"), "gta");
eq("loc on", locationOf("Ottawa prices"), "ontario");
eq("id stable", itemId("https://a.ca/x/?utm=1"), itemId("https://A.ca/x"));

const base = { summary: "", url: "", feedCategories: [], firstSeenAt: "", location: "canada" as const, topic: "rates" as const, publisher: "" };
const items: NewsItem[] = [
  { ...base, id: "g", sourceId: "gc" as const, title: "Bank of Canada reduces policy interest rate to 2.25%", publishedAt: "2026-10-15T14:00:00Z" },
  { ...base, id: "b", sourceId: "boc" as const, title: "Bank of Canada reduces policy rate to 2.25%", publishedAt: "2026-10-15T13:45:00Z" },
  { ...base, id: "x", sourceId: "statcan" as const, title: "Consumer Price Index, September 2026", publishedAt: "2026-10-15T12:30:00Z" },
];
markDuplicates(items);
eq("dup marks gc copy", items[0].duplicateOf, "b");
eq("primary kept", items[1].duplicateOf, undefined);
eq("unrelated kept", items[2].duplicateOf, undefined);
console.log(fail ? `${fail} FAILED` : "ALL PASSED");
process.exit(fail ? 1 : 0);
