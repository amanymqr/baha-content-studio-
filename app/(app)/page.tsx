import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, Clapperboard, Home, KeyRound, Layers, Percent, ShieldCheck, Sparkles, TrendingUp, Users, Wand2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Bidi, ButtonLink, Chip, SampleNote, SectionHead, cx } from "@/components/ui";
import { getContext } from "@/lib/context";
import { audience, hero, monthly, news, opportunities, stats, week, type Stat } from "@/lib/sample";
import type { Locale } from "@/lib/db";

const toneOf: Record<Stat["tone"], "neutral" | "positive" | "negative" | "warning"> = { neutral: "neutral", positive: "positive", negative: "negative", warning: "warning" };

function ScoreRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-gold-tint)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} />
      </svg>
      <span className="absolute font-[family-name:var(--font-en)] text-xl font-bold">{value}</span>
    </div>
  );
}

function Sparkline({ data, tone }: { data: number[]; tone: Stat["tone"] }) {
  const w = 220, h = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((v - min) / (max - min || 1)) * (h - 8)}`).join(" ");
  const color = tone === "negative" ? "var(--color-negative)" : tone === "positive" ? "var(--color-positive)" : "var(--color-accent)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MarketChart({ locale, labels }: { locale: Locale; labels: { sales: string; avgPrice: string } }) {
  const w = 640, h = 220, pad = { l: 36, r: 48, t: 12, b: 28 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const maxSales = 7000;
  const bw = iw / monthly.sales.length;
  const pMin = 0.98, pMax = 1.16;
  const py = (p: number) => pad.t + ih - ((p - pMin) / (pMax - pMin)) * ih;
  const line = monthly.price.map((p, i) => `${pad.l + bw * i + bw / 2},${py(p)}`).join(" ");
  const last = monthly.sales.length - 1;
  return (
    <div dir="ltr" className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${labels.sales} / ${labels.avgPrice}`}>
        {[0, 3500, 7000].map((v) => {
          const y = pad.t + ih - (v / maxSales) * ih;
          return (
            <g key={v}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-line)" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-muted text-[10px]">{v === 0 ? "0" : `${v / 1000}k`}</text>
            </g>
          );
        })}
        <text x={w - pad.r + 8} y={py(1.16) + 4} className="fill-muted text-[10px]">$1.16M</text>
        <text x={w - pad.r + 8} y={py(0.98)} className="fill-muted text-[10px]">$0.98M</text>
        {monthly.sales.map((s, i) => {
          const bh = (s / maxSales) * ih;
          return <rect key={i} x={pad.l + bw * i + bw * 0.18} y={pad.t + ih - bh} width={bw * 0.64} height={bh} rx="4" fill={i === last ? "var(--color-accent)" : "var(--color-accent-soft)"} />;
        })}
        <polyline points={line} fill="none" stroke="var(--color-ink)" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx={pad.l + bw * last + bw / 2} cy={py(monthly.price[last])} r="4" fill="white" stroke="var(--color-gold)" strokeWidth="2" />
        {monthly.months[locale].map((m, i) =>
          i % 2 === 0 || i === last ? (
            <text key={m} x={pad.l + bw * i + bw / 2} y={h - 8} textAnchor="middle" className={cx("text-[11px]", i === last ? "fill-ink font-semibold" : "fill-muted")} style={{ fontFamily: locale === "ar" ? "var(--font-ar)" : "var(--font-en)" }}>
              {m}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

const audienceIcon = { home: Home, percent: Percent, key: KeyRound, trend: TrendingUp } as const;

export default async function Dashboard() {
  const { t, locale, user } = await getContext();
  const d = t.dashboard;
  const explain = user.settings.explanations.metricMeaning;
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-CA", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Toronto" }).format(new Date());
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const Out = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const firstName = user.name[locale].split(" ")[0];

  return (
    <>
      <TopBar t={t} locale={locale} title={d.greeting(firstName)} subtitle={d.subtitle(date)} />
      <div className="flex flex-col gap-8 px-10 pb-12 pt-10">
        {/* Top opportunity */}
        <section className="card flex gap-10 p-10">
          <div className="flex flex-1 flex-col items-start gap-4">
            <Chip tone="gold"><Sparkles className="size-3.5" />{d.heroBadge}</Chip>
            <h2 className="t-h1 max-w-[620px]">{hero.title[locale]}</h2>
            <p className="t-body max-w-[620px] text-ink-2">{hero.body[locale]}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <ButtonLink href="/reels" icon={<Clapperboard className="size-4" />}>{d.writeReel}</ButtonLink>
              <ButtonLink href="/carousel" variant="secondary" icon={<Layers className="size-4" />}>{d.makeCarousel}</ButtonLink>
              <ButtonLink href="/analysis" variant="ghost" icon={<Out className="size-4" />}>{d.seeAnalysis}</ButtonLink>
            </div>
          </div>
          <div className="flex w-[300px] shrink-0 flex-col gap-5 rounded-lg border border-line bg-canvas p-5">
            <div className="flex items-center gap-4">
              <ScoreRing value={hero.score} />
              <div>
                <div className="t-small font-semibold">{d.score}</div>
                <div className="t-caption text-gold-strong"><Bidi>{d.scoreNote}</Bidi></div>
              </div>
            </div>
            {hero.bars.map((b) => (
              <div key={b.key} className="flex flex-col gap-1.5">
                <div className="flex justify-between t-caption text-ink-2"><span>{d[b.key]}</span><span className="ltr font-semibold text-ink">{b.value}</span></div>
                <div className="h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${b.value}%` }} /></div>
              </div>
            ))}
            <div className="flex items-center gap-1.5 t-caption text-muted"><ShieldCheck className="size-3.5 text-positive" /><span className="content-en">{hero.sources}</span></div>
          </div>
        </section>

        {/* Quick create */}
        <section className="grid grid-cols-3 gap-4">
          {[
            { href: "/reels", icon: Clapperboard, title: d.quickReel, body: d.quickReelBody, badge: d.mostUsed },
            { href: "/carousel", icon: Layers, title: d.quickCarousel, body: d.quickCarouselBody },
            { href: "/reels", icon: Wand2, title: d.quickIdea, body: d.quickIdeaBody },
          ].map((q) => (
            <Link key={q.title} href={q.href} className="card group flex items-start gap-4 p-5 transition-shadow hover:shadow-glow">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-accent-tint text-accent"><q.icon className="size-5" /></div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2"><span className="t-h3 font-semibold">{q.title}</span>{q.badge && <Chip tone="gold">{q.badge}</Chip>}</div>
                <p className="t-small text-ink-2"><Bidi>{q.body}</Bidi></p>
                <div className="flex gap-1.5">
                  <Chip>{d.langAr}</Chip><Chip>{d.langEn}</Chip><Chip tone={user.settings.contentLanguage === "both" ? "accent" : "neutral"}>{d.langBoth}</Chip>
                </div>
              </div>
              <Next className="mt-3 size-4 text-muted transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
            </Link>
          ))}
        </section>

        {/* Market pulse */}
        <SectionHead title={d.pulse} sub={d.pulseSub} aside={<Chip tone="positive" dot>{d.live}</Chip>} />
        <section className="grid grid-cols-4 gap-5">
          {stats.map((s) => (
            <div key={s.source + s.value} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="t-small text-ink-2">{s.label[locale]}</span>
                <span className="t-caption text-muted content-en">{s.source}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="t-metric ltr">{s.value}</span>
                <Chip tone={toneOf[s.tone]}><Bidi>{s.delta[locale]}</Bidi></Chip>
              </div>
              <Sparkline data={s.spark} tone={s.tone} />
              <div className="t-caption text-muted">{s.foot[locale]}</div>
              {explain && (
                <div className="rounded-md bg-canvas p-3 t-caption text-ink-2">
                  <span className="font-semibold text-accent">{d.means} </span>
                  {s.means[locale]}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-[1.45fr_1fr] gap-5">
          <div className="card flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="t-h3 font-semibold">{d.chartTitle}</h3>
                <p className="t-caption text-muted">{d.chartSub}</p>
              </div>
              <div className="flex gap-4 t-caption text-ink-2">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent-soft" />{d.sales}</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-ink" />{d.avgPrice}</span>
              </div>
            </div>
            <MarketChart locale={locale} labels={d} />
          </div>
          <div className="card flex flex-col gap-4 p-6">
            <div>
              <h3 className="t-h3 font-semibold">{d.audienceTitle}</h3>
              <p className="t-caption text-muted"><Bidi>{d.audienceSub}</Bidi></p>
            </div>
            <div className="flex flex-col gap-4">
              {audience.map((a) => {
                const Icon = audienceIcon[a.icon];
                const pos = a.value >= 0;
                return (
                  <div key={a.icon} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between t-small">
                      <span className="flex items-center gap-2"><Icon className="size-4 text-ink-2" />{a.label[locale]}</span>
                      <span className={cx("ltr font-semibold", pos ? (a.value > 20 ? "text-positive" : "text-ink-2") : "text-negative")}>{pos ? `+${a.value}` : a.value}</span>
                    </div>
                    {/* Centre-zero bar: positive grows toward the reading direction's start. */}
                    <div className="relative h-1.5 rounded-full bg-line">
                      <span className="absolute inset-y-0 start-1/2 w-px bg-line-strong" />
                      <span
                        className={cx("absolute inset-y-0 rounded-full", pos ? (a.value > 20 ? "bg-positive" : "bg-muted") : "bg-negative")}
                        style={pos ? { insetInlineEnd: "50%", width: `${Math.max(a.value, 3) / 2}%` } : { insetInlineStart: "50%", width: `${Math.abs(a.value) / 2}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex items-center gap-2 rounded-md bg-canvas p-3 t-caption text-ink-2"><Sparkles className="size-3.5 text-gold-strong" />{d.audienceTip}</div>
          </div>
        </section>

        {/* News + opportunities */}
        <section className="grid grid-cols-[1.45fr_1fr] items-start gap-6">
          <div className="flex flex-col gap-4">
            <SectionHead title={d.latestNews} sub={d.latestNewsSub} aside={<Link href="/news" className="flex items-center gap-1 t-small text-accent">{d.allNews}<Next className="size-4" /></Link>} />
            {news.map((n) => (
              <article key={n.title.en} className="card flex gap-5 p-5">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2 t-caption text-muted">
                    <span className="grid size-9 place-items-center rounded-md bg-accent-tint text-[10px] font-bold text-accent content-en" style={{ textAlign: "center" }}>{n.source}</span>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 font-semibold text-ink">{n.sourceName[locale]}<BadgeCheck className="size-3.5 text-positive" /><span className="font-normal text-positive">{d.official}</span></span>
                      <span>{n.ago[locale]} · {n.topic[locale]}</span>
                    </div>
                  </div>
                  <h3 className="t-h3 font-semibold">{n.title[locale]}</h3>
                  <p className="t-small text-ink-2">{n.body[locale]}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={n.impact === "high" ? "negative" : "warning"} dot>{n.impact === "high" ? (locale === "ar" ? "تأثير مرتفع" : "High impact") : locale === "ar" ? "تأثير متوسط" : "Medium impact"}</Chip>
                    {n.tags[locale].map((tag) => <Chip key={tag}>{tag}</Chip>)}
                    <Link href="/reels" className="ms-auto flex items-center gap-1 t-small text-accent"><Sparkles className="size-3.5" />{d.turnIntoContent}</Link>
                  </div>
                </div>
                <ScoreRing value={n.score} size={52} />
              </article>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <SectionHead title={d.topOpportunities} aside={<Link href="/opportunities" className="flex items-center gap-1 t-small text-accent">{d.all} <span className="ltr">(8)</span><Next className="size-4" /></Link>} />
            {opportunities.map((o) => (
              <article key={o.rank} className="card flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <Chip tone="gold" className="ltr">{o.rank}</Chip>
                  <Chip tone="accent">{o.format[locale]}</Chip>
                  <span className="ms-auto font-[family-name:var(--font-en)] text-xl font-bold text-gold-strong ltr">{o.score}<span className="text-xs font-medium text-muted">/100</span></span>
                </div>
                <h3 className="t-h3 font-semibold">{o.title[locale]}</h3>
                <p className="t-small text-ink-2"><Bidi>{o.body[locale]}</Bidi></p>
                <div className="flex items-center gap-1.5 t-caption text-muted"><Users className="size-3.5" />{o.audience[locale]}</div>
                <div className="flex gap-2">
                  <ButtonLink href="/reels" size="sm" icon={<Clapperboard className="size-3.5" />}>{d.script}</ButtonLink>
                  <ButtonLink href="/carousel" size="sm" variant="secondary" icon={<Layers className="size-3.5" />}>{d.carousel}</ButtonLink>
                </div>
              </article>
            ))}
            <div className="card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="t-h3 font-semibold">{d.thisWeek}</h3>
                <span className="t-caption text-muted">{d.planned(3, 5)}</span>
              </div>
              {week.map((w) => (
                <div key={w.date} className="flex items-center gap-3 border-t border-line pt-3">
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-md bg-gold-tint py-1">
                    <span className="text-[10px] text-gold-strong">{w.day[locale]}</span>
                    <span className="t-small font-semibold">{w.date}</span>
                  </div>
                  <span className="flex-1 t-small"><Bidi>{w.title[locale]}</Bidi></span>
                  <Chip tone={w.status === "published" ? "positive" : w.status === "scheduled" ? "accent" : "neutral"} dot>
                    {locale === "ar" ? { published: "منشور", scheduled: "مجدول", draft: "مسودة" }[w.status] : { published: "Published", scheduled: "Scheduled", draft: "Draft" }[w.status]}
                  </Chip>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SampleNote badge={t.sample.badge} note={t.sample.note} />
      </div>
    </>
  );
}
