import Link from "next/link";
import { BadgeCheck, Clapperboard, Inbox, Layers, PenLine, Target, Users, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { HeuristicNote, ScoreBadge } from "@/components/Scores";
import { Bidi, ButtonLink, Chip, cx } from "@/components/ui";
import { OPPORTUNITY_WEIGHTS } from "@/lib/analysis/score";
import { getContext } from "@/lib/context";
import type { ContentLanguage } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { readNews } from "@/lib/news/store";
import { AUDIENCE_LABEL, FORMAT_LABEL, OBJECTIVE_LABEL, type Audience, type Format } from "@/lib/opportunities/angles";
import { buildOpportunities, rankStories, type Opportunity } from "@/lib/opportunities/build";

export const dynamic = "force-dynamic";

type Search = { aud?: string; fmt?: string; lang?: string; story?: string };

const AUDIENCES: Audience[] = ["firstTime", "sellers", "homeowners", "investors", "arab", "english"];
const FORMATS: Format[] = ["reel", "carousel"];
const LANGS: ContentLanguage[] = ["ar", "en", "both"];

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { t, locale, user } = await getContext();
  const o = t.opps;
  const store = await readNews();
  const audience = AUDIENCES.includes(sp.aud as Audience) ? (sp.aud as Audience) : undefined;
  const format = FORMATS.includes(sp.fmt as Format) ? (sp.fmt as Format) : undefined;
  const lang = LANGS.includes(sp.lang as ContentLanguage) ? (sp.lang as ContentLanguage) : user.settings.contentLanguage;

  const ranked = rankStories(Object.values(store.items));
  const scoped = sp.story ? ranked.filter((r) => r.item.id === sp.story) : ranked;
  const opps = buildOpportunities(scoped, { audience, format });
  const top = opps.slice(0, 3);
  const storyFilter = sp.story ? ranked.find((r) => r.item.id === sp.story) : null;

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/opportunities?${s}` : "/opportunities";
  };

  const Seg = <T extends string>({ label, name, value, options, all }: { label: string; name: keyof Search; value?: T; options: { v: T; label: string }[]; all?: boolean }) => (
    <div className="flex items-center gap-2">
      <span className="t-caption text-muted">{label}</span>
      <div className="flex flex-wrap gap-1 rounded-md border border-line bg-surface p-1">
        {all && <Link href={href({ [name]: undefined })} scroll={false} className={cx("rounded px-3 py-1 t-small", !value ? "bg-accent-tint font-semibold text-accent" : "text-ink-2 hover:bg-hover")}>{o.all}</Link>}
        {options.map((opt) => (
          <Link key={opt.v} href={href({ [name]: opt.v })} scroll={false} className={cx("rounded px-3 py-1 t-small", value === opt.v ? "bg-accent-tint font-semibold text-accent" : "text-ink-2 hover:bg-hover")}>{opt.label}</Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <TopBar t={t} locale={locale} title={o.title} subtitle={o.subtitle} />
      <div className="flex flex-col gap-6 px-10 pb-12 pt-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <Seg label={o.audience} name="aud" value={audience} all options={AUDIENCES.map((v) => ({ v, label: AUDIENCE_LABEL[v][locale] }))} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Seg label={o.format} name="fmt" value={format} all options={FORMATS.map((v) => ({ v, label: FORMAT_LABEL[v][locale] }))} />
            <Seg label={o.language} name="lang" value={lang} options={LANGS.map((v) => ({ v, label: o.langs[v] }))} />
          </div>
          <p className="t-caption text-muted">{o.langNote}</p>
          {storyFilter && (
            <div className="flex items-center gap-2 self-start rounded-full bg-accent-tint px-3 py-1 t-small text-accent">
              <span>{o.basedOn}:</span>
              <span className="max-w-[520px] truncate content-en">{storyFilter.item.title}</span>
              <Link href={href({ story: undefined })} aria-label="clear"><X className="size-4" /></Link>
            </div>
          )}
        </div>

        {!ranked.length ? (
          <section className="card flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-lg bg-elevated text-muted"><Inbox className="size-6" /></div>
            <h2 className="t-h2">{o.noNewsTitle}</h2>
            <p className="t-body max-w-xl text-ink-2">{o.noNewsBody}</p>
            <ButtonLink href="/news" variant="secondary">{t.analysis.goNews}</ButtonLink>
          </section>
        ) : !opps.length ? (
          <section className="card flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-lg bg-elevated text-muted"><Inbox className="size-6" /></div>
            <h2 className="t-h2">{o.emptyTitle}</h2>
            <p className="t-body text-ink-2">{o.emptyBody}</p>
            <Link href="/opportunities" className="t-small text-accent">{t.news.clear}</Link>
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="t-h2">{o.top}</h2>
                <p className="t-small text-ink-2">{o.topSub}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {top.map((op, i) => (
                  <article key={op.key} className="card flex flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="ltr grid size-7 place-items-center rounded-md bg-gold-tint t-caption font-semibold text-gold-strong">{String(i + 1).padStart(2, "0")}</span>
                        <FormatChip f={op.angle.format} />
                      </div>
                      <ScoreBadge value={op.story.opportunity.value} />
                    </div>
                    <AngleTitle op={op} lang={lang} className="t-h3 font-semibold" />
                    <p className="t-small text-ink-2">{op.angle.why[locale]}</p>
                    <Meta op={op} />
                    <div className="mt-auto flex flex-wrap gap-2">
                      <ButtonLink href={studioHref(op)} size="sm" icon={<PenLine className="size-3.5" />}>{o.write}</ButtonLink>
                      <ButtonLink href={`/analysis?id=${op.story.item.id}`} variant="secondary" size="sm">{o.view}</ButtonLink>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-[1fr_320px] items-start gap-6">
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                  <h2 className="t-h2">{o.allOpps}</h2>
                  <span className="t-caption text-muted"><span className="ltr font-semibold text-ink">{opps.length}</span> {o.count}</span>
                </div>
                <table className="w-full t-small">
                  <thead className="bg-canvas t-caption text-muted">
                    <tr>
                      <th className="px-6 py-2 text-start font-medium">{o.angle}</th>
                      <th className="py-2 text-start font-medium">{o.format}</th>
                      <th className="py-2 text-start font-medium">{o.objective}</th>
                      <th className="py-2 text-start font-medium">{o.score}</th>
                      <th className="px-6 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {opps.map((op) => (
                      <tr key={op.key} className="border-t border-line align-top">
                        <td className="px-6 py-4">
                          <AngleTitle op={op} lang={lang} className="font-semibold" />
                          <Meta op={op} />
                        </td>
                        <td className="py-4 pe-3"><FormatChip f={op.angle.format} /></td>
                        <td className="py-4 pe-3"><Chip>{OBJECTIVE_LABEL[op.angle.objective][locale]}</Chip></td>
                        <td className="py-4"><ScoreBadge value={op.story.opportunity.value} /></td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex flex-col items-end gap-1.5">
                            <Link href={studioHref(op)} className="whitespace-nowrap font-semibold text-accent hover:underline">{o.write}</Link>
                            <Link href={`/analysis?id=${op.story.item.id}`} className="whitespace-nowrap t-caption text-ink-2 hover:underline">{o.view}</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <aside className="card flex flex-col gap-4 p-5">
                <div>
                  <h3 className="t-h3 flex items-center gap-2 font-semibold"><Target className="size-4 text-accent" />{o.how}</h3>
                  <p className="t-small text-ink-2">{o.howSub}</p>
                </div>
                {(Object.keys(OPPORTUNITY_WEIGHTS) as (keyof typeof OPPORTUNITY_WEIGHTS)[]).map((k) => (
                  <div key={k} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 t-small">
                      <span>{o.weights[k]}</span>
                      <span className="ltr t-caption text-muted">{OPPORTUNITY_WEIGHTS[k]}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${OPPORTUNITY_WEIGHTS[k] * 2.5}%` }} />
                    </div>
                  </div>
                ))}
                <HeuristicNote title={t.analysis.heuristic} note={o.howNote} />
              </aside>
            </section>
          </>
        )}
      </div>
    </>
  );

  /** Opens the studio with this story, angle, format, audience and content language already chosen. */
  function studioHref(op: Opportunity) {
    const p = new URLSearchParams({ story: op.story.item.id, angle: op.angle.id, format: op.angle.format, language: lang });
    if (audience) p.set("aud", audience);
    return `/studio/new?${p.toString()}`;
  }

  function FormatChip({ f }: { f: Format }) {
    const Icon = f === "reel" ? Clapperboard : Layers;
    return (
      <Chip tone={f === "reel" ? "accent" : "gold"}>
        <span className="inline-flex items-center gap-1"><Icon className="size-3.5" />{FORMAT_LABEL[f][locale]}</span>
      </Chip>
    );
  }

  function Meta({ op }: { op: Opportunity }) {
    const i = op.story.item;
    return (
      <div className="mt-1 flex flex-col gap-1 t-caption text-muted">
        <span className="flex flex-wrap items-center gap-1">
          <Users className="size-3.5" />
          {op.angle.audiences.map((a) => AUDIENCE_LABEL[a][locale]).join(locale === "ar" ? "، " : ", ")}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <BadgeCheck className="size-3.5 text-positive" />
          {o.basedOn}: <span className="content-en">{i.publisher}</span> · {i.publishedAt ? formatDate(locale, i.publishedAt) : t.analysis.noDate}
        </span>
      </div>
    );
  }

  /** Shows the angle in the chosen content language; "both" shows the two independent versions. */
  function AngleTitle({ op, lang, className }: { op: Opportunity; lang: ContentLanguage; className?: string }) {
    const ar = <p className={cx(className, "content-ar")} lang="ar"><Bidi>{op.angle.title.ar}</Bidi></p>;
    const en = <p className={cx(className, "content-en")} lang="en">{op.angle.title.en}</p>;
    if (lang === "ar") return ar;
    if (lang === "en") return en;
    return (
      <div className="flex flex-col gap-1">
        {ar}
        <p className="t-small text-ink-2 content-en" lang="en">{op.angle.title.en}</p>
      </div>
    );
  }
}
