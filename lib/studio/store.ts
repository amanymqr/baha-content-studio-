import "server-only";
import { DataFileError, dataFile, readJson, updateJson } from "../storage/json-file";
import { normalizeDraft } from "./normalize";
import type { Draft } from "./types";

// Drafts live in data/drafts.json and are written through the safe JSON layer
// (lib/storage/json-file.ts), like the news and account files: every change is
// applied to the newest copy under a lock shared with other processes, writes are
// atomic, the file is copied to data/backups once a day before the first change,
// and a file that can't be parsed is never written over.
// Records are read through normalizeDraft, so drafts from older versions open
// normally. A record that can't be read is left in the file untouched and only counted.

type Store = { drafts: Record<string, unknown> };
const file = () => dataFile("drafts.json");
const empty = (): Store => ({ drafts: {} });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Thrown when a save was based on an older copy of the draft than the one stored. Nothing is written. */
export class DraftConflictError extends Error {
  constructor(readonly current: Draft) {
    super("The draft was changed elsewhere since it was opened");
  }
}

async function read(): Promise<Store> {
  const raw = await readJson<unknown>(file(), empty);
  // A file whose "drafts" isn't an object reads as empty for display; writes refuse it below.
  return { drafts: isRecord(raw) && isRecord(raw.drafts) ? raw.drafts : {} };
}

function update<T>(fn: (s: Store) => T): Promise<T> {
  return updateJson<unknown, T>(file(), empty, (raw) => {
    if (!isRecord(raw) || !isRecord(raw.drafts)) throw new DataFileError("drafts.json does not have the expected shape; it was left unchanged");
    return fn(raw as Store);
  });
}

/** Every readable draft, most recently edited first, plus how many records could not be read. */
export async function readDrafts() {
  const entries = Object.entries((await read()).drafts);
  const drafts = entries.map(([k, v]) => normalizeDraft(v, k)).filter((d): d is Draft => !!d);
  return { drafts: drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), unreadable: entries.length - drafts.length };
}

export async function listDrafts() {
  return (await readDrafts()).drafts;
}

export async function getDraft(id: string) {
  return normalizeDraft((await read()).drafts[id], id);
}

export const putDraft = (d: Draft) => update((s) => void (s.drafts[d.id] = d));

/**
 * Applies a change to the stored draft. With expectedUpdatedAt, the change is
 * refused (DraftConflictError, nothing written) when the stored draft has been
 * saved since that time, so one person's save can't silently replace another's.
 */
export const patchDraft = (id: string, fn: (d: Draft) => Draft, opts: { expectedUpdatedAt?: string } = {}) =>
  update((s) => {
    const d = normalizeDraft(s.drafts[id], id);
    if (!d) return null;
    if (opts.expectedUpdatedAt && d.updatedAt !== opts.expectedUpdatedAt) throw new DraftConflictError(d);
    const next = fn(d);
    s.drafts[id] = next;
    return next;
  });

export const removeDraft = (id: string) => update((s) => (s.drafts[id] ? (delete s.drafts[id], true) : false));
