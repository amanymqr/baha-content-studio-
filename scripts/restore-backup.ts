// Restores data files from a backup.
//
//   npm run restore-backup -- <backup>          check only, changes nothing
//   npm run restore-backup -- <backup> --yes    restore into data/
//
// <backup> is either a backup folder with MANIFEST.txt (for example
// C:\path\to\backups\data-2026-10-21_114821) or one daily file from data/backups,
// e.g. data/backups/news-2026-10-21.json. Every file must be valid JSON and, when
// a manifest exists, match its SHA-256. The files being replaced are first copied
// to data/backups/pre-restore-<time>/, so a restore can itself be undone.
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/** A file that passed the checks: valid JSON and, when there is a manifest, the same SHA-256. */
type Planned = { name: string; from: string; to: string; sha256: string; manifestChecked: boolean };

const DAILY = /^(.+)-\d{4}-\d{2}-\d{2}\.json$/;

async function sha(file: string) {
  return createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function manifestOf(dir: string) {
  try {
    const text = await fs.readFile(path.join(dir, "MANIFEST.txt"), "utf8");
    const map = new Map<string, string>();
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^(\S+\.json) \| \d+ \| ([0-9A-Fa-f]{64})$/);
      if (m) map.set(m[1], m[2].toLowerCase());
    }
    return map;
  } catch {
    return null;
  }
}

export async function restoreBackup({ source, targetDir, apply }: { source: string; targetDir: string; apply: boolean }) {
  const st = await fs.stat(source);
  let pairs: { from: string; name: string }[];
  let manifest: Map<string, string> | null = null;
  if (st.isDirectory()) {
    manifest = await manifestOf(source);
    pairs = (await fs.readdir(source)).filter((n) => n.endsWith(".json")).map((n) => ({ from: path.join(source, n), name: n }));
  } else {
    const base = path.basename(source);
    pairs = [{ from: source, name: `${DAILY.exec(base)?.[1] ?? base.replace(/\.json$/, "")}.json` }];
  }
  if (!pairs.length) throw new Error("No .json files in the backup");

  const files: Planned[] = [];
  for (const p of pairs) {
    const hash = await sha(p.from);
    try {
      JSON.parse(await fs.readFile(p.from, "utf8"));
    } catch {
      throw new Error(`${p.name} in the backup is not valid JSON; nothing was restored`);
    }
    if (manifest) {
      const want = manifest.get(p.name);
      if (!want) throw new Error(`${p.name} is not listed in MANIFEST.txt; nothing was restored`);
      if (want !== hash) throw new Error(`${p.name} does not match MANIFEST.txt; nothing was restored`);
    }
    files.push({ name: p.name, from: p.from, to: path.join(targetDir, p.name), sha256: hash, manifestChecked: !!manifest });
  }
  if (!apply) return { files, safetyDir: null as string | null };

  const safetyDir = path.join(targetDir, "backups", `pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  await fs.mkdir(safetyDir, { recursive: true });
  for (const f of files) {
    try {
      await fs.copyFile(f.to, path.join(safetyDir, f.name));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  for (const f of files) {
    const tmp = `${f.to}.restore.tmp`;
    await fs.copyFile(f.from, tmp);
    await fs.rename(tmp, f.to);
    if ((await sha(f.to)) !== f.sha256) throw new Error(`${f.name} did not restore cleanly; the previous copy is in ${safetyDir}`);
  }
  return { files, safetyDir };
}

if (/restore-backup\.ts$/.test(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const source = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--yes");
  if (!source) {
    console.error("Usage: npm run restore-backup -- <backup folder or daily file> [--yes]");
    process.exit(2);
  }
  restoreBackup({ source: path.resolve(source), targetDir: path.join(process.cwd(), "data"), apply })
    .then(({ files, safetyDir }) => {
      for (const f of files) console.log(`${apply ? "restored" : "would restore"} ${f.name}  sha256 ${f.sha256.slice(0, 16)}…`);
      console.log(apply ? `Done. Replaced files were saved in ${safetyDir}` : "Checked only. Add --yes to restore. Stop the app first.");
    })
    .catch((e) => {
      console.error((e as Error).message);
      process.exit(1);
    });
}
