// Safe JSON storage, daily backups, restore and Git exclusion. Runs in a temporary folder.
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { BACKUPS_KEPT, DataFileError, dailyBackup, readJson, updateJson } from "../lib/storage/json-file";
import { restoreBackup } from "../scripts/restore-backup";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };
const sha = async (f: string) => createHash("sha256").update(await fs.readFile(f)).digest("hex");
const repo = process.cwd();

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "baha-storage-"));
  try {
    const f = path.join(dir, "data", "thing.json");

    // Reading
    check("a missing file reads as the fallback", (await readJson(f, () => ({ n: 0 }))).n === 0);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, "{ not json");
    let threw: unknown = null;
    try { await readJson(f, () => ({})); } catch (e) { threw = e; }
    check("a damaged file throws instead of reading as empty", threw instanceof DataFileError);
    threw = null;
    try { await updateJson(f, () => ({ n: 0 }), (v: { n: number }) => { v.n = 1; }); } catch (e) { threw = e; }
    check("a damaged file is never written over", threw instanceof DataFileError && (await fs.readFile(f, "utf8")) === "{ not json");
    await fs.rm(f);

    // Writing
    await updateJson(f, () => ({ n: 0 }), (v: { n: number }) => { v.n = 1; });
    check("first write creates the file", JSON.parse(await fs.readFile(f, "utf8")).n === 1);
    await Promise.all(Array.from({ length: 40 }, () => updateJson(f, () => ({ n: 0 }), (v: { n: number }) => { v.n++; })));
    check("40 changes at once are all kept (each applied to the newest copy)", JSON.parse(await fs.readFile(f, "utf8")).n === 41);
    const left = (await fs.readdir(path.dirname(f))).filter((n) => n.endsWith(".tmp") || n.endsWith(".lock"));
    check("no temporary or lock files are left behind", left.length === 0, left.join());
    const r = await updateJson(f, () => ({ n: 0 }), (v: { n: number }) => v.n * 10);
    check("updateJson passes the change's result through", r === 410);

    // Lock shared with other processes
    await fs.writeFile(`${f}.lock`, "held");
    let done = false;
    const waiting = updateJson(f, () => ({ n: 0 }), (v: { n: number }) => { v.n = 99; }).then(() => (done = true));
    await new Promise((res) => setTimeout(res, 300));
    check("a write waits while another process holds the lock", !done && JSON.parse(await fs.readFile(f, "utf8")).n === 41);
    await fs.rm(`${f}.lock`);
    await waiting;
    check("the write goes through once the lock is released", done && JSON.parse(await fs.readFile(f, "utf8")).n === 99);
    await fs.writeFile(`${f}.lock`, "left behind");
    const old = new Date(Date.now() - 10 * 60_000);
    await fs.utimes(`${f}.lock`, old, old);
    await updateJson(f, () => ({ n: 0 }), (v: { n: number }) => { v.n = 7; });
    check("a lock left behind for over five minutes is cleared", JSON.parse(await fs.readFile(f, "utf8")).n === 7);

    // Daily backups
    const backups = path.join(dir, "data", "backups");
    const listB = async () => (await fs.readdir(backups)).filter((n) => n.startsWith("thing-")).sort();
    check("a backup of today exists after the first write", (await listB()).length === 1);
    await updateJson(f, () => ({ n: 0 }), (v: { n: number }) => { v.n = 8; });
    check("only one backup per day", (await listB()).length === 1);
    for (let d = 1; d <= 20; d++) await dailyBackup(f, new Date(Date.UTC(2026, 0, d)));
    const kept = await listB();
    check(`only the newest ${BACKUPS_KEPT} backups are kept`, kept.length === BACKUPS_KEPT && kept.at(-1)!.includes(new Date().toISOString().slice(0, 10)), kept.join());
    check("a backup holds the file as it was before the day's first change", JSON.parse(await fs.readFile(path.join(backups, kept.at(-1)!), "utf8")).n === 1);

    // Restore
    const live = path.join(dir, "live");
    const bk = path.join(dir, "bk");
    await fs.mkdir(live);
    await fs.mkdir(bk);
    const good = { drafts: { a: { id: "a" } } };
    await fs.writeFile(path.join(bk, "drafts.json"), JSON.stringify(good));
    const h = await sha(path.join(bk, "drafts.json"));
    await fs.writeFile(path.join(bk, "MANIFEST.txt"), `Name | Size | SHA-256\ndrafts.json | 1 | ${h.toUpperCase()}\n`);
    await fs.writeFile(path.join(live, "drafts.json"), "{ damaged");
    const dry = await restoreBackup({ source: bk, targetDir: live, apply: false });
    check("a restore without --yes only reports and changes nothing", dry.files.length === 1 && dry.files[0].manifestChecked && (await fs.readFile(path.join(live, "drafts.json"), "utf8")) === "{ damaged");
    const done2 = await restoreBackup({ source: bk, targetDir: live, apply: true });
    check("a restore brings back the backup exactly", (await sha(path.join(live, "drafts.json"))) === h);
    check("the replaced file is kept as a safety copy first", !!done2.safetyDir && (await fs.readFile(path.join(done2.safetyDir!, "drafts.json"), "utf8")) === "{ damaged");
    await fs.writeFile(path.join(bk, "drafts.json"), JSON.stringify({ drafts: {} }));
    threw = null;
    try { await restoreBackup({ source: bk, targetDir: live, apply: true }); } catch (e) { threw = e; }
    check("a backup that doesn't match its manifest is refused", !!threw && (await sha(path.join(live, "drafts.json"))) === h);
    await fs.writeFile(path.join(bk, "drafts.json"), "{ bad");
    await fs.rm(path.join(bk, "MANIFEST.txt"));
    threw = null;
    try { await restoreBackup({ source: bk, targetDir: live, apply: true }); } catch (e) { threw = e; }
    check("a backup that isn't valid JSON is refused", !!threw && (await sha(path.join(live, "drafts.json"))) === h);
    const single = path.join(dir, "news-2026-10-21.json");
    await fs.writeFile(single, JSON.stringify({ items: {} }));
    await restoreBackup({ source: single, targetDir: live, apply: true });
    check("a daily backup file restores to its original name", JSON.stringify(JSON.parse(await fs.readFile(path.join(live, "news.json"), "utf8"))) === '{"items":{}}');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }

  // Git never takes private data, backups or secrets (read-only checks on the real repository)
  const ignored = (p: string) => { try { execFileSync("git", ["check-ignore", "-q", p], { cwd: repo }); return true; } catch { return false; } };
  const privatePaths = ["data/db.json", "data/news.json", "data/drafts.json", "data/auth-state.json", "data/source-runs.json", "data/backups/news-2026-10-21.json", "data/news.json.lock", ".env.local", ".env", ".env.production"];
  const notIgnored = privatePaths.filter((p) => !ignored(p));
  check("data, backups, locks, auth state and env files are ignored by Git", notIgnored.length === 0, notIgnored.join());
  const tracked = execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" }).split("\n").filter((p) => /^data\/|(^|\/)\.env/.test(p));
  check("no data or env file is tracked", tracked.length === 0, tracked.join());
  let hashes = "";
  try { hashes = execFileSync("git", ["grep", "-l", "-E", "AUTH_HASH_[A-Z]+=scrypt", "--", "."], { cwd: repo, encoding: "utf8" }); } catch { hashes = ""; }
  check("no password hash value is in a tracked file", hashes.trim() === "", hashes);
}

main().then(() => {
  console.log(fail ? `${fail} FAILED` : "ALL PASSED");
  process.exit(fail ? 1 : 0);
});
