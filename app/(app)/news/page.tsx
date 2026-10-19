import Link from "next/link";
import { AlertTriangle, BadgeCheck, CircleSlash, Copy, ExternalLink, Inbox, Info, ShieldCheck, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Bidi, Chip, cx } from "@/components/ui";
import { getContext } from "@/lib/context";
import { getNews, sortItems } from "@/lib/news/store";
import { SOURCES, UNAVAILABLE_SOURCES } from "@/lib/news/sources";
import { translationAvailable } from "@/lib/news/translate";
import type { Location, NewsItem, SourceId, Topic } from "@/lib/news/types";
import { NewsFilters, RefreshButton, SelectButton, TranslateButton } from "./NewsControls";

export const dynamic = "force-dynamic";

type Search = { q?: string; topic?: string; loc?: string; src?: string; days?: string; sel?: string; dup?: string; sort?: string; id?: string };

const TOPICS: Topic[] = ["rates", "market", "prices", "rentals", "construction", "policy", "other"];
const LOCATIONS: Location[] = ["gta", "ontario", "canada"];

export default async function NewsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { t, locale, user } = await getContext();
  const n = t.news;
  const store = await getNews();

  const fmt = (iso: string, withTime = true) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      timeZone: "America/Toronto",
    }).format(new Date(iso));

  const selections = new Set(store.selections[user.id] ?? []);
  const all = Object.values(store.items);
  const days = sp.days === "all" ? null : Number(sp.days ?? 30);
  const since = days ? Date.now() - days * 86_400_000 : null;
  const q = sp.q?.toLowerCase();

  const filtered = sortItems(
    all.filter((i) => {
      if (sp.dup !== "1" && i.duplicateOf) return false;
      if (sp.topic && i.topic !== sp.topic) return false;
      if (sp.loc && i.location !== sp.loc) return false;
      if (sp.src && i.sourceId !== sp.src) return false;
      if (sp.sel === "1" && !selections.has(i.id)) return false;
      if (since && i.publishedAt && Date.parse(i.publishedAt) < since) return false;
      if (q) {
        const tr = store.translations[i.id];
        const hay = `${i.title} ${i.summary} ${i.publisher} ${tr?.titleAr ?? ""} ${tr?.summaryAr ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }),
    sp.sort === "newest" ? "newest" : "local",
  );

  const current = (sp.id && store.items[sp.id]) || filtered[0];
  const sourceName = (id: SourceId) => SOURCES.find((s) => s.id === id)!.name[locale];
  const sourceShort = (id: SourceId) => SOURCES.find((s) => s.id === id)!.short;
  const anyOk = Object.values(store.sources).some((s) => s?.ok);
  const linkFor = (id: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "id" && v) as [string, string][]);
    p.set("id", id);
    return `/news?${p.toString()}`;
  };
  const duplicatesOf = (item: NewsItem) => {
    const root = item.duplicateOf ?? item.id;
    return all.filter((i) => i.id !== item.id && (i.id === root || i.duplicateOf === root));
  };

  return (
    <>
      <TopBar t={t} locale={locale} title={n.title} subtitle={n.subtitle} />
      <div className="flex flex-col gap-6 px-10 pb-12 pt-8">
        {/* Sources */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="t-h2">{n.sources}</h2>
              <p className="t-small text-muted">
                {n.lastUpdated}: {store.lastRefresh ? fmt(store.lastRefresh) : n.never} · {n.sourcesSub}
              </p>
            </div>
            <RefreshButton label={n.refresh} pendingLabel={n.refreshing} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {SOURCES.map((s) => {
              const st = store.sources[s.id];
              return (
                <div key={s.id} className="card flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-7 min-w-9 place-items-center rounded-md bg-accent-tint px-1.5 text-[10px] font-bold text-accent content-en" style={{ textAlign: "center" }}>{s.short}</span>
                    {st?.ok ? <Chip tone="positive" dot>{n.connected}</Chip> : st ? <Chip tone="negative" dot>{n.failed}</Chip> : <Chip dot>{n.never}</Chip>}
                  </div>
                  <div className="t-h3 font-semibold">{s.name[locale]}</div>
                  {st?.ok && <div className="t-caption text-ink-2"><span className="ltr font-semibold">{st.itemCount}</span> {locale === "en" && st.itemCount === 1 ? "item" : n.items}</div>}
                  {st && !st.ok && <div className="t-caption text-negative content-en" title={st.error}>{st.error}</div>}
                  {st && <div className="t-caption text-muted">{fmt(st.checkedAt)}</div>}
                </div>
              );
            })}
          </div>
          <details className="rounded-lg border border-line bg-surface px-4 py-3">
            <summary className="flex cursor-pointer items-center gap-2 t-small text-ink-2">
              <CircleSlash className="size-4 text-muted" />
              {n.notConnectedTitle}: {UNAVAILABLE_SOURCES.map((u) => u.name[locale]).join(locale === "ar" ? "، " : ", ")}
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {UNAVAILABLE_SOURCES.map((u) => (
                <li key={u.id} className="flex items-start gap-3 t-small">
                  <Chip>{n.notConnected}</Chip>
                  <span className="font-semibold">{u.name[locale]}</span>
                  <span className="text-ink-2">{u.reason[locale]}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>

        {!anyOk && !all.length ? (
          <section className="card flex flex-col items-center gap-3 p-12 text-center" role="alert">
            <div className="grid size-12 place-items-center rounded-lg bg-negative-tint text-negative"><AlertTriangle className="size-6" /></div>
            <h2 className="t-h2">{n.errorTitle}</h2>
            <p className="t-body max-w-xl text-ink-2">{n.errorBody}</p>
          </section>
        ) : (
          <>
            <NewsFilters
              t={n}
              topics={TOPICS.map((v) => ({ value: v, label: n.topics[v] }))}
              locations={LOCATIONS.map((v) => ({ value: v, label: n.locations[v] }))}
              sources={SOURCES.map((s) => ({ value: s.id, label: s.name[locale] }))}
              periods={(["7", "30", "90", "all"] as const).map((v) => ({ value: v, label: n.days[v] }))}
            />

            <section className="grid grid-cols-[1.35fr_1fr] items-start gap-6">
              {/* List */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3 t-caption text-muted">
                  <span><span className="ltr font-semibold text-ink">{filtered.length}</span> {locale === "en" && filtered.length === 1 ? "story" : n.count}</span>
                  <span className="flex items-center gap-1"><Info className="size-3.5" />{n.autoTag}</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-12 text-center">
                    <div className="grid size-12 place-items-center rounded-lg bg-elevated text-muted"><Inbox className="size-6" /></div>
                    <h3 className="t-h3 font-semibold">{n.emptyTitle}</h3>
                    <p className="t-small text-ink-2">{n.emptyBody}</p>
                    <Link href="/news" className="t-small text-accent">{n.clear}</Link>
                  </div>
                ) : (
                  <ul>
                    {filtered.map((i) => {
                      const tr = store.translations[i.id];
                      const active = current?.id === i.id;
                      const dupCount = duplicatesOf(i).length;
                      return (
                        <li key={i.id}>
                          <Link
                            href={linkFor(i.id)}
                            scroll={false}
                            className={cx("flex gap-4 border-b border-line px-5 py-4 transition-colors last:border-0", active ? "bg-accent-tint rtl:shadow-[inset_-3px_0_0_var(--color-accent)] ltr:shadow-[inset_3px_0_0_var(--color-accent)]" : "hover:bg-hover")}
                          >
                            <span className="mt-0.5 grid h-9 min-w-10 shrink-0 place-items-center rounded-md bg-accent-tint px-1 text-[10px] font-bold text-accent content-en" style={{ textAlign: "center" }}>{sourceShort(i.sourceId)}</span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              {tr ? (
                                <h3 className="t-h3 font-semibold">{locale === "ar" ? <Bidi>{tr.titleAr}</Bidi> : i.title}</h3>
                              ) : (
                                <h3 className="t-h3 font-semibold content-en" lang="en">{i.title}</h3>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 t-caption text-muted">
                                <BadgeCheck className="size-3.5 text-positive" />
                                <span className="content-en">{i.publisher}</span>
                                <span>·</span>
                                <span>{i.publishedAt ? fmt(i.publishedAt, false) : n.noDate}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Chip tone={i.location === "gta" ? "accent" : "neutral"}>{n.locations[i.location]}</Chip>
                                <Chip>{n.topics[i.topic]}</Chip>
                                {selections.has(i.id) && <Chip tone="gold">{n.selected}</Chip>}
                                {dupCount > 0 && <Chip tone="warning"><Copy className="size-3" /><span className="ltr">+{dupCount}</span></Chip>}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Detail */}
              <aside className="card sticky top-24 flex flex-col gap-5 p-6">
                {!current ? (
                  <p className="t-small text-muted">{n.pickOne}</p>
                ) : (
                  <Detail
                    item={current}
                    n={n}
                    locale={locale}
                    fmt={fmt}
                    sourceName={sourceName(current.sourceId)}
                    translation={store.translations[current.id]}
                    canTranslate={translationAvailable()}
                    selected={selections.has(current.id)}
                    duplicates={duplicatesOf(current)}
                    linkFor={linkFor}
                  />
                )}
              </aside>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Detail({
  item,
  n,
  locale,
  fmt,
  sourceName,
  translation,
  canTranslate,
  selected,
  duplicates,
  linkFor,
}: {
  item: NewsItem;
  n: Awaited<ReturnType<typeof getContext>>["t"]["news"];
  locale: "ar" | "en";
  fmt: (iso: string, withTime?: boolean) => string;
  sourceName: string;
  translation?: { titleAr: string; summaryAr: string };
  canTranslate: boolean;
  selected: boolean;
  duplicates: NewsItem[];
  linkFor: (id: string) => string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={item.location === "gta" ? "accent" : "neutral"}>{n.locations[item.location]}</Chip>
        <Chip>{n.topics[item.topic]}</Chip>
        {item.duplicateOf && <Chip tone="warning">{n.duplicateOf}</Chip>}
      </div>

      {translation && locale === "ar" ? <h2 className="t-h1"><Bidi>{translation.titleAr}</Bidi></h2> : <h2 className="t-h2 content-en" lang="en">{item.title}</h2>}

      <div className="flex flex-col gap-2 rounded-lg border border-positive/20 bg-positive-tint p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 t-small font-semibold text-positive"><ShieldCheck className="size-4" />{n.verified}</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 t-small font-medium text-accent hover:underline">
            {n.openSource}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 t-caption">
          <dt className="text-muted">{n.source}</dt>
          <dd>{sourceName}</dd>
          <dt className="text-muted">{n.publisher}</dt>
          <dd className="content-en" style={{ textAlign: "start" }}>{item.publisher}</dd>
          <dt className="text-muted">{n.published}</dt>
          <dd>{item.publishedAt ? fmt(item.publishedAt) : n.noDate}</dd>
          <dt className="text-muted">URL</dt>
          <dd className="content-en truncate" style={{ textAlign: "start" }}><a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.url.replace(/^https?:\/\//, "")}</a></dd>
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 t-small font-semibold text-gold-strong"><Sparkles className="size-4" />{n.arabicSummary}</div>
        {translation ? (
          <>
            <p className="t-body content-ar" lang="ar"><Bidi>{translation.summaryAr}</Bidi></p>
            <p className="t-caption text-muted">{n.translatedBy}</p>
          </>
        ) : canTranslate ? (
          <TranslateButton id={item.id} t={n} />
        ) : (
          <p className="rounded-md bg-warning-tint p-3 t-small text-ink-2">{n.keyMissing}</p>
        )}
      </div>

      {(item.summary || item.body) && (
        <details open={!translation} className="rounded-lg bg-canvas p-4">
          <summary className="cursor-pointer t-small font-semibold text-ink-2">{n.original}</summary>
          <p className="mt-2 t-small text-ink-2 content-en" lang="en">{item.summary || item.body?.slice(0, 600)}</p>
        </details>
      )}

      <div className="flex flex-col gap-1.5">
        <SelectButton id={item.id} selected={selected} t={n} />
        <p className="t-caption text-muted">{n.selectedHint}</p>
      </div>

      {duplicates.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <div className="flex items-center gap-1.5 t-small font-semibold"><Copy className="size-4 text-warning" />{n.duplicates}</div>
          {duplicates.map((d) => (
            <Link key={d.id} href={linkFor(d.id)} scroll={false} className="t-caption text-accent hover:underline">
              <span className="content-en">{d.publisher} · {d.title}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
