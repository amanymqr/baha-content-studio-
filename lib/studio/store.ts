import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { normalizeDraft } from "./normalize";
import type { Draft } from "./types";

// Drafts live in data/drafts.json, the same local JSON approach as the account
// settings and the news store, and move to Supabase with the rest of the data.
// Writes are queued so two saves in a row can't overwrite each other.
// Records are read through normalizeDraft, so drafts from older versions open
// normally. A record that can't be read is left in the file untouched and only
// counted, and if the file itself can't be parsed nothing is written to it.

const STORE_PATH = path.join(process.cwd(), "data", "drafts.json");
type Store = { drafts: Record<string, unknown> };

async function read(): Promise<Store> {
  let raw: string;
  try {
    raw = await fs.readFile(STORE_PATH, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { drafts: {} };
    throw new Error("Could not read data/drafts.json");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("data/drafts.json is not valid JSON; it was left unchanged");
  }
  const drafts = (parsed as { drafts?: unknown })?.drafts;
  return { drafts: drafts && typeof drafts === "object" && !Array.isArray(drafts) ? (drafts as Record<string, unknown>) : {} };
}

let queue: Promise<unknown> = Promise.resolve();

function update<T>(fn: (s: Store) => T): Promise<T> {
  const run = queue.then(async () => {
    const store = await read();
    const result = fn(store);
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2));
    await fs.rename(tmp, STORE_PATH);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
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

export const patchDraft = (id: string, fn: (d: Draft) => Draft) =>
  update((s) => {
    const d = normalizeDraft(s.drafts[id], id);
    if (!d) return null;
    const next = fn(d);
    s.drafts[id] = next;
    return next;
  });

export const removeDraft = (id: string) => update((s) => (s.drafts[id] ? (delete s.drafts[id], true) : false));
