import Link from "next/link";
import { BadgeCheck, ExternalLink, Inbox } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ScoreBadge } from "@/components/Scores";
import { Bidi, ButtonLink, Chip, cx } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/analysis/rules";
import { getContext } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { readNews } from "@/lib/news/store";
import { ANGLES, type Audience } from "@/lib/opportunities/angles";
import { rankStories } from "@/lib/opportunities/build";
import { AUDIENCES, type StudioAudience } from "@/lib/studio/types";
import { NewDraftForm } from "./NewDraftForm";

export const dynamic = "force-dynamic";

type Search = { story?: string; format?: string; audience?: string; language?: string; angle?: string; aud?: string };

/** Content Opportunities audiences mapped to the studio's audiences. */
const FROM_OPPORTUNITY: Record<Audience, StudioAudience> = { firstTime: "buyers", sellers: "sellers", homeowners: "residents", investors: "investors", arab: "arab", english: "residents" };

export default async function NewDraftPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { t, locale, user } = await getContext();
  const s = t.studio;
  const store = await readNews();
  const ranked = rankStories(Object.values(store.items));
  const selections = new Set(store.selections[user.id] ?? []);
  // Stories the user selected in News Monitor come first.
  const stories = [...ranked.filter((r) => selections.has(r.item.id)), ...ranked.filter((r) => !selections.has(r.item.id))];
  const chosen = sp.story ? ranked.find((r) => r.item.id === sp.story) ?? null : null;

  const audience: StudioAudience = AUDIENCES.includes(sp.audience as StudioAudience)
    ? (sp.audience as StudioAudience)
    : sp.aud && sp.aud in FROM_OPPORTUNITY
      ? FROM_OPPORTUNITY[sp.aud as Audience]
      : "arab";
  const language = sp.language === "ar" || sp.language === "en" || sp.language === "both" ? sp.language : user.settings.contentLanguage;
  const format = sp.format === "carousel" ? "carousel" : "reel";
  const angle = chosen ? ANGLES[chosen.category].find((a) => a.id === sp.angle) : undefined;

  const linkFor = (id: string) => {
    const p = new URLSearchParams(Object.entries({ ...sp, story: id, angle: undefined }).filter(([, v]) => v) as [string, string][]);
    return `/studio/new?${p.toString()}`;
  };
  const tr = chosen ? store.translations[chosen.item.id] : undefined;

  return (
    <>
      <TopBar t={t} locale={locale} title={s.newDraft} subtitle={s.templateNote} />
      <div className="flex flex-col gap-6 px-4 pb-12 pt-6 md:px-10 md:pt-8">
        <ol className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 t-small">
          {[s.steps.story, s.steps.setup, s.steps.create].map((label, i) => {
            const done = i === 0 ? !!chosen : false;
            const current = chosen ? i === 1 : i === 0;
            return (
              <li key={label} className={cx("flex items-center gap-2", current ? "font-semibold text-ink" : "text-ink-2")}>
                <span className={cx("ltr grid size-6 place-items-center rounded-full t-caption", done ? "bg-accent text-white" : current ? "border-2 border-accent text-accent" : "border border-line text-muted")}>{i + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>

        {!ranked.length ? (
          <section className="card flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-lg bg-elevated text-muted"><Inbox className="size-6" /></div>
            <h2 className="t-h2">{s.noNewsTitle}</h2>
            <p className="t-body max-w-xl text-ink-2">{s.noNewsBody}</p>
            <ButtonLink href="/news" variant="secondary">{s.goNews}</ButtonLink>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="flex min-w-0 flex-col gap-4">
              {chosen ? (
                <article className="card flex flex-col gap-3 border-positive/30 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 t-small font-semibold text-positive"><BadgeCheck className="size-4" />{s.selectedStory}</span>
                    <Link href={`/studio/new?${new URLSearchParams(Object.entries({ ...sp, story: undefined, angle: undefined }).filter(([, v]) => v) as [string, string][]).toString()}`} className="t-small text-accent hover:underline">{s.change}</Link>
                  </div>
                  {tr && locale === "ar" ? <h2 className="t-h2"><Bidi>{tr.titleAr}</Bidi></h2> : <h2 className="t-h2 content-en" lang="en">{chosen.item.title}</h2>}
                  <div className="flex flex-wrap items-center gap-2 t-caption text-ink-2">
                    <span className="content-en">{chosen.item.publisher}</span>
                    <span>·</span>
                    <span>{chosen.item.publishedAt ? formatDate(locale, chosen.item.publishedAt) : s.noDate}</span>
                    <a href={chosen.item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:underline">{s.openSource}<ExternalLink className="size-3.5" /></a>
                  </div>
                  <p className="t-small text-ink-2 content-en" lang="en">{chosen.item.summary || chosen.item.body?.slice(0, 500)}</p>
                  <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
                    <Chip>{CATEGORY_LABEL[chosen.category][locale]}</Chip>
                    <span className="flex items-center gap-2 t-caption text-muted">{s.relevance} <ScoreBadge value={chosen.relevance.value} /></span>
                    <span className="flex items-center gap-2 t-caption text-muted">{s.opportunity} <ScoreBadge value={chosen.opportunity.value} /></span>
                    <span className="t-caption text-muted">({s.autoScore})</span>
                  </div>
                </article>
              ) : (
                <div>
                  <h2 className="t-h2">{s.chooseStory}</h2>
                  <p className="t-small text-ink-2">{s.chooseStorySub}</p>
                </div>
              )}
              {!chosen && (
                <ul className="card divide-y divide-line overflow-hidden">
                  {stories.map((r) => {
                    const trr = store.translations[r.item.id];
                    return (
                      <li key={r.item.id}>
                        <Link href={linkFor(r.item.id)} className="flex flex-col gap-1.5 px-5 py-4 hover:bg-hover sm:flex-row sm:items-start sm:gap-4">
                          <div className="min-w-0 flex-1">
                            {trr && locale === "ar" ? <div className="font-semibold"><Bidi>{trr.titleAr}</Bidi></div> : <div className="font-semibold content-en" lang="en">{r.item.title}</div>}
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 t-caption text-muted">
                              <span className="content-en">{r.item.publisher}</span>
                              <span>·</span>
                              <span>{r.item.publishedAt ? formatDate(locale, r.item.publishedAt) : s.noDate}</span>
                              {selections.has(r.item.id) && <Chip tone="accent">{t.analysis.selected}</Chip>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <Chip>{CATEGORY_LABEL[r.category][locale]}</Chip>
                            <ScoreBadge value={r.relevance.value} label={s.relevance} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <NewDraftForm
              t={s}
              storyId={chosen?.item.id ?? null}
              defaults={{ audience, language, format }}
              angle={angle ? { id: angle.id, title: angle.title[locale] } : null}
            />
          </div>
        )}
      </div>
    </>
  );
}
