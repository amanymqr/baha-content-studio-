"use client";

import { useActionState, useState } from "react";
import { Clapperboard, Info, Layers, Loader2, Sparkles } from "lucide-react";
import { Button, cx } from "@/components/ui";
import type { Dict } from "@/lib/i18n";
import { createDraft } from "@/lib/studio/actions";
import { AUDIENCES, DURATIONS, SLIDE_MAX, SLIDE_MIN, type DraftFormat, type DraftLanguage, type StudioAudience } from "@/lib/studio/types";

type T = Dict["studio"];

/** Segmented radio group. Defined outside the form so re-renders keep the user's choice. */
function Seg<V extends string | number>({ name, value, options, onChange }: { name: string; value: V; options: { v: V; label: React.ReactNode }[]; onChange?: (v: V) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
      {options.map((o) => (
        <label key={String(o.v)} className={cx("flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded px-3 py-2 t-small transition-colors has-[:checked]:bg-surface has-[:checked]:font-semibold has-[:checked]:text-accent has-[:checked]:shadow-sm", "text-ink-2 hover:text-ink")}>
          <input type="radio" name={name} value={o.v} defaultChecked={o.v === value} onChange={() => onChange?.(o.v)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function NewDraftForm({ t, storyId, defaults, angle }: { t: T; storyId: string | null; defaults: { audience: StudioAudience; language: DraftLanguage; format: DraftFormat }; angle: { id: string; title: string } | null }) {
  const [state, action, pending] = useActionState(createDraft, null);
  const [format, setFormat] = useState<DraftFormat>(defaults.format);
  const [slides, setSlides] = useState(7);

  return (
    <form action={action} className="card flex flex-col gap-5 p-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
      <input type="hidden" name="story" value={storyId ?? ""} />
      {angle && <input type="hidden" name="angle" value={angle.id} />}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 t-small font-semibold">{t.format}</legend>
        <Seg name="format" value={format} onChange={setFormat} options={[{ v: "reel" as DraftFormat, label: <><Clapperboard className="size-4" />{t.formats.reel}</> }, { v: "carousel" as DraftFormat, label: <><Layers className="size-4" />{t.formats.carousel}</> }]} />
      </fieldset>

      {format === "reel" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 t-small font-semibold">{t.duration}</legend>
          <Seg name="duration" value={45} options={DURATIONS.map((d) => ({ v: d, label: <span className="ltr">{d} {t.seconds}</span> }))} />
        </fieldset>
      ) : (
        <label className="flex flex-col gap-2">
          <span className="t-small font-semibold">{t.slides}</span>
          <div className="flex items-center gap-3">
            <input type="range" name="slideCount" min={SLIDE_MIN} max={SLIDE_MAX} value={slides} onChange={(e) => setSlides(Number(e.target.value))} className="flex-1 accent-accent" />
            <span className="ltr w-8 text-center t-h3 font-semibold">{slides}</span>
          </div>
        </label>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 t-small font-semibold">{t.audience}</legend>
        {AUDIENCES.map((a) => (
          <label key={a} className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2.5 t-small hover:bg-hover has-[:checked]:border-accent has-[:checked]:bg-accent-tint">
            <input type="radio" name="audience" value={a} defaultChecked={a === defaults.audience} className="accent-accent" />
            {t.audiences[a]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 t-small font-semibold">{t.language}</legend>
        <Seg name="language" value={defaults.language} options={(["ar", "en", "both"] as DraftLanguage[]).map((v) => ({ v, label: t.langs[v] }))} />
        <p className="t-caption text-muted">{t.languageNote}</p>
      </fieldset>

      {angle && (
        <div className="rounded-md bg-accent-tint p-3 t-small">
          <span className="text-muted">{t.angle}: </span>
          <span className="font-medium">{angle.title}</span>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-md bg-warning-tint p-3 t-caption text-ink-2"><Info className="mt-0.5 size-4 shrink-0 text-warning" />{t.templateNote}</p>

      {/* Stays visible at the bottom of the panel while its settings scroll on shorter screens. */}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col gap-3 border-t border-line bg-surface px-6 py-4">
        {state?.error && <p role="alert" className="t-small text-negative">{t.createErrors[state.error as keyof T["createErrors"]] ?? t.createErrors.invalid}</p>}
        <Button disabled={!storyId || pending} className="h-12" icon={pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}>
          {pending ? t.creating : storyId ? t.create : t.chooseStory}
        </Button>
      </div>
    </form>
  );
}
