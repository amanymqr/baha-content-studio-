import "server-only";
import { randomBytes } from "crypto";
import { constants, promises as fs } from "fs";
import path from "path";

// Safe JSON files for the local store. Every write in the app goes through
// updateJson, which:
// - reads the newest copy of the file and applies the change to it, so a slow
//   task (a news refresh) never writes back an older copy over someone's edit;
// - never writes over a file it could not parse; it throws and leaves it as is;
// - writes to a temporary file and renames it, so a crash can't leave half a file;
// - queues writes per file inside this process and takes a lock file shared with
//   other processes (the dev server and `npm run refresh`);
// - copies the file to data/backups once a day before the first change.
// The files keep the same format as before; nothing here changes their contents.

export class DataFileError extends Error {}

/** data/ under the current working directory, resolved at call time so tests can use a temporary folder. */
export const dataDir = () => path.join(process.cwd(), "data");
export const dataFile = (name: string) => path.join(dataDir(), name);

const LOCK_STALE_MS = 5 * 60_000;
const LOCK_WAIT_MS = 15_000;
export const BACKUPS_KEPT = 14;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const code = (e: unknown) => (e as NodeJS.ErrnoException)?.code;

/** Reads a JSON file. A missing file gives the fallback; a file that can't be parsed throws. */
export async function readJson<T>(file: string, fallback: () => T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    if (code(e) === "ENOENT") return fallback();
    throw new DataFileError(`Could not read ${path.basename(file)}`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new DataFileError(`${path.basename(file)} is not valid JSON; it was left unchanged`);
  }
}

/** Lock shared between processes: a .lock file created exclusively. A lock older than five minutes is treated as left behind and removed. */
async function lock(file: string) {
  const lockFile = `${file}.lock`;
  const started = Date.now();
  for (;;) {
    try {
      const h = await fs.open(lockFile, "wx");
      await h.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      await h.close();
      return async () => {
        await fs.rm(lockFile, { force: true });
      };
    } catch (e) {
      if (code(e) !== "EEXIST") throw e;
      const st = await fs.stat(lockFile).catch(() => null);
      if (st && Date.now() - st.mtimeMs > LOCK_STALE_MS) {
        await fs.rm(lockFile, { force: true });
        continue;
      }
      if (Date.now() - started > LOCK_WAIT_MS) throw new DataFileError(`${path.basename(file)} is busy (locked by another process)`);
      await sleep(25 + Math.random() * 75);
    }
  }
}

/** Renames with a few retries: on Windows a reader holding the file open can briefly block the replace. */
async function replace(tmp: string, file: string) {
  for (let i = 0; ; i++) {
    try {
      return await fs.rename(tmp, file);
    } catch (e) {
      if (i >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(code(e) ?? "")) {
        await fs.rm(tmp, { force: true });
        throw e;
      }
      await sleep(40 * (i + 1));
    }
  }
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);

/** Copies the file to data/backups/<name>-<yyyy-mm-dd>.json once a day, keeping the newest BACKUPS_KEPT per file. */
export async function dailyBackup(file: string, now = new Date()) {
  const dir = path.join(path.dirname(file), "backups");
  const base = path.basename(file, ".json");
  const target = path.join(dir, `${base}-${today(now)}.json`);
  try {
    await fs.access(file);
  } catch {
    return null;
  }
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.copyFile(file, target, constants.COPYFILE_EXCL);
  } catch (e) {
    if (code(e) !== "EEXIST") throw e;
    return null;
  }
  const mine = (await fs.readdir(dir)).filter((n) => new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(n)).sort();
  for (const old of mine.slice(0, Math.max(0, mine.length - BACKUPS_KEPT))) await fs.rm(path.join(dir, old), { force: true });
  return target;
}

const queues = new Map<string, Promise<unknown>>();

/**
 * Applies a change to the newest copy of a JSON file and writes it back safely.
 * `change` may edit the value in place; its return value is passed through.
 */
export function updateJson<T, R>(file: string, fallback: () => T, change: (value: T) => R | Promise<R>, opts: { backup?: boolean } = {}): Promise<R> {
  const prev = queues.get(file) ?? Promise.resolve();
  const run = prev.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const release = await lock(file);
    try {
      const value = await readJson(file, fallback);
      const result = await change(value);
      if (opts.backup !== false) await dailyBackup(file);
      const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value, null, 2));
      await replace(tmp, file);
      return result;
    } finally {
      await release();
    }
  });
  queues.set(file, run.catch(() => undefined));
  return run;
}
