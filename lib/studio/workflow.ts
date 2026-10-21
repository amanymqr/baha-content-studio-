import { withHistory } from "./normalize";
import type { Draft, DraftStatus } from "./types";

// Review rules applied when a draft is saved. An approval (and "ready to export",
// which comes after it) covers the text that was reviewed. When that text changes
// on a plain save, the draft goes back to "in review" so it can't stay approved
// with text nobody approved. A status the user picks together with the save is an
// explicit decision about the current text and is applied as chosen.

/** Statuses that mean the current text was approved. */
export const APPROVED_STATUSES: readonly DraftStatus[] = ["approved", "ready"];

/** Compares values with object keys in any order, so only real text changes count. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export const contentChanged = (before: Draft["content"], after: Draft["content"]) => !same(before, after);

/** The draft after saving new content, with the status and history the review rules give it. */
export function applySave(d: Draft, save: { status?: DraftStatus; content: Draft["content"] }, by: string, at: string): Draft {
  const changed = contentChanged(d.content, save.content);
  const status = save.status ?? (changed && APPROVED_STATUSES.includes(d.status) ? "review" : d.status);
  let history = withHistory(d, { at, by, action: "edited" });
  if (status !== d.status) history = withHistory({ ...d, history }, { at, by, action: "status", status });
  return { ...d, status, content: save.content, history, updatedAt: at };
}
