"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../session";
import { SOURCES } from "../news/sources";
import { readNews } from "../news/store";
import { generateAll, snapshotOf } from "./generate";
import { withHistory } from "./normalize";
import { getDraft, patchDraft, putDraft, removeDraft } from "./store";
import { applySave } from "./workflow";
import { AUDIENCES, DURATIONS, SLIDE_MAX, SLIDE_MIN, STATUSES, type Draft, type DraftOptions, type DraftStatus } from "./types";

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
const Status = z.enum(STATUSES as [DraftStatus, ...DraftStatus[]]);
const Save = z.object({ status: Status.optional(), content: z.object({ ar: Content.optional(), en: Content.optional() }) });

/** Drafts feed the dashboard, the library and the sidebar counts, so every change refreshes all of them. */
const refresh = () => revalidatePath("/", "layout");

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
    history: [{ at: now, by: user.id, action: "created", status: "draft" }],
  };
  await putDraft(draft);
  refresh();
  redirect(`/studio/${draft.id}`);
}

/** Saves edited content. A status sent along is applied too, but only when the user picked it. Changed text on an approved draft sends it back to review (see applySave). */
export async function saveDraft(id: string, data: unknown): Promise<{ ok: true; updatedAt: string; draft: Draft } | { error: string }> {
  const user = await requireUser();
  const parsed = Save.safeParse(data);
  if (!parsed.success) return { error: "invalid" };
  const { status, content } = parsed.data;
  if (!content.ar && !content.en) return { error: "invalid" };
  const at = new Date().toISOString();
  const saved = await patchDraft(id, (d) => applySave(d, { status, content }, user.id, at));
  if (!saved) return { error: "not_found" };
  refresh();
  return { ok: true, updatedAt: saved.updatedAt, draft: saved };
}

/** Moves a draft to another workflow status. Only ever called from an explicit user choice; nothing is published. */
export async function setDraftStatus(id: string, status: unknown): Promise<{ ok: true; draft: Draft } | { error: string }> {
  const user = await requireUser();
  const parsed = Status.safeParse(status);
  if (!parsed.success) return { error: "invalid" };
  const at = new Date().toISOString();
  const saved = await patchDraft(id, (d) => (d.status === parsed.data ? d : { ...d, status: parsed.data, history: withHistory(d, { at, by: user.id, action: "status", status: parsed.data }), updatedAt: at }));
  if (!saved) return { error: "not_found" };
  refresh();
  return { ok: true, draft: saved };
}

/** Makes an independent copy with the same content and source. The copy starts as a draft with its own history. */
export async function duplicateDraft(id: string): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await requireUser();
  const current = await getDraft(id);
  if (!current) return { error: "not_found" };
  const at = new Date().toISOString();
  const copy: Draft = {
    ...structuredClone(current),
    id: randomUUID().slice(0, 12),
    status: "draft",
    createdBy: user.id,
    createdAt: at,
    updatedAt: at,
    duplicatedFrom: current.id,
    history: [{ at, by: user.id, action: "duplicated", status: "draft" }],
  };
  await putDraft(copy);
  refresh();
  return { ok: true, id: copy.id };
}

/** Rebuilds the content from the stored story with the next template variant, optionally with new settings. Overwrites edits. */
export async function regenerateDraft(id: string, settings?: unknown): Promise<{ ok: true; draft: Draft } | { error: string }> {
  const user = await requireUser();
  const current = await getDraft(id);
  if (!current) return { error: "not_found" };
  const merged = Options.safeParse({ ...current, ...(settings && typeof settings === "object" ? settings : {}) });
  if (!merged.success) return { error: "invalid" };
  const opts = merged.data as DraftOptions;
  const at = new Date().toISOString();
  const saved = await patchDraft(id, (d) => ({ ...d, ...opts, content: generateAll(d.story, opts, d.variant + 1), variant: d.variant + 1, status: "draft", history: withHistory(d, { at, by: user.id, action: "regenerated", status: "draft" }), updatedAt: at }));
  if (!saved) return { error: "not_found" };
  refresh();
  return { ok: true, draft: saved };
}

export async function deleteDraft(id: string): Promise<{ ok: boolean }> {
  await requireUser();
  const ok = await removeDraft(id);
  refresh();
  return { ok };
}
