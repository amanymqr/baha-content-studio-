"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../session";
import { readNews, refreshNews, saveTranslation, toggleSelection } from "./store";
import { getAi } from "../ai";
import { AiError } from "../ai/types";

export async function refreshNow() {
  await requireUser();
  await refreshNews();
  revalidatePath("/news");
}

export async function translateNews(id: string): Promise<{ error?: string }> {
  await requireUser();
  const store = await readNews();
  const item = store.items[id];
  if (!item) return { error: "not_found" };
  const ai = await getAi();
  if (!ai) return { error: "missing_key" };
  try {
    await saveTranslation(id, await ai.translate(item));
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "unknown" };
  }
  revalidatePath("/news");
  return {};
}

export async function toggleNewsSelection(id: string) {
  const user = await requireUser();
  await toggleSelection(user.id, id);
  revalidatePath("/news");
}
