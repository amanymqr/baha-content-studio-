import Link from "next/link";
import { BookOpen, Bot, PenLine, ChevronLeft, ChevronRight, ExternalLink, Inbox, Quote, ShieldCheck, Sparkles, TriangleAlert, Users } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { HeuristicNote, ScoreBadge, ScoreReasons } from "@/components/Scores";
import { Bidi, ButtonLink, Chip, cx } from "@/components/ui";
import { aiStatus } from "@/lib/ai";
import { AI_TASKS } from "@/lib/ai/types";
import { CATEGORY_LABEL, GLOSSARY, IMPACT, LIMITATIONS, type ImpactAudience, type Level } from "@/lib/analysis/rules";
import { keyFacts } from "@/lib/analysis/score";
import { getContext } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { SOURCES } from "@/lib/news/sources";
import { readNews } from "@/lib/news/store";
import { rankStories, type RankedStory } from "@/lib/opportunities/build";

export const dynamic = "force-dynamic";

const AUDIENCES: ImpactAudience[] = ["firstTime", "sellers", "homeowners", "investors"];
const LEVEL_TONE: Record<Level, "positive" | "accent" | "neutral"> = { high: "positive", medium: "accent", low: "neutral" };

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ id?: string; sel?: string }> }) {
  const sp = await searchParams;
  const { t, locale, user } = await getContext();
  const a = t.analysis;
  const store = await readNews();
  const selections = new Set(store.selections[user.id] ?? []);
  const ranked = rankStories(Object.values(store.items));
  const story = sp.id ? ranked.find((r) => r.item.id === sp.id) ?? null : null;

  return (
    <>
      <TopBar t={t} locale={locale} title={a.title} subtitle={a.subtitle} />
      <div className="flex flex-col gap-6 px-10 pb-12 pt-8">
        {!ranked.length ? (
          <section className="card flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-lg bg-elevated text-muted"><Inbox className="size-6" /></div>
            <h2 className="t-h2">{a.noNews}</h2>
            <p className="t-body max-w-xl text-ink-2">{a.noNewsBody}</p>
            <ButtonLink href="/news" variant="secondary">{a.goNews}</ButtonLink>
          </section>
        ) : story ? (
          <Workspace story={story} selected={selections.has(story.item.id)} translation={store.translations[story.item.id]} />
        ) : (
          <RankedList ranked={sp.sel === "1" ? ranked.filter((r) => selections.has(r.item.id)) : ranked} selections={selections} selOnly={sp.sel === "1"} />
        )}
      </div>
    </>
  );

  function RankedList({ ranked, selections, selOnly }: { ranked: RankedStory[]; selections: Set<string>; selOnly: boolean }) {
    return (
      <>
        <HeuristicNote title={a.heuristic} note={a.heuristicNote} />
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <div>
              <h2 className="t-h2">{a.ranked}</h2>
              <p className="t-small text-ink-2">{a.rankedSub}</p>
            </div>
            <div className="flex gap-1 rounded-md border border-line bg-canvas p-1 t-small">
              <Link href="/analysis" className={cx("rounded px-3 py-1", !selOnly ? "bg-surface font-semibold shadow-sm" : "text-ink-2")}>{t.opps.all}</Link>
              <Link href="/analysis?sel=1" className={cx("rounded px-3 py-1", selOnly ? "bg-surface font-semibold shadow-sm" : "text-ink-2")}>{t.news.selectedOnly}</Link>
            </div>
          </div>
          {!ranked.length ? (
            <p className="p-10 text-center t-small text-ink-2">{t.news.emptyTitle}</p>
          ) : (
            <table className="w-full t-small">
              <thead className="bg-canvas t-caption text-muted">
                <tr>
                  <th className="px-6 py-2 text-start font-medium">#</th>
                  <th className="py-2 text-start font-medium">{t.news.title}</th>
                  <th className="py-2 text-start font-medium">{a.category}</th>
                  <th className="py-2 text-start font-medium">{a.location}</th>
                  <th className="py-2 text-start font-medium">{a.relevance}</th>
                  <th className="py-2 text-start font-medium">{a.opportunity}</th>
                  <th className="px-6 py-2" />
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.item.id} className="border-t border-line align-top">
                    <td className="ltr px-6 py-4 text-muted">{i + 1}</td>
                    <td className="max-w-[440px] py-4 pe-4">
                      <StoryTitle r={r} className="font-semibold" />
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 t-caption text-muted">
                        <span className="content-en">{r.item.publisher}</span>
                        <span>·</span>
                        <span>{r.item.publishedAt ? formatDate(locale, r.item.publishedAt) : a.noDate}</span>
                        {selections.has(r.item.id) && <Chip tone="accent">{a.selected}</Chip>}
                      </div>
                    </td>
                    <td className="py-4 pe-3"><Chip>{CATEGORY_LABEL[r.category][locale]}</Chip></td>
                    <td className="py-4 pe-3"><Chip tone={r.item.location === "gta" ? "accent" : "neutral"}>{t.news.locations[r.item.location]}</Chip></td>
                    <td className="py-4"><ScoreBadge value={r.relevance.value} label={a.relevance} /></td>
                    <td className="py-4"><ScoreBadge value={r.opportunity.value} label={a.opportunity} /></td>
                    <td className="px-6 py-4 text-end">
                      <Link href={`/analysis?id=${r.item.id}`} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-accent hover:underline">
                        {a.open}
                        {locale === "ar" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </>
    );
  }

  function StoryTitle({ r, className }: { r: RankedStory; className?: string }) {
    const tr = store.translations[r.item.id];
    return tr && locale === "ar" ? <div className={className}><Bidi>{tr.titleAr}</Bidi></div> : <div className={cx(className, "content-en")} lang="en">{r.item.title}</div>;
  }

  function Workspace({ story, selected, translation }: { story: RankedStory; selected: boolean; translation?: { titleAr: string; summaryAr: string } }) {
    const { item } = story;
    const facts = keyFacts(item);
    const glossary = GLOSSARY.filter((g) => g.categories.includes(story.category));
    const ai = aiStatus();
    const sourceName = SOURCES.find((s) => s.id === item.sourceId)!.name[locale];
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex min-w-0 items-center gap-2 t-small text-ink-2">
            <Link href="/analysis" className="hover:text-accent">{a.back}</Link>
            {locale === "ar" ? <ChevronLeft className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
            {translation && locale === "ar" ? <span className="truncate text-ink">{translation.titleAr}</span> : <span className="truncate text-ink content-en" lang="en">{item.title}</span>}
          </nav>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/studio/new?story=${item.id}`} icon={<PenLine className="size-4" />}>{t.opps.write}</ButtonLink>
            <ButtonLink href={`/opportunities?story=${item.id}`} variant="secondary" icon={<Sparkles className="size-4" />}>{a.toContent}</ButtonLink>
          </div>
        </div>

        <section className="grid grid-cols-[1.7fr_1fr] items-start gap-6">
          <article className="card flex flex-col gap-4 p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="accent">{CATEGORY_LABEL[story.category][locale]}</Chip>
              <Chip tone={item.location === "gta" ? "accent" : "neutral"}>{t.news.locations[item.location]}</Chip>
              {selected && <Chip tone="gold">{a.selected}</Chip>}
            </div>
            {translation && locale === "ar" ? <h2 className="t-display"><Bidi>{translation.titleAr}</Bidi></h2> : <h2 className="t-h1 content-en" lang="en">{item.title}</h2>}

            {translation && locale === "ar" ? (
              <div className="flex flex-col gap-1">
                <span className="t-caption font-semibold text-gold-strong">{a.arabicSummary}</span>
                <p className="t-body content-ar" lang="ar"><Bidi>{translation.summaryAr}</Bidi></p>
                <p className="t-caption text-muted">{t.news.translatedBy}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="t-caption font-semibold text-ink-2">{a.plainSummary}</span>
                <p className="t-body content-en text-ink-2" lang="en">{item.summary || item.body?.slice(0, 600)}</p>
                <p className="t-caption text-muted">{a.plainSummaryNote}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-lg border border-positive/20 bg-positive-tint p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 t-small font-semibold text-positive"><ShieldCheck className="size-4" />{a.verified}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 t-small font-medium text-accent hover:underline">
                  {t.news.openSource}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 t-caption">
                <dt className="text-muted">{a.source}</dt>
                <dd>{sourceName}</dd>
                <dt className="text-muted">{a.publisher}</dt>
                <dd className="content-en" style={{ textAlign: "start" }}>{item.publisher}</dd>
                <dt className="text-muted">{a.published}</dt>
                <dd>{item.publishedAt ? formatDate(locale, item.publishedAt, true) : a.noDate}</dd>
              </dl>
            </div>
          </article>

          <aside className="card flex flex-col gap-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-canvas p-3">
                <span className="t-caption text-muted">{a.relevance}</span>
                <ScoreBadge value={story.relevance.value} size="lg" />
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-canvas p-3">
                <span className="t-caption text-muted">{a.opportunity}</span>
                <ScoreBadge value={story.opportunity.value} size="lg" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="t-small font-semibold">{a.why} · {a.relevance}</h3>
              <ScoreReasons score={story.relevance} locale={locale} pts={a.points} />
            </div>
            <details className="border-t border-line pt-3">
              <summary className="cursor-pointer t-small font-semibold">{a.why} · {a.opportunity}</summary>
              <div className="mt-2"><ScoreReasons score={story.opportunity} locale={locale} pts={a.points} /></div>
            </details>
            <HeuristicNote title={a.heuristic} note={a.heuristicNote} />
          </aside>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="t-h2 flex items-center gap-2"><Users className="size-5 text-accent" />{a.audience}</h2>
              <p className="t-small text-ink-2">{a.audienceSub}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {AUDIENCES.map((aud) => {
              const rule = IMPACT[story.category][aud];
              return (
                <div key={aud} className="card flex flex-col gap-3 p-5">
                  <h3 className="t-h3 font-semibold">{a.audiences[aud]}</h3>
                  <Chip tone={LEVEL_TONE[rule.level]} dot className="self-start">{a.levels[rule.level]}</Chip>
                  <p className="t-small text-ink-2">{rule.note[locale]}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 items-start gap-6">
          <div className="card flex flex-col gap-3 p-6">
            <div>
              <h2 className="t-h3 flex items-center gap-2 font-semibold"><Quote className="size-4 text-accent" />{a.keyFacts}</h2>
              <p className="t-caption text-muted">{a.keyFactsNote}</p>
            </div>
            {facts.length ? (
              <ul className="flex flex-col gap-2">
                {facts.map((f) => (
                  <li key={f} className="rounded-md border-s-2 border-accent bg-canvas px-3 py-2 t-small content-en" lang="en">{f}</li>
                ))}
              </ul>
            ) : (
              <p className="t-small text-ink-2">{a.noFacts}</p>
            )}
          </div>
          <div className="card flex flex-col gap-3 p-6">
            <h2 className="t-h3 flex items-center gap-2 font-semibold"><TriangleAlert className="size-4 text-warning" />{a.limits}</h2>
            <ul className="flex list-disc flex-col gap-2 ps-5 t-small text-ink-2">
              {LIMITATIONS.map((l) => <li key={l.en}>{l[locale]}</li>)}
            </ul>
          </div>
        </section>

        <section className="card flex flex-col gap-3 p-6">
          <div>
            <h2 className="t-h3 flex items-center gap-2 font-semibold"><Bot className="size-4 text-accent" />{a.aiTitle}</h2>
            <p className="t-small text-ink-2">{ai.enabled ? null : a.aiOff}</p>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {AI_TASKS.filter((k) => k !== "translate").map((task) => {
              const on = ai.enabled && ai.tasks.includes(task);
              return (
                <li key={task} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 t-small">
                  <span>{a.aiTasks[task]}</span>
                  <Chip tone={on ? "positive" : "neutral"}>{on ? t.news.connected : a.unavailable}</Chip>
                </li>
              );
            })}
          </ul>
        </section>

        {glossary.length > 0 && (
          <section className="card flex flex-col gap-4 p-6">
            <div>
              <h2 className="t-h3 flex items-center gap-2 font-semibold"><BookOpen className="size-4 text-accent" />{a.glossary}</h2>
              <p className="t-small text-ink-2">{a.glossarySub}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {glossary.map((g) => (
                <div key={g.en} className="flex flex-col gap-1 rounded-lg border border-line p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="t-small font-semibold">{g.term[locale]}</span>
                    {locale === "ar" && <span className="t-caption text-muted content-en">{g.en}</span>}
                  </div>
                  <p className="t-small text-ink-2">{g.def[locale]}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }
}
