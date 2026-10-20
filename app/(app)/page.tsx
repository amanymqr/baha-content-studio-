import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, Clapperboard, FolderOpen, Inbox, Layers, NotebookPen, PenLine, Sparkles, TriangleAlert } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ScoreBadge } from "@/components/Scores";
import { STATUS_TONE, StatusChip } from "@/components/StatusChip";
import { Bidi, ButtonLink, Chip, SectionHead, cx } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/analysis/rules";
import { getContext } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { readNews } from "@/lib/news/store";
import { buildOpportunities, rankStories } from "@/lib/opportunities/build";
import { draftStats, summarize } from "@/lib/studio/library";
import { listDrafts } from "@/lib/studio/store";
import { STATUSES } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

const BAR: Record<(typeof STATUS_TONE)[keyof typeof STATUS_TONE], string> = { neutral: "bg-muted", warning: "bg-warning", negative: "bg-negative", accent: "bg-accent", positive: "bg-positive" };

// Everything on this page is read from the saved drafts and the news monitor's
// stories. Nothing is sample data; when there is nothing yet, the page says so.
export default async function Dashboard() {
  const { t, locale, user } = await getContext();
  const d = t.dashboard;
  const s = t.studio;
  const [drafts, news] = await Promise.all([listDrafts().catch(() => null), readNews()]);
  const stats = drafts && draftStats(drafts);
  const recent = (drafts ?? []).slice(0, 5).map((x) => summarize(x, locale));

  const stories = Object.values(news.items).filter((i) => !i.duplicateOf);
  const latest = [...stories].sort((a, b) => (b.publishedAt ?? b.firstSeenAt).localeCompare(a.publishedAt ?? a.firstSeenAt)).slice(0, 3);
  const ranked = rankStories(stories);
  const top = buildOpportunities(ranked)[0];
  const contentLang = user.settings.contentLanguage === "en" ? "en" : "ar";

  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-CA", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Toronto" }).format(new Date());
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const Out = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const firstName = user.name[locale].split(" ")[0];

  return (
    <>
      <TopBar t={t} locale={locale} title={d.greeting(firstName)} subtitle={d.subtitle(date, stories.length)} />
      <div className="flex flex-col gap-8 px-4 pb-12 pt-6 md:px-10 md:pt-8">
        {/* Content pipeline: same counts as the library */}
        <section className="flex flex-col gap-4">
          <SectionHead title={d.pipeline} sub={d.pipelineSub} aside={<Link href="/library" className="flex shrink-0 items-center gap-1 t-small text-accent">{d.openLibrary}<Next className="size-4" /></Link>} />
          {!stats ? (
            <p role="alert" className="card flex items-start gap-2 p-5 t-small text-negative"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{d.loadError}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <Link href="/library" className="card flex flex-col gap-1 p-4 transition-shadow hover:shadow-glow">
                  <span className="t-small text-ink-2">{d.total}</span>
                  <span className="ltr t-metric">{stats.total}</span>
                  <span className="t-caption text-muted">{d.split(stats.reels, stats.carousels)}</span>
                </Link>
                {STATUSES.map((st) => (
                  <Link key={st} href={`/library?status=${st}`} className="card flex flex-col gap-1 p-4 transition-shadow hover:shadow-glow">
                    <span className="flex items-center gap-1.5 t-small text-ink-2"><span className={cx("size-2 rounded-full", BAR[STATUS_TONE[st]])} />{s.statuses[st]}</span>
                    <span className="ltr t-metric">{stats.byStatus[st]}</span>
                    <span className="t-caption text-muted">{s.statusHelp[st]}</span>
                  </Link>
                ))}
              </div>
              {stats.total > 0 && (
                <div className="flex h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={STATUSES.map((st) => `${s.statuses[st]}: ${stats.byStatus[st]}`).join("، ")}>
                  {STATUSES.map((st) => stats.byStatus[st] > 0 && <span key={st} className={BAR[STATUS_TONE[st]]} style={{ width: `${(stats.byStatus[st] / stats.total) * 100}%` }} />)}
                </div>
              )}
            </>
          )}
        </section>

        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Recent drafts */}
          <div className="card flex min-w-0 flex-col">
            <div className="flex items-end justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="t-h3 font-semibold">{d.recent}</h2>
                <p className="t-caption text-muted">{d.recentSub}</p>
              </div>
              <ButtonLink href="/studio/new" size="sm" icon={<NotebookPen className="size-3.5" />}>{s.newDraft}</ButtonLink>
            </div>
            {!recent.length ? (
              <p className="p-8 text-center t-small text-ink-2">{d.noDrafts}</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((r) => {
                  const Icon = r.format === "reel" ? Clapperboard : Layers;
                  return (
                    <li key={r.id}>
                      <Link href={`/studio/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-hover">
                        <span className={cx("grid size-9 shrink-0 place-items-center rounded-md", r.format === "reel" ? "bg-accent-tint text-accent" : "bg-gold-tint text-gold-strong")}><Icon className="size-4" /></span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={cx("truncate t-small font-semibold", r.titleLang === "ar" ? "content-ar" : "content-en")} lang={r.titleLang}>{r.title}</span>
                          <span className="truncate t-caption text-muted">{s.langs[r.language]} · {d.updated}: {formatDate(locale, r.updatedAt, true)}</span>
                        </span>
                        <StatusChip status={r.status} label={s.statuses[r.status]} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Best opportunity from real stories */}
          <div className="card flex min-w-0 flex-col gap-4 p-5">
            <div>
              <Chip tone="gold"><Sparkles className="size-3.5" />{d.topOpp}</Chip>
              <p className="mt-2 t-caption text-muted">{d.topOppSub}</p>
            </div>
            {!top ? (
              <div className="flex flex-col items-start gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-elevated text-muted"><Inbox className="size-5" /></div>
                <h3 className="t-h3 font-semibold">{d.noNewsTitle}</h3>
                <p className="t-small text-ink-2">{d.noNewsBody}</p>
                <ButtonLink href="/news" variant="secondary" size="sm">{d.goNews}</ButtonLink>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={cx("t-h3 font-semibold", contentLang === "ar" ? "content-ar" : "content-en")} lang={contentLang}>{contentLang === "ar" ? <Bidi>{top.angle.title.ar}</Bidi> : top.angle.title.en}</h3>
                  <ScoreBadge value={top.story.opportunity.value} />
                </div>
                <p className="t-small text-ink-2">{top.angle.why[locale]}</p>
                <p className="flex flex-wrap items-center gap-1 t-caption text-muted">
                  <BadgeCheck className="size-3.5 text-positive" />
                  <span className="content-en">{top.story.item.publisher}</span> · {top.story.item.publishedAt ? formatDate(locale, top.story.item.publishedAt) : d.noDate}
                </p>
                <p className="line-clamp-2 t-caption content-en" lang="en">{top.story.item.title}</p>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/studio/new?${new URLSearchParams({ story: top.story.item.id, angle: top.angle.id, format: top.angle.format, language: user.settings.contentLanguage })}`} size="sm" icon={<PenLine className="size-3.5" />}>{d.write}</ButtonLink>
                  <ButtonLink href={`/analysis?id=${top.story.item.id}`} variant="secondary" size="sm" icon={<Out className="size-3.5" />}>{d.seeAnalysis}</ButtonLink>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Quick create */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { href: "/studio/new?format=reel", icon: Clapperboard, title: d.quickReel, body: d.quickReelBody },
            { href: "/studio/new?format=carousel", icon: Layers, title: d.quickCarousel, body: d.quickCarouselBody },
            { href: "/library", icon: FolderOpen, title: d.quickLibrary, body: d.quickLibraryBody },
          ].map((q) => (
            <Link key={q.title} href={q.href} className="card group flex items-start gap-4 p-5 transition-shadow hover:shadow-glow">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-accent-tint text-accent"><q.icon className="size-5" /></div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="t-h3 font-semibold">{q.title}</span>
                <p className="t-small text-ink-2"><Bidi>{q.body}</Bidi></p>
              </div>
              <Next className="mt-3 size-4 text-muted" />
            </Link>
          ))}
        </section>

        {/* Latest saved stories */}
        {latest.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHead title={d.latestNews} aside={<Link href="/news" className="flex shrink-0 items-center gap-1 t-small text-accent">{d.allNews}<Next className="size-4" /></Link>} />
            <div className="grid gap-4 md:grid-cols-3">
              {latest.map((n) => {
                const r = ranked.find((x) => x.item.id === n.id);
                const tr = news.translations[n.id];
                return (
                  <article key={n.id} className="card flex flex-col gap-2 p-5">
                    <div className="flex items-center gap-2 t-caption text-muted">
                      <BadgeCheck className="size-3.5 shrink-0 text-positive" />
                      <span className="truncate content-en">{n.publisher}</span>
                      {r && <span className="ms-auto"><ScoreBadge value={r.opportunity.value} /></span>}
                    </div>
                    {locale === "ar" && tr?.titleAr && <h3 className="t-small font-semibold"><Bidi>{tr.titleAr}</Bidi></h3>}
                    <h3 className={cx("line-clamp-3 content-en", locale === "ar" && tr?.titleAr ? "t-caption text-ink-2" : "t-small font-semibold")} lang="en">{n.title}</h3>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                      {r && <Chip>{CATEGORY_LABEL[r.category][locale]}</Chip>}
                      <span className="t-caption text-muted">{n.publishedAt ? formatDate(locale, n.publishedAt) : d.noDate}</span>
                      <Link href={`/studio/new?story=${n.id}`} className="ms-auto flex items-center gap-1 t-caption font-medium text-accent hover:underline"><PenLine className="size-3.5" />{d.write}</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
