"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, Clapperboard, CopyPlus, ExternalLink, FilePlus2, FolderOpen, Layers, Loader2, PencilLine, Search, SearchX, Trash2, TriangleAlert, X } from "lucide-react";
import { useConfirm, useToast } from "@/components/Feedback";
import { STATUS_TONE, StatusChip } from "@/components/StatusChip";
import { Bidi, ButtonLink, Chip, cx } from "@/components/ui";
import type { Locale } from "@/lib/db";
import type { Dict } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { deleteDraft, duplicateDraft, setDraftStatus } from "@/lib/studio/actions";
import { draftStats, filterDrafts, type DraftSummary, type LibraryFilter } from "@/lib/studio/library";
import { STATUSES, type DraftFormat, type DraftLanguage, type DraftStatus } from "@/lib/studio/types";

type L = Dict["library"];
type S = Dict["studio"];

const DOT: Record<(typeof STATUS_TONE)[DraftStatus], string> = { neutral: "bg-muted", warning: "bg-warning", negative: "bg-negative", accent: "bg-accent", positive: "bg-positive" };

/** Keeps the filters in the address bar so a filtered view survives a refresh and can be shared. */
function syncUrl(f: LibraryFilter) {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
  const s = p.toString();
  window.history.replaceState(null, "", s ? `/library?${s}` : "/library");
}

export function LibraryView({ drafts, unreadable, initial, t, s, locale }: { drafts: DraftSummary[]; unreadable: number; initial: LibraryFilter; t: L; s: S; locale: Locale }) {
  const router = useRouter();
  const [f, setF] = useState<LibraryFilter>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const { confirm, view: confirmView } = useConfirm();

  useEffect(() => syncUrl(f), [f]);

  const shown = useMemo(() => filterDrafts(drafts, f), [drafts, f]);
  const stats = useMemo(() => draftStats(drafts), [drafts]);
  const active = Object.values(f).some(Boolean);
  const set = (patch: Partial<LibraryFilter>) => setF((prev) => ({ ...prev, ...patch }));

  const run = (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        toast.show({ text: s.saveErrors.failed, tone: "error" });
      }
      setBusy(null);
    });
  };

  const changeStatus = async (d: DraftSummary, status: DraftStatus) => {
    if (status === d.status) return;
    if (status === "approved" && !(await confirm({ title: s.approveTitle, body: s.approveBody, confirm: s.approve, cancel: s.cancel }))) return;
    run(d.id, async () => {
      const res = await setDraftStatus(d.id, status);
      if ("error" in res) return toast.show({ text: s.saveErrors[res.error as keyof S["saveErrors"]] ?? s.saveErrors.failed, tone: "error" });
      toast.show({ text: s.statusChanged.replace("{status}", s.statuses[status]), tone: "ok" });
      router.refresh();
    });
  };

  const duplicate = (d: DraftSummary) =>
    run(d.id, async () => {
      const res = await duplicateDraft(d.id);
      if ("error" in res) return toast.show({ text: s.saveErrors[res.error as keyof S["saveErrors"]] ?? s.saveErrors.failed, tone: "error" });
      toast.show({ text: s.duplicated, tone: "ok" });
      router.refresh();
    });

  const remove = async (d: DraftSummary) => {
    if (!(await confirm({ title: s.deleteTitle, body: `«${d.title}» · ${s.deleteConfirm}`, confirm: s.delete, cancel: s.cancel, danger: true }))) return;
    run(d.id, async () => {
      const res = await deleteDraft(d.id);
      toast.show(res.ok ? { text: s.deleted, tone: "ok" } : { text: s.saveErrors.not_found, tone: "error" });
      router.refresh();
    });
  };

  if (!drafts.length) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-12 pt-6 md:px-10 md:pt-8">
        {unreadable > 0 && <Unreadable n={unreadable} t={t} />}
        <section className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid size-12 place-items-center rounded-lg bg-accent-tint text-accent"><FolderOpen className="size-6" /></div>
          <h2 className="t-h2">{t.emptyTitle}</h2>
          <p className="t-body max-w-xl text-ink-2">{t.emptyBody}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/studio/new?format=reel" icon={<Clapperboard className="size-4" />}>{s.newDraft} · {s.formats.reel}</ButtonLink>
            <ButtonLink href="/studio/new?format=carousel" variant="secondary" icon={<Layers className="size-4" />}>{s.newDraft} · {s.formats.carousel}</ButtonLink>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-16 pt-6 md:px-10 md:pt-8">
      {unreadable > 0 && <Unreadable n={unreadable} t={t} />}

      {/* Status overview doubles as the status filter */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {[undefined, ...STATUSES].map((st) => {
          const on = f.status === st;
          const count = st ? stats.byStatus[st] : stats.total;
          return (
            <button
              key={st ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => set({ status: st })}
              className={cx("card flex flex-col items-start gap-1 px-4 py-3 text-start transition-colors", on ? "border-accent ring-1 ring-accent" : "hover:border-line-strong")}
            >
              <span className="flex items-center gap-1.5 t-caption text-ink-2">
                {st && <span className={cx("size-2 rounded-full", DOT[STATUS_TONE[st]])} />}
                {st ? s.statuses[st] : t.all}
              </span>
              <span className="ltr t-h2 font-semibold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search and filters */}
      <section aria-label={t.filters} className="card flex flex-col gap-3 p-4">
        <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-canvas px-3 focus-within:border-accent">
          <Search className="size-4 shrink-0 text-muted" />
          <span className="sr-only">{t.searchLabel}</span>
          <input type="search" value={f.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} placeholder={t.search} className="min-w-0 flex-1 bg-transparent t-small outline-none placeholder:text-muted" style={{ unicodeBidi: "plaintext" }} />
          {f.q && <button type="button" onClick={() => set({ q: undefined })} aria-label={t.clear} className="grid size-7 place-items-center rounded text-muted hover:bg-hover"><X className="size-4" /></button>}
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <Select label={t.format} value={f.format ?? ""} onChange={(v) => set({ format: (v || undefined) as DraftFormat | undefined })} options={[["", t.all], ["reel", s.formats.reel], ["carousel", s.formats.carousel]]} />
          <Select label={t.language} value={f.language ?? ""} onChange={(v) => set({ language: (v || undefined) as DraftLanguage | undefined })} options={[["", t.all], ["ar", s.langs.ar], ["en", s.langs.en], ["both", s.langs.both]]} />
          <Select label={t.status} value={f.status ?? ""} onChange={(v) => set({ status: (v || undefined) as DraftStatus | undefined })} options={[["", t.all], ...STATUSES.map((st) => [st, s.statuses[st]] as [string, string])]} />
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 flex items-center gap-1 t-caption text-muted"><CalendarDays className="size-3.5" />{t.date}</legend>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 t-caption text-ink-2">{t.from}<input type="date" value={f.from ?? ""} max={f.to} onChange={(e) => set({ from: e.target.value || undefined })} className="ltr h-10 rounded-md border border-line bg-surface px-2 t-small" /></label>
              <label className="flex items-center gap-1.5 t-caption text-ink-2">{t.to}<input type="date" value={f.to ?? ""} min={f.from} onChange={(e) => set({ to: e.target.value || undefined })} className="ltr h-10 rounded-md border border-line bg-surface px-2 t-small" /></label>
            </div>
          </fieldset>
          {active && <button type="button" onClick={() => setF({})} className="h-10 rounded-md px-3 t-small font-medium text-accent hover:bg-accent-tint">{t.clear}</button>}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-small text-ink-2" aria-live="polite">{t.results.replace("{n}", String(shown.length)).replace("{total}", String(drafts.length))}</p>
        <p className="t-caption text-muted">{t.storageNote}</p>
      </div>

      {!shown.length ? (
        <section className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid size-12 place-items-center rounded-lg bg-elevated text-muted"><SearchX className="size-6" /></div>
          <h2 className="t-h2">{t.noMatchTitle}</h2>
          <p className="t-body text-ink-2">{t.noMatchBody}</p>
          <button type="button" onClick={() => setF({})} className="t-small font-medium text-accent hover:underline">{t.clear}</button>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((d) => {
            const Icon = d.format === "reel" ? Clapperboard : Layers;
            const pending = busy === d.id;
            return (
              <li key={d.id} className={cx("card flex flex-col gap-3 p-5 transition-opacity", pending && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={d.format === "reel" ? "accent" : "gold"}><span className="inline-flex items-center gap-1"><Icon className="size-3.5" />{s.formats[d.format]}</span></Chip>
                  <Chip>{s.langs[d.language]}</Chip>
                  {d.duplicatedFrom && <Chip>{s.copyBadge}</Chip>}
                  <StatusChip status={d.status} label={s.statuses[d.status]} className="ms-auto" />
                </div>

                <Link href={`/studio/${d.id}`} className="group flex flex-col gap-1.5">
                  <h3 className={cx("t-h3 font-semibold group-hover:text-accent", d.titleLang === "ar" ? "content-ar" : "content-en")} lang={d.titleLang}>{d.titleLang === "ar" ? <Bidi>{d.title}</Bidi> : d.title}</h3>
                  {d.preview && <p className={cx("line-clamp-3 t-small text-ink-2", d.previewLang === "ar" ? "content-ar" : "content-en")} lang={d.previewLang} style={{ unicodeBidi: "plaintext" }}>{d.preview}</p>}
                </Link>

                <div className="flex flex-col gap-1 rounded-md bg-canvas p-3 t-caption">
                  <span className="text-muted">{t.story}</span>
                  <span className="line-clamp-2 font-medium content-en" lang="en">{d.story.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-2">
                    <span className="content-en">{d.story.publisher}</span>
                    <span aria-hidden>·</span>
                    <span>{d.story.publishedAt ? formatDate(locale, d.story.publishedAt) : s.noDate}</span>
                    <a href={d.story.url} target="_blank" rel="noopener noreferrer" className="ms-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">{t.source}<ExternalLink className="size-3" /></a>
                  </span>
                </div>

                <p className="t-caption text-muted">{t.created}: {formatDate(locale, d.createdAt, true)}</p>

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Link href={`/studio/${d.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 t-caption font-medium text-white hover:bg-accent-strong"><PencilLine className="size-3.5" />{t.open}</Link>
                  <label className="flex h-8 items-center rounded-md border border-line bg-surface px-2 t-caption">
                    <span className="sr-only">{t.statusLabel}</span>
                    <select value={d.status} disabled={pending} onChange={(e) => changeStatus(d, e.target.value as DraftStatus)} className="bg-transparent outline-none">
                      {STATUSES.map((st) => <option key={st} value={st}>{s.statuses[st]}</option>)}
                    </select>
                  </label>
                  <span className="ms-auto flex items-center gap-1">
                    {pending && <Loader2 className="size-4 animate-spin text-muted" />}
                    <IconBtn label={s.duplicate} onClick={() => duplicate(d)} disabled={pending}><CopyPlus className="size-4" /></IconBtn>
                    <IconBtn label={s.delete} onClick={() => remove(d)} disabled={pending} danger><Trash2 className="size-4" /></IconBtn>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-center">
        <ButtonLink href="/studio/new" variant="secondary" icon={<FilePlus2 className="size-4" />}>{s.newDraft}</ButtonLink>
      </div>
      {toast.view}
      {confirmView}
    </div>
  );
}

function Unreadable({ n, t }: { n: number; t: L }) {
  return <p role="alert" className="flex items-start gap-2 rounded-md bg-warning-tint p-3 t-small text-ink-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />{t.unreadable.replace("{n}", String(n))}</p>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 t-caption text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx("h-10 min-w-[140px] rounded-md border bg-surface px-2 t-small text-ink", value ? "border-accent" : "border-line")}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cx("inline-flex h-8 items-center gap-1 rounded-md px-2 t-caption text-ink-2 hover:bg-hover disabled:opacity-50", danger ? "hover:text-negative" : "hover:text-accent")}>
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
