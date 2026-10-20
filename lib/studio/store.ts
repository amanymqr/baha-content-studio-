import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Draft } from "./types";

// Drafts live in data/drafts.json, the same local JSON approach as the account
// settings and the news store, and move to Supabase with the rest of the data.
// Writes are queued so two saves in a row can't overwrite each other.

const STORE_PATH = path.join(process.cwd(), "data", "drafts.json");
type Store = { drafts: Record<string, Draft> };

async function read(): Promise<Store> {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
    return { drafts: parsed.drafts ?? {} };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { drafts: {} };
    throw new Error("Could not read data/drafts.json");
  }
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

export async function listDrafts() {
  return Object.values((await read()).drafts).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDraft(id: string) {
  return (await read()).drafts[id] ?? null;
}

export const putDraft = (d: Draft) => update((s) => void (s.drafts[d.id] = d));

export const patchDraft = (id: string, fn: (d: Draft) => Draft) =>
  update((s) => {
    const d = s.drafts[id];
    if (!d) return null;
    s.drafts[id] = fn(d);
    return s.drafts[id];
  });

export const removeDraft = (id: string) => update((s) => (s.drafts[id] ? (delete s.drafts[id], true) : false));
