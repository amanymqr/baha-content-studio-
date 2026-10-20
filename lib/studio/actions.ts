"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../session";
import { SOURCES } from "../news/sources";
import { readNews } from "../news/store";
import { generateAll, snapshotOf } from "./generate";
import { getDraft, patchDraft, putDraft, removeDraft } from "./store";
import { AUDIENCES, DURATIONS, SLIDE_MAX, SLIDE_MIN, STATUSES, type Draft, type DraftOptions } from "./types";

const Options = z.object({
  format: z.enum(["reel", "carousel"]),
  audience: z.enum(AUDIENCES as [string, ...string[]]),
  language: z.enum(["ar", "en", "both"]),
  duration: z.coerce.number().refine((n) => (DURATIONS as number[]).includes(n)).default(45),
  slideCount: z.coerce.number().int().min(SLIDE_MIN).max(SLIDE_MAX).default(7),
  angleId: z.string().max(64).optional(),
});

const text = (max: number) => z.string().max(max);
const Kind = z.enum(["fact", "explain", "cta"]);
const Content = z.object({
  title: text(300),
  hook: text(600),
  caption: text(4000),
  cta: text(600),
  hashtags: text(1000),
  segments: z.array(z.object({ start: z.number(), end: z.number(), label: text(120), voiceover: text(2000), onScreen: text(300), shot: text(600), kind: Kind, note: text(1200).optional() })).max(12).optional(),
  slides: z.array(z.object({ title: text(300), body: text(1500), visual: text(600), highlight: text(200), kind: Kind, note: text(1200).optional() })).max(SLIDE_MAX + 5).optional(),
});
const Save = z.object({ status: z.enum(STATUSES as [string, ...string[]]), content: z.object({ ar: Content.optional(), en: Content.optional() }) });

/** Creates a draft from a story that exists in the news store. Fails rather than inventing anything. */
export async function createDraft(_prev: unknown, form: FormData): Promise<{ error: string } | never> {
  const user = await requireUser();
  const storyId = String(form.get("story") ?? "");
  const parsed = Options.safeParse({
    format: form.get("format"),
    audience: form.get("audience"),
    language: form.get("language"),
    duration: form.get("duration") ?? undefined,
    slideCount: form.get("slideCount") ?? undefined,
    angleId: form.get("angle") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };
  const news = await readNews();
  const item = news.items[storyId];
  if (!item) return { error: "story_missing" };
  const source = SOURCES.find((s) => s.id === item.sourceId)!;
  const story = snapshotOf(item, source.name, news.translations[item.id]);
  const opts = parsed.data as DraftOptions;
  const now = new Date().toISOString();
  const draft: Draft = {
    ...opts,
    id: randomUUID().slice(0, 12),
    status: "draft",
    story,
    content: generateAll(story, opts, 0),
    variant: 0,
    generatedBy: "template",
    limited: story.facts.length === 0,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
  await putDraft(draft);
  revalidatePath("/studio");
  redirect(`/studio/${draft.id}`);
}

export async function saveDraft(id: string, data: unknown): Promise<{ ok: true; updatedAt: string } | { error: string }> {
  await requireUser();
  const parsed = Save.safeParse(data);
  if (!parsed.success) return { error: "invalid" };
  const saved = await patchDraft(id, (d) => ({ ...d, status: parsed.data.status as Draft["status"], content: parsed.data.content, updatedAt: new Date().toISOString() }));
  if (!saved) return { error: "not_found" };
  revalidatePath("/studio");
  return { ok: true, updatedAt: saved.updatedAt };
}

/** Rebuilds the content from the stored story with the next template variant, optionally with new settings. Overwrites edits. */
export async function regenerateDraft(id: string, settings?: unknown): Promise<{ ok: true; draft: Draft } | { error: string }> {
  await requireUser();
  const current = await getDraft(id);
  if (!current) return { error: "not_found" };
  const merged = Options.safeParse({ ...current, ...(settings && typeof settings === "object" ? settings : {}) });
  if (!merged.success) return { error: "invalid" };
  const opts = merged.data as DraftOptions;
  const saved = await patchDraft(id, (d) => ({ ...d, ...opts, content: generateAll(d.story, opts, d.variant + 1), variant: d.variant + 1, status: "draft", updatedAt: new Date().toISOString() }));
  if (!saved) return { error: "not_found" };
  revalidatePath("/studio");
  return { ok: true, draft: saved };
}

export async function deleteDraft(id: string): Promise<{ ok: boolean }> {
  await requireUser();
  const ok = await removeDraft(id);
  revalidatePath("/studio");
  return { ok };
}
