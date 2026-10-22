import "server-only";
import { dataFile, readJson, updateJson } from "./json-file";
import type { NewsStore } from "../news/types";

// One place that knows where each kind of data lives. Today every repository is
// a JSON file in data/ with the same format as before; a database can replace
// these functions later without the pages changing. Reads never write.

type Repo<T> = {
  /** Path of the backing file, for messages and tests. */
  file: () => string;
  read: () => Promise<T>;
  update: <R>(change: (value: T) => R | Promise<R>) => Promise<R>;
};

function jsonRepo<T extends object>(name: string, empty: () => T, opts: { backup?: boolean } = {}): Repo<T> {
  const file = () => dataFile(name);
  // Fills keys a file written by an older version may lack, in place, without touching the rest.
  const complete = (v: T) => {
    for (const [k, d] of Object.entries(empty())) if ((v as Record<string, unknown>)[k] === undefined) (v as Record<string, unknown>)[k] = d;
    return v;
  };
  return {
    file,
    read: async () => complete(await readJson(file(), empty)),
    update: (change) => updateJson(file(), empty, (v) => change(complete(v)), opts),
  };
}

export const emptyNews = (): NewsStore => ({ items: {}, sources: {}, lastRefresh: null, translations: {}, selections: {} });

/** data/news.json: stories, source status, Arabic translations and each user's selected stories. */
export const newsRepo = jsonRepo<NewsStore>("news.json", emptyNews);

/** One refresh attempt of one source. */
export type SourceRun = { sourceId: string; startedAt: string; finishedAt: string; durationMs: number; ok: boolean; itemCount: number; error?: string };
export const RUNS_KEPT = 50;

/** data/source-runs.json: the newest RUNS_KEPT runs per source, for the data health view and debugging. */
export const sourceRunsRepo = jsonRepo<{ runs: Record<string, SourceRun[]> }>("source-runs.json", () => ({ runs: {} }), { backup: false });

export async function recordRuns(list: SourceRun[]) {
  if (!list.length) return;
  await sourceRunsRepo.update((s) => {
    for (const r of list) s.runs[r.sourceId] = [...(s.runs[r.sourceId] ?? []), r].slice(-RUNS_KEPT);
  });
}

/** Failed sign-in attempts per account. Holds only times, never passwords. */
export type AuthState = { accounts: Record<string, { failures: string[]; lockedUntil?: string }> };
export const authStateRepo = jsonRepo<AuthState>("auth-state.json", () => ({ accounts: {} }), { backup: false });
