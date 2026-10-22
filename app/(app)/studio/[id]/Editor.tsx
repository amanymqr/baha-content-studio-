"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BadgeCheck, Braces, CalendarClock, Check, ChevronLeft, ChevronRight, Copy, CopyPlus, Download, ExternalLink, FileText, History, Info, Loader2, Plus, Quote, RefreshCw, Save, Shuffle, Trash2, TriangleAlert, X } from "lucide-react";
import { useConfirm, useToast } from "@/components/Feedback";
import { STATUS_TONE, StatusChip } from "@/components/StatusChip";
import { Bidi, Button, Chip, cx } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/analysis/rules";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/db";
import { deleteDraft, duplicateDraft, regenerateDraft, saveDraft, setDraftStatus } from "@/lib/studio/actions";
import { alternatives, formatStoryDate, storyAgeDays } from "@/lib/studio/generate";
import { duplicateWithGuard } from "@/lib/studio/guard";
import { APPROVED_STATUSES } from "@/lib/studio/workflow";
import { carouselText, contentText, draftJson, draftMarkdown, draftPlainText, segmentText, slideText } from "@/lib/studio/text";
import { AUDIENCES, DURATIONS, SLIDE_MAX, SLIDE_MIN, STATUSES, type Draft, type DraftContent, type DraftLang, type DraftStatus, type Kind, type ReelSegment, type Slide } from "@/lib/studio/types";

type T = Dict["studio"];

const STALE_DAYS = 14;
const KIND_TONE: Record<Kind, "positive" | "neutral" | "accent"> = { fact: "positive", explain: "neutral", cta: "accent" };

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers that block the async clipboard API.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const dirOf = (lang: DraftLang) => (lang === "ar" ? "rtl" : "ltr");

const STEP_ON: Record<(typeof STATUS_TONE)[DraftStatus], string> = {
  neutral: "border-ink-2 bg-elevated text-ink",
  warning: "border-warning bg-warning-tint text-warning",
  negative: "border-negative bg-negative-tint text-negative",
  accent: "border-accent bg-accent-tint text-accent",
  positive: "border-positive bg-positive-tint text-positive",
};

const stamp = (locale: Locale, iso: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(iso));

export function Editor({ initial, t, locale, categoryLabel, aiWriting, now, people }: { initial: Draft; t: T; locale: Locale; categoryLabel: string; aiWriting: boolean; now: number; people: Record<string, string> }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState<DraftStatus>(initial.status);
  const [dirty, setDirty] = useState(false);
  const langs = Object.keys(content) as DraftLang[];
  const [lang, setLang] = useState<DraftLang>(langs.includes(locale) ? locale : langs[0]);
  const toast = useToast();
  const setToast = toast.show;
  const { confirm, view: confirmView } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [busy, startBusy] = useTransition();
  const [copying, setCopying] = useState(false);
  const [settings, setSettings] = useState({ audience: initial.audience, language: initial.language, duration: initial.duration, slideCount: initial.slideCount });

  const c = content[lang] ?? content[langs[0]]!;
  const age = storyAgeDays(draft.story, now);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    // In-app links don't fire beforeunload, so ask before following one. Runs in the
    // capture phase, ahead of the router's own click handling.
    const guard = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || a.origin !== window.location.origin) return;
      if (!window.confirm(t.leaveConfirm)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty, t.leaveConfirm]);

  const edit = (patch: Partial<DraftContent>) => {
    setContent((prev) => ({ ...prev, [lang]: { ...prev[lang]!, ...patch } }));
    setDirty(true);
  };
  const editSegment = (i: number, patch: Partial<ReelSegment>) => edit({ segments: c.segments!.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const editSlide = (i: number, patch: Partial<Slide>) => edit({ slides: c.slides!.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const copy = async (text: string) => setToast((await copyText(text)) ? { text: t.copied, tone: "ok" } : { text: t.saveErrors.failed, tone: "error" });

  /** Saves the edits on screen. Resolves true when they were stored. */
  const persist = async () => {
    setError(null);
    const res = await saveDraft(draft.id, { content, baseUpdatedAt: draft.updatedAt });
    if ("error" in res) {
      setError(t.saveErrors[res.error as keyof T["saveErrors"]] ?? t.saveErrors.failed);
      setToast({ text: t.saveErrors.failed, tone: "error" });
      return false;
    }
    // Changed text on an approved draft comes back "in review"; show that instead of a plain "saved".
    const reopened = res.draft.status !== status;
    setDraft(res.draft);
    setStatus(res.draft.status);
    setDirty(false);
    setToast({ text: reopened ? t.backToReview.replace("{status}", t.statuses[res.draft.status]) : t.saved, tone: "ok" });
    router.refresh();
    return true;
  };

  const save = () => startSave(async () => void (await persist()));

  /** Status changes are saved at once. With unsaved edits, they are saved together after asking. */
  const changeStatus = async (next: DraftStatus) => {
    if (next === status || busy || saving) return;
    const label = t.statuses[next];
    if (next === "approved" && !(await confirm({ title: t.approveTitle, body: t.approveBody, confirm: t.approve, cancel: t.cancel }))) return;
    if (dirty && !(await confirm({ title: t.dirtyStatusTitle, body: t.dirtyStatusBody.replace("{status}", label), confirm: t.saveAndChange, cancel: t.cancel }))) return;
    startBusy(async () => {
      setError(null);
      const res = dirty ? await saveDraft(draft.id, { status: next, content, baseUpdatedAt: draft.updatedAt }) : await setDraftStatus(draft.id, next);
      if ("error" in res) return setToast({ text: t.saveErrors[res.error as keyof T["saveErrors"]] ?? t.saveErrors.failed, tone: "error" });
      setStatus(next);
      setDraft(res.draft);
      setDirty(false);
      setToast({ text: t.statusChanged.replace("{status}", label), tone: "ok" });
      router.refresh();
    });
  };

  // The copy is made from the saved draft, so unsaved edits are saved first, only after asking.
  // Not run in a transition: React holds back state updates made inside an async transition
  // until it ends, so the confirm dialog would never appear while the action waits for it.
  const duplicate = async () => {
    if (busy || saving || copying) return;
    setCopying(true);
    try {
      await duplicateWithGuard({
        dirty,
        ask: () => confirm({ title: t.dirtyDuplicateTitle, body: t.dirtyDuplicateBody, confirm: t.saveAndDuplicate, cancel: t.cancel }),
        save: persist,
        duplicate: async () => {
          const res = await duplicateDraft(draft.id);
          if ("error" in res) {
            setToast({ text: t.saveErrors[res.error as keyof T["saveErrors"]] ?? t.saveErrors.failed, tone: "error" });
            return false;
          }
          setToast({ text: t.duplicated, tone: "ok" });
          router.push(`/studio/${res.id}`);
          return true;
        },
      });
    } catch {
      // A rejected server call (network, session) must not leave the button loading or drop the edits.
      setToast({ text: t.saveErrors.failed, tone: "error" });
    } finally {
      setCopying(false);
    }
  };

  const regenerate = async (withSettings: boolean) => {
    if (!(await confirm({ title: t.regenerateTitle, body: t.regenerateConfirm, confirm: t.regenerate, cancel: t.cancel, danger: true }))) return;
    startBusy(async () => {
      const res = await regenerateDraft(draft.id, withSettings ? settings : undefined);
      if ("error" in res) return setToast({ text: t.saveErrors[res.error as keyof T["saveErrors"]] ?? t.saveErrors.failed, tone: "error" });
      setDraft(res.draft);
      setContent(res.draft.content);
      setStatus(res.draft.status);
      const next = Object.keys(res.draft.content) as DraftLang[];
      if (!next.includes(lang)) setLang(next[0]);
      setDirty(false);
      setToast({ text: t.regenerated, tone: "ok" });
    });
  };

  const remove = async () => {
    if (!(await confirm({ title: t.deleteTitle, body: t.deleteConfirm, confirm: t.delete, cancel: t.cancel, danger: true }))) return;
    startBusy(async () => {
      await deleteDraft(draft.id);
      setDirty(false);
      router.push("/library");
    });
  };

  // Exports what is on screen, including unsaved edits.
  const exportAs = (kind: "md" | "txt" | "json") => {
    const d = { ...draft, content, status };
    const name = `baha-draft-${draft.id}`;
    if (kind === "md") download(`${name}.md`, draftMarkdown(d), "text/markdown");
    // A byte-order mark helps older Windows editors open the Arabic text as UTF-8.
    else if (kind === "txt") download(`${name}.txt`, `\uFEFF${draftPlainText(d)}`, "text/plain");
    else download(`${name}.json`, draftJson(d), "application/json");
    setToast({ text: t.exported, tone: "ok" });
  };

  const cycle = (field: "title" | "hook" | "cta") => {
    const list = alternatives(draft.story, draft.audience, lang, field);
    const i = list.indexOf(c[field]);
    edit({ [field]: list[(i + 1) % list.length] });
  };

  const Back = locale === "ar" ? ChevronRight : ChevronLeft;

  return (
    <div className="flex flex-col gap-5 px-4 pb-16 pt-6 md:px-10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/library" className="flex items-center gap-1 t-small text-ink-2 hover:text-accent"><Back className="size-4" />{t.back}</Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={saving || copying || !dirty} icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}>{saving ? t.saving : t.save}</Button>
          <Button variant="secondary" onClick={() => copy(contentText(c, lang))} icon={<Copy className="size-4" />}>{t.copyAll}</Button>
          <Button variant="secondary" onClick={() => exportAs("md")} icon={<Download className="size-4" />}>{t.exportMd}</Button>
          <Button variant="secondary" onClick={() => exportAs("txt")} icon={<FileText className="size-4" />}>{t.exportTxt}</Button>
          <Button variant="secondary" onClick={() => exportAs("json")} icon={<Braces className="size-4" />}>{t.exportJson}</Button>
          <Button variant="ghost" onClick={duplicate} disabled={busy || copying} icon={copying ? <Loader2 className="size-4 animate-spin" /> : <CopyPlus className="size-4" />}>{t.duplicate}</Button>
          <Button variant="ghost" onClick={() => regenerate(false)} disabled={busy} icon={busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}>{t.regenerate}</Button>
          <Button variant="ghost" onClick={remove} disabled={busy} className="text-negative" icon={<Trash2 className="size-4" />}>{t.delete}</Button>
        </div>
      </div>

      {/* Workflow: one click per stage, saved straight away */}
      <section aria-label={t.workflow} className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 t-small font-semibold">{t.workflow}<StatusChip status={status} label={t.statuses[status]} /></h2>
          <p className="t-caption text-muted">{t.workflowNote}</p>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((st, i) => {
            const on = st === status;
            return (
              <li key={st}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={busy || saving}
                  onClick={() => changeStatus(st)}
                  className={cx("flex h-full w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-start transition-colors disabled:cursor-wait", on ? STEP_ON[STATUS_TONE[st]] : "border-line text-ink-2 hover:border-line-strong hover:bg-hover")}
                >
                  <span className="flex items-center gap-1.5 t-small font-semibold">
                    {on ? <Check className="size-3.5" /> : <span className="ltr t-caption text-muted">{i + 1}</span>}
                    {t.statuses[st]}
                  </span>
                  <span className="t-caption opacity-80">{t.statusHelp[st]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <p className={cx("t-caption", dirty ? "font-semibold text-warning" : "text-muted")} aria-live="polite">{dirty ? (APPROVED_STATUSES.includes(status) ? `${t.unsaved} · ${t.unsavedApproved}` : t.unsaved) : `${t.savedAt} · ${stamp(locale, draft.updatedAt)}`}</p>
      {error && <p role="alert" className="rounded-md bg-negative-tint p-3 t-small text-negative">{error}</p>}

      {/* Notices */}
      <div className="flex flex-col gap-2">
        <Notice icon={<Info className="size-4 text-warning" />}>{t.generatedBy} {!aiWriting && t.aiOff}</Notice>
        {draft.limited && <Notice icon={<TriangleAlert className="size-4 text-warning" />}>{t.limited}</Notice>}
        {age === null ? <Notice icon={<CalendarClock className="size-4 text-warning" />}>{t.noDateWarn}</Notice> : age > STALE_DAYS && <Notice icon={<CalendarClock className="size-4 text-warning" />}>{t.stale.replace("{days}", String(age))}</Notice>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Suggested content */}
        <section className="flex min-w-0 flex-col gap-4">
          {langs.length > 1 && (
            <div role="tablist" className="flex gap-1 self-start rounded-md border border-line bg-surface p-1">
              {langs.map((l) => (
                <button key={l} role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={cx("rounded px-4 py-1.5 t-small", lang === l ? "bg-accent-tint font-semibold text-accent" : "text-ink-2 hover:bg-hover")}>{t.langs[l]}</button>
              ))}
            </div>
          )}

          <div className="card flex flex-col gap-4 p-5 md:p-6">
            <Field label={t.fields.title} value={c.title} lang={lang} rows={1} onChange={(v) => edit({ title: v })} onCopy={() => copy(c.title)} onAlt={() => cycle("title")} t={t} />
            <Field label={t.fields.hook} value={c.hook} lang={lang} rows={2} onChange={(v) => edit({ hook: v })} onCopy={() => copy(c.hook)} onAlt={() => cycle("hook")} t={t} />
          </div>

          {c.segments && (
            <div className="card flex flex-col gap-4 p-5 md:p-6">
              <h2 className="t-h3 font-semibold">{t.fields.script} · <span className="ltr">{draft.duration}</span> {t.seconds_label}</h2>
              {c.segments.map((s, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ltr rounded bg-elevated px-2 py-0.5 t-caption font-semibold">0:{String(s.start).padStart(2, "0")}–0:{String(s.end).padStart(2, "0")}</span>
                    <span className="t-small font-semibold">{s.label}</span>
                    <Chip tone={KIND_TONE[s.kind]} className="ms-auto">{t.kinds[s.kind]}</Chip>
                    <CopyBtn onClick={() => copy(segmentText(s, lang))} t={t} />
                  </div>
                  <Field label={t.fields.voiceover} value={s.voiceover} lang={lang} rows={3} onChange={(v) => editSegment(i, { voiceover: v })} t={t} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t.fields.onScreen} value={s.onScreen} lang={lang} rows={1} onChange={(v) => editSegment(i, { onScreen: v })} t={t} />
                    <Field label={t.fields.shot} value={s.shot} lang={lang} rows={2} onChange={(v) => editSegment(i, { shot: v })} t={t} />
                  </div>
                  {s.note && <ReviewNote label={t.reviewNote} text={s.note} />}
                </div>
              ))}
            </div>
          )}

          {c.slides && (
            <div className="card flex flex-col gap-4 p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="t-h3 font-semibold">{t.formats.carousel} · <span className="ltr">{c.slides.length}</span> {t.slidesCount}</h2>
                <Button variant="secondary" size="sm" onClick={() => copy(carouselText(c, lang))} icon={<Copy className="size-3.5" />}>{t.copyCarousel}</Button>
              </div>
              {c.slides.map((s, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ltr grid size-7 place-items-center rounded-md bg-accent text-white t-caption font-semibold">{i + 1}</span>
                    <span className="t-small font-semibold">{i === 0 ? t.fields.cover : `${t.fields.slide} ${i + 1}`}</span>
                    <Chip tone={KIND_TONE[s.kind]} className="ms-auto">{t.kinds[s.kind]}</Chip>
                    <CopyBtn onClick={() => copy(slideText(s, i + 1, lang))} t={t} />
                    {c.slides!.length > SLIDE_MIN && (
                      <button type="button" aria-label={t.removeSlide} title={t.removeSlide} onClick={() => edit({ slides: c.slides!.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-negative"><X className="size-4" /></button>
                    )}
                  </div>
                  <Field label={t.fields.slideTitle} value={s.title} lang={lang} rows={1} onChange={(v) => editSlide(i, { title: v })} t={t} />
                  <Field label={t.fields.body} value={s.body} lang={lang} rows={3} onChange={(v) => editSlide(i, { body: v })} t={t} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t.fields.highlight} value={s.highlight} lang={lang} rows={1} onChange={(v) => editSlide(i, { highlight: v })} t={t} />
                    <Field label={t.fields.visual} value={s.visual} lang={lang} rows={2} onChange={(v) => editSlide(i, { visual: v })} t={t} />
                  </div>
                  {s.note && <ReviewNote label={t.reviewNote} text={s.note} />}
                </div>
              ))}
              {c.slides.length < SLIDE_MAX && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const slides = [...c.slides!];
                    slides.splice(slides.length - 1, 0, { title: "", body: "", visual: "", highlight: "", kind: "explain" });
                    edit({ slides });
                  }}
                  icon={<Plus className="size-4" />}
                  className="self-start"
                >
                  {t.addSlide}
                </Button>
              )}
            </div>
          )}

          <div className="card flex flex-col gap-4 p-5 md:p-6">
            <Field label={t.fields.caption} value={c.caption} lang={lang} rows={8} onChange={(v) => edit({ caption: v })} onCopy={() => copy(c.caption)} t={t} />
            <Field label={t.fields.cta} value={c.cta} lang={lang} rows={1} onChange={(v) => edit({ cta: v })} onCopy={() => copy(c.cta)} onAlt={() => cycle("cta")} t={t} />
            <Field label={t.fields.hashtags} value={c.hashtags} lang={lang} rows={2} onChange={(v) => edit({ hashtags: v })} onCopy={() => copy(c.hashtags)} t={t} />
          </div>
        </section>

        {/* Original story, kept visually separate */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-1">
          <div className="card flex flex-col gap-3 p-5">
            <h2 className="t-h3 font-semibold">{t.details}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 t-caption">
              <dt className="text-muted">{t.format}</dt>
              <dd>{t.formats[draft.format]}{draft.format === "reel" ? ` · ${draft.duration} ${t.seconds_label}` : ""}</dd>
              <dt className="text-muted">{t.language}</dt>
              <dd>{t.langs[draft.language]}</dd>
              <dt className="text-muted">{t.audience}</dt>
              <dd>{t.audiences[draft.audience]}</dd>
              <dt className="text-muted">{t.status}</dt>
              <dd><StatusChip status={status} label={t.statuses[status]} /></dd>
              <dt className="text-muted">{t.created}</dt>
              <dd>{stamp(locale, draft.createdAt)}</dd>
              <dt className="text-muted">{t.updated}</dt>
              <dd>{stamp(locale, draft.updatedAt)}</dd>
            </dl>
            {draft.duplicatedFrom && <Chip className="self-start">{t.copyBadge}</Chip>}
          </div>

          <div className="card flex flex-col gap-3 border-positive/30 bg-positive-tint/40 p-5">
            <div>
              <h2 className="flex items-center gap-1.5 t-h3 font-semibold text-positive"><BadgeCheck className="size-4" />{t.sourcePanel}</h2>
              <p className="t-caption text-ink-2">{t.sourcePanelSub}</p>
            </div>
            {draft.story.titleAr && locale === "ar" && <p className="t-small font-semibold"><Bidi>{draft.story.titleAr}</Bidi></p>}
            <p className="t-small font-semibold content-en" lang="en">{draft.story.title}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 t-caption">
              <dt className="text-muted">{t.basedOn}</dt>
              <dd className="content-en" style={{ textAlign: "start" }}>{draft.story.publisher}</dd>
              <dt className="text-muted">{t.published}</dt>
              <dd>{draft.story.publishedAt ? formatStoryDate(draft.story.publishedAt, locale) : t.noDate}</dd>
              <dt className="text-muted">{categoryLabel}</dt>
              <dd>{CATEGORY_LABEL[draft.story.category][locale]}</dd>
            </dl>
            <a href={draft.story.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 t-small font-medium text-accent hover:underline">{t.openSource}<ExternalLink className="size-3.5" /></a>
            {draft.story.summary && <p className="t-caption text-ink-2 content-en" lang="en">{draft.story.summary}</p>}
            <div className="flex flex-col gap-2 border-t border-positive/20 pt-3">
              <span className="flex items-center gap-1.5 t-caption font-semibold"><Quote className="size-3.5" />{t.factsQuoted}</span>
              {draft.story.facts.length ? (
                draft.story.facts.map((f) => <p key={f} className="rounded border-s-2 border-positive bg-surface px-2 py-1.5 t-caption content-en" lang="en">{f}</p>)
              ) : (
                <p className="t-caption text-ink-2">{t.noFacts}</p>
              )}
            </div>
          </div>

          <div className="card flex flex-col gap-3 p-5">
            <h2 className="t-h3 font-semibold">{t.settings}</h2>
            <label className="flex flex-col gap-1 t-small">
              <span className="text-muted">{t.audience}</span>
              <select value={settings.audience} onChange={(e) => setSettings({ ...settings, audience: e.target.value as Draft["audience"] })} className="h-10 rounded-md border border-line bg-surface px-2">
                {AUDIENCES.map((a) => <option key={a} value={a}>{t.audiences[a]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 t-small">
              <span className="text-muted">{t.language}</span>
              <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value as Draft["language"] })} className="h-10 rounded-md border border-line bg-surface px-2">
                {(["ar", "en", "both"] as const).map((l) => <option key={l} value={l}>{t.langs[l]}</option>)}
              </select>
            </label>
            {draft.format === "reel" ? (
              <label className="flex flex-col gap-1 t-small">
                <span className="text-muted">{t.duration}</span>
                <select value={settings.duration} onChange={(e) => setSettings({ ...settings, duration: Number(e.target.value) as Draft["duration"] })} className="h-10 rounded-md border border-line bg-surface px-2">
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} {t.seconds_label}</option>)}
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-1 t-small">
                <span className="text-muted">{t.slides}</span>
                <input type="number" min={SLIDE_MIN} max={SLIDE_MAX} value={settings.slideCount} onChange={(e) => setSettings({ ...settings, slideCount: Math.min(SLIDE_MAX, Math.max(SLIDE_MIN, Number(e.target.value) || 7)) })} className="ltr h-10 rounded-md border border-line bg-surface px-2" />
              </label>
            )}
            <Button variant="secondary" onClick={() => regenerate(true)} disabled={busy} icon={<RefreshCw className="size-4" />}>{t.applySettings}</Button>
          </div>

          <div className="card flex flex-col gap-3 p-5">
            <h2 className="flex items-center gap-1.5 t-h3 font-semibold"><History className="size-4 text-muted" />{t.history}</h2>
            {!draft.history.length ? (
              <p className="t-caption text-ink-2">{t.historyEmpty}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {[...draft.history].reverse().slice(0, 10).map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex flex-col border-s-2 border-line ps-3 t-caption">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium text-ink">{t.historyActions[h.action]}{h.action === "status" && h.status && <StatusChip status={h.status} label={t.statuses[h.status]} />}</span>
                    <span className="text-muted">{people[h.by] ?? h.by} · {stamp(locale, h.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {toast.view}
      {confirmView}
    </div>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <p className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2 t-caption text-ink-2"><span className="mt-0.5 shrink-0">{icon}</span><span>{children}</span></p>;
}

function ReviewNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-warning/50 bg-warning-tint/60 p-3 t-caption">
      <span className="font-semibold text-warning">{label}: </span>
      <span className="text-ink-2" style={{ unicodeBidi: "plaintext" }}>{text}</span>
    </div>
  );
}

function CopyBtn({ onClick, t }: { onClick: () => void; t: T }) {
  return (
    <button type="button" onClick={onClick} aria-label={t.copy} title={t.copy} className="grid size-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-accent">
      <Copy className="size-4" />
    </button>
  );
}

/** A text field in the content's own direction. unicode-bidi: plaintext keeps English terms and numbers readable inside Arabic lines. */
function Field({ label, value, lang, rows, onChange, onCopy, onAlt, t }: { label: string; value: string; lang: DraftLang; rows: number; onChange: (v: string) => void; onCopy?: () => void; onAlt?: () => void; t: T }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 t-caption font-semibold text-ink-2">
        {label}
        <span className="ms-auto flex items-center gap-1">
          {onAlt && (
            <button type="button" onClick={(e) => { e.preventDefault(); onAlt(); }} title={t.altNote} className="flex items-center gap-1 rounded px-2 py-1 font-medium text-accent hover:bg-accent-tint">
              <Shuffle className="size-3.5" />{t.alt}
            </button>
          )}
          {onCopy && (
            <button type="button" onClick={(e) => { e.preventDefault(); onCopy(); }} aria-label={`${t.copy}: ${label}`} title={t.copy} className="grid size-7 place-items-center rounded text-muted hover:bg-hover hover:text-accent">
              <Copy className="size-3.5" />
            </button>
          )}
        </span>
      </span>
      <textarea
        value={value}
        rows={rows}
        dir={dirOf(lang)}
        lang={lang}
        onChange={(e) => onChange(e.target.value)}
        className={cx("w-full resize-y rounded-md border border-line bg-surface px-3 py-2 t-body outline-none [field-sizing:content] focus:border-accent", lang === "ar" ? "font-[family-name:var(--font-ar)]" : "font-[family-name:var(--font-en)]")}
        style={{ unicodeBidi: "plaintext", minHeight: rows === 1 ? 42 : undefined }}
      />
    </label>
  );
}
