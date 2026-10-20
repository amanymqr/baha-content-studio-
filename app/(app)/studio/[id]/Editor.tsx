"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BadgeCheck, CalendarClock, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FileText, Info, Loader2, Plus, Quote, RefreshCw, Save, Shuffle, Trash2, TriangleAlert, X } from "lucide-react";
import { Bidi, Button, Chip, cx } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/analysis/rules";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/db";
import { deleteDraft, regenerateDraft, saveDraft } from "@/lib/studio/actions";
import { alternatives, formatStoryDate, storyAgeDays } from "@/lib/studio/generate";
import { carouselText, contentText, draftMarkdown, draftPlainText, segmentText, slideText } from "@/lib/studio/text";
import { AUDIENCES, DURATIONS, SLIDE_MAX, SLIDE_MIN, STATUSES, type Draft, type DraftContent, type DraftLang, type DraftStatus, type Kind, type ReelSegment, type Slide } from "@/lib/studio/types";

type T = Dict["studio"];
type Toast = { text: string; tone: "ok" | "error" } | null;

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

export function Editor({ initial, t, locale, categoryLabel, aiWriting, now }: { initial: Draft; t: T; locale: Locale; categoryLabel: string; aiWriting: boolean; now: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState<DraftStatus>(initial.status);
  const [dirty, setDirty] = useState(false);
  const langs = Object.keys(content) as DraftLang[];
  const [lang, setLang] = useState<DraftLang>(langs.includes(locale) ? locale : langs[0]);
  const [toast, setToast] = useState<Toast>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [busy, startBusy] = useTransition();
  const [settings, setSettings] = useState({ audience: initial.audience, language: initial.language, duration: initial.duration, slideCount: initial.slideCount });

  const c = content[lang] ?? content[langs[0]]!;
  const age = storyAgeDays(draft.story, now);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (patch: Partial<DraftContent>) => {
    setContent((prev) => ({ ...prev, [lang]: { ...prev[lang]!, ...patch } }));
    setDirty(true);
  };
  const editSegment = (i: number, patch: Partial<ReelSegment>) => edit({ segments: c.segments!.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const editSlide = (i: number, patch: Partial<Slide>) => edit({ slides: c.slides!.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const copy = async (text: string) => setToast((await copyText(text)) ? { text: t.copied, tone: "ok" } : { text: t.saveErrors.failed, tone: "error" });

  const save = () =>
    startSave(async () => {
      setError(null);
      const res = await saveDraft(draft.id, { status, content });
      if ("error" in res) {
        setError(t.saveErrors[res.error as keyof T["saveErrors"]] ?? t.saveErrors.failed);
        setToast({ text: t.saveErrors.failed, tone: "error" });
        return;
      }
      setDraft((d) => ({ ...d, status, content, updatedAt: res.updatedAt }));
      setDirty(false);
      setToast({ text: t.saved, tone: "ok" });
    });

  const regenerate = (withSettings: boolean) => {
    if (!window.confirm(t.regenerateConfirm)) return;
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

  const remove = () => {
    if (!window.confirm(t.deleteConfirm)) return;
    startBusy(async () => {
      await deleteDraft(draft.id);
      router.push("/studio");
    });
  };

  const exportAs = (kind: "md" | "txt") => {
    const d = { ...draft, content, status };
    const label = t.statuses[status];
    if (kind === "md") download(`baha-draft-${draft.id}.md`, draftMarkdown(d, label), "text/markdown");
    else download(`baha-draft-${draft.id}.txt`, draftPlainText(d, label), "text/plain");
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
        <Link href="/studio" className="flex items-center gap-1 t-small text-ink-2 hover:text-accent"><Back className="size-4" />{t.back}</Link>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 t-small">
            <span className="text-muted">{t.status}:</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value as DraftStatus); setDirty(true); }} className="bg-transparent font-semibold outline-none">
              {STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
            </select>
          </label>
          <Button onClick={save} disabled={saving || !dirty} icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}>{saving ? t.saving : t.save}</Button>
          <Button variant="secondary" onClick={() => copy(contentText(c, lang))} icon={<Copy className="size-4" />}>{t.copyAll}</Button>
          <Button variant="secondary" onClick={() => exportAs("md")} icon={<Download className="size-4" />}>{t.exportMd}</Button>
          <Button variant="secondary" onClick={() => exportAs("txt")} icon={<FileText className="size-4" />}>{t.exportTxt}</Button>
          <Button variant="ghost" onClick={() => regenerate(false)} disabled={busy} icon={busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}>{t.regenerate}</Button>
          <Button variant="ghost" onClick={remove} disabled={busy} className="text-negative" icon={<Trash2 className="size-4" />}>{t.delete}</Button>
        </div>
      </div>
      <p className={cx("t-caption", dirty ? "text-warning" : "text-muted")} aria-live="polite">{dirty ? t.unsaved : `${t.savedAt} · ${new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt))}`}</p>
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
        </aside>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className={cx("fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 t-small font-medium text-white shadow-lg rtl:translate-x-1/2", toast.tone === "ok" ? "bg-ink" : "bg-negative")}>
          {toast.text}
        </div>
      )}
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
