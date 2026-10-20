import Link from "next/link";
import { Clapperboard, FilePlus2, Layers, NotebookPen } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ButtonLink, Chip, cx } from "@/components/ui";
import { getContext } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { listDrafts } from "@/lib/studio/store";
import { STATUSES, type DraftStatus } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

const STATUS_TONE = { draft: "neutral", review: "warning", ready: "positive" } as const;

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getContext();
  const s = t.studio;
  const all = await listDrafts();
  const status = STATUSES.includes(sp.status as DraftStatus) ? (sp.status as DraftStatus) : undefined;
  const drafts = status ? all.filter((d) => d.status === status) : all;

  return (
    <>
      <TopBar t={t} locale={locale} title={s.title} subtitle={s.subtitle} />
      <div className="flex flex-col gap-6 px-4 pb-12 pt-6 md:px-10 md:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="t-h2">{s.drafts}</h2>
            <p className="t-small text-ink-2">{s.draftsSub}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/studio/new?format=reel" icon={<Clapperboard className="size-4" />}>{s.newDraft} · {s.formats.reel}</ButtonLink>
            <ButtonLink href="/studio/new?format=carousel" variant="secondary" icon={<Layers className="size-4" />}>{s.newDraft} · {s.formats.carousel}</ButtonLink>
          </div>
        </div>

        {all.length > 0 && (
          <div className="flex flex-wrap gap-1 self-start rounded-md border border-line bg-surface p-1 t-small">
            {[undefined, ...STATUSES].map((v) => (
              <Link key={v ?? "all"} href={v ? `/studio?status=${v}` : "/studio"} className={cx("rounded px-3 py-1", status === v ? "bg-accent-tint font-semibold text-accent" : "text-ink-2 hover:bg-hover")}>
                {v ? s.statuses[v] : s.all} <span className="ltr text-muted">({v ? all.filter((d) => d.status === v).length : all.length})</span>
              </Link>
            ))}
          </div>
        )}

        {!all.length ? (
          <section className="card flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-lg bg-accent-tint text-accent"><NotebookPen className="size-6" /></div>
            <h2 className="t-h2">{s.emptyTitle}</h2>
            <p className="t-body max-w-xl text-ink-2">{s.emptyBody}</p>
            <ButtonLink href="/studio/new" icon={<FilePlus2 className="size-4" />}>{s.newDraft}</ButtonLink>
          </section>
        ) : !drafts.length ? (
          <p className="card p-10 text-center t-small text-ink-2">{t.news.emptyTitle}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((d) => {
              const c = d.content.ar ?? d.content.en;
              const Icon = d.format === "reel" ? Clapperboard : Layers;
              return (
                <li key={d.id}>
                  <Link href={`/studio/${d.id}`} className="card flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-glow">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={d.format === "reel" ? "accent" : "gold"}><span className="inline-flex items-center gap-1"><Icon className="size-3.5" />{s.formats[d.format]}</span></Chip>
                      <Chip>{s.langs[d.language]}</Chip>
                      <Chip tone={STATUS_TONE[d.status]} dot className="ms-auto">{s.statuses[d.status]}</Chip>
                    </div>
                    <h3 className={cx("t-h3 font-semibold", d.content.ar ? "content-ar" : "content-en")}>{c?.title}</h3>
                    <p className="t-caption text-ink-2">{s.audiences[d.audience]}</p>
                    <p className="mt-auto t-caption text-muted">
                      {s.basedOn}: <span className="content-en">{d.story.publisher}</span>
                      <br />
                      {s.updated}: {formatDate(locale, d.updatedAt, true)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
