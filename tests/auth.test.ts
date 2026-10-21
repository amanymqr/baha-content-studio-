// Per-user passwords, production configuration and the failed sign-in limit.
// Passwords and secrets here are random per run; runs in a temporary folder.
import { execFileSync } from "child_process";
import { randomBytes } from "crypto";
import { pathToFileURL } from "url";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { checkPassword, devSharedPasswordUsers, hashEnvName, hashPassword, isValidHash, productionAuthProblems, verifyPassword } from "../lib/auth/password";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };
const rnd = () => randomBytes(12).toString("base64url");
const repoRoot = process.cwd();

async function main() {
  // Hashing
  const pwA = rnd();
  const pwB = rnd();
  const hA = await hashPassword(pwA);
  const hB = await hashPassword(pwB);
  check("a hash is in the expected scrypt format and does not contain the password", isValidHash(hA) && hA.startsWith("scrypt$") && !hA.includes(pwA));
  check("the same password hashes differently each time (random salt)", (await hashPassword(pwA)) !== hA);
  check("the right password matches", await verifyPassword(pwA, hA));
  check("a wrong password does not match", !(await verifyPassword(`${pwA}x`, hA)) && !(await verifyPassword("", hA)));
  check("a malformed or tampered hash never matches", !(await verifyPassword(pwA, "scrypt$16384$8$1$abc$def")) && !(await verifyPassword(pwA, hA.slice(0, -4))) && !isValidHash("plain-password") && !isValidHash(`scrypt$999999999$8$1$${hA.split("$")[4]}$${hA.split("$")[5]}`));

  // Separate passwords per user
  const secret = randomBytes(32).toString("base64url");
  const prod = { NODE_ENV: "production", SESSION_SECRET: secret, [hashEnvName("amona")]: hA, [hashEnvName("baha")]: hB };
  check("production with both hashes and the secret has no problems", productionAuthProblems(prod).length === 0);
  check("each user signs in with their own password", (await checkPassword("amona", pwA, prod)) === "ok" && (await checkPassword("baha", pwB, prod)) === "ok");
  check("one user's password does not open the other account", (await checkPassword("amona", pwB, prod)) === "bad" && (await checkPassword("baha", pwA, prod)) === "bad");
  check("an unknown account is refused", (await checkPassword("someone", pwA, prod)) === "bad");

  // Production never falls back to a default password
  const noHashes = { NODE_ENV: "production", SESSION_SECRET: secret, LOCAL_PASSWORD: "studio" };
  check("production without hashes reports both missing (names only)", productionAuthProblems(noHashes).join("|") === "AUTH_HASH_AMONA is not set|AUTH_HASH_BAHA is not set");
  check("production without hashes refuses 'studio' and LOCAL_PASSWORD", (await checkPassword("amona", "studio", noHashes)) === "config");
  const oneHash = { ...noHashes, [hashEnvName("amona")]: hA };
  check("production with only one hash refuses both accounts", (await checkPassword("amona", pwA, oneHash)) === "config" && (await checkPassword("baha", "studio", oneHash)) === "config");
  check("production without SESSION_SECRET is not ready", productionAuthProblems({ ...prod, SESSION_SECRET: undefined }).includes("SESSION_SECRET is not set"));
  check("production with a short SESSION_SECRET is not ready", productionAuthProblems({ ...prod, SESSION_SECRET: "short" }).some((p) => p.includes("shorter than 32")));
  const badHash = { ...prod, [hashEnvName("baha")]: "not-a-hash" };
  check("a malformed hash is reported and refused", productionAuthProblems(badHash).some((p) => p.startsWith("AUTH_HASH_BAHA is not a valid")) && (await checkPassword("baha", "not-a-hash", badHash)) === "config");
  check("problem messages never contain secret values", !productionAuthProblems(badHash).join(" ").includes(secret) && !productionAuthProblems(badHash).join(" ").includes(hA));

  // Development: a user without a hash keeps the shared development password, a user with one must use it
  const warn = console.warn;
  console.warn = () => {};
  const dev = { NODE_ENV: "development", LOCAL_PASSWORD: "dev-only-pass", [hashEnvName("amona")]: hA };
  check("development: a user with a hash must use their own password", (await checkPassword("amona", pwA, dev)) === "ok" && (await checkPassword("amona", "dev-only-pass", dev)) === "bad");
  check("development: a user without a hash can use LOCAL_PASSWORD", (await checkPassword("baha", "dev-only-pass", dev)) === "ok" && (await checkPassword("baha", "wrong", dev)) === "bad");

  // "studio": development only, temporary, never in production and never as a fallback
  const devPlain = { NODE_ENV: "development" };
  check("studio: works in development for an account without a hash", (await checkPassword("amona", "studio", devPlain)) === "ok" && (await checkPassword("baha", "studio", devPlain)) === "ok");
  check("studio: refused in production without hashes (sign-in closed, not opened)", (await checkPassword("amona", "studio", { NODE_ENV: "production" })) === "config" && (await checkPassword("baha", "studio", { NODE_ENV: "production", SESSION_SECRET: secret })) === "config");
  check("studio: refused in production with hashes set", (await checkPassword("amona", "studio", prod)) === "bad" && (await checkPassword("baha", "studio", prod)) === "bad");
  check("studio: refused in production even when LOCAL_PASSWORD is studio", (await checkPassword("amona", "studio", { ...prod, LOCAL_PASSWORD: "studio" })) === "bad");
  check("studio: not a fallback in development once the account has a hash", (await checkPassword("amona", "studio", { NODE_ENV: "development", [hashEnvName("amona")]: hA })) === "bad");
  check("studio: not a fallback when the account's hash is invalid", (await checkPassword("amona", "studio", { NODE_ENV: "development", [hashEnvName("amona")]: "broken" })) === "config");
  check("studio: replaced by LOCAL_PASSWORD when that is set", (await checkPassword("amona", "studio", { NODE_ENV: "development", LOCAL_PASSWORD: "other-dev-pass" })) === "bad");
  check("the development warning lists only accounts without a hash, and nobody in production", devSharedPasswordUsers({ NODE_ENV: "development", [hashEnvName("amona")]: hA }).join() === "baha" && devSharedPasswordUsers({ NODE_ENV: "production" }).length === 0 && devSharedPasswordUsers(prod).length === 0);
  console.warn = warn;
  let warning = "";
  console.warn = (m: string) => { warning = m; };
  await checkPassword("baha", "studio", devPlain);
  console.warn = warn;
  check("each use of the shared password prints an insecure, development-only warning", /INSECURE, development only/.test(warning) && warning.includes("refused in production") && !warning.includes("studio"));

  // The sign-in form sends the account the user picked, not the first one, after a failed attempt
  const form = await fs.readFile(path.join(repoRoot, "app", "login", "LoginForm.tsx"), "utf8");
  check("the form sends the chosen account from state (hidden 'user' field), and the radios are not submitted", /<input type="hidden" name="user" value=\{selected/.test(form) && /type="radio" name="account"/.test(form) && !/type="radio" name="user"/.test(form));

  // Failed sign-in limit, stored on the server
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "baha-auth-"));
  process.chdir(dir);
  try {
    const { MAX_FAILURES, LOCK_MS, WINDOW_MS, lockedUntil, recordFailure, recordSuccess } = await import("../lib/auth/lockout");
    const { authStateRepo } = await import("../lib/storage/repositories");
    const t0 = Date.UTC(2026, 9, 21, 12);
    for (let i = 1; i < MAX_FAILURES; i++) await recordFailure("amona", t0 + i * 1000);
    check(`${MAX_FAILURES - 1} wrong passwords do not lock the account`, (await lockedUntil("amona", t0 + 5000)) === null);
    const lockedAt = await recordFailure("amona", t0 + 6000);
    check(`the ${MAX_FAILURES}th wrong password locks it`, !!lockedAt && (await lockedUntil("amona", t0 + 7000)) !== null);
    check("the other account is not affected", (await lockedUntil("baha", t0 + 7000)) === null);
    const stored = JSON.parse(await fs.readFile(authStateRepo.file(), "utf8"));
    check("the lock is saved on the server (data/auth-state.json) with times only", !!stored.accounts.amona.lockedUntil && !JSON.stringify(stored).includes(pwA));

    // A restart: a brand-new process with nothing in memory reads the same file
    const tsx = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const lockout = pathToFileURL(path.join(repoRoot, "lib", "auth", "lockout.ts")).href;
    const out = execFileSync(process.execPath, [tsx, "--conditions=react-server", "-e", `import(${JSON.stringify(lockout)}).then(async (m) => console.log(JSON.stringify(await m.lockedUntil("amona", ${t0 + 60_000}))))`], { cwd: dir, encoding: "utf8" }).trim();
    check("the lock still holds after a restart (new process, read back from the file)", out !== "null" && out.length > 0, out);
    check("the lock ends after 15 minutes", (await lockedUntil("amona", t0 + 6000 + LOCK_MS + 1)) === null);

    await recordFailure("baha", t0);
    await recordFailure("baha", t0 + 1000);
    for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailure("baha", t0 + WINDOW_MS + 5000 + i);
    check("failures older than 15 minutes don't count", (await lockedUntil("baha", t0 + WINDOW_MS + 10_000)) === null);
    await recordSuccess("baha");
    check("a correct password clears the failures", !(await authStateRepo.read()).accounts.baha);

    await fs.writeFile(authStateRepo.file(), "{ damaged");
    let threw = false;
    try { await lockedUntil("amona"); } catch { threw = true; }
    let threw2 = false;
    try { await recordFailure("amona"); } catch { threw2 = true; }
    check("a damaged auth-state file keeps sign-in closed and is not written over", threw && threw2 && (await fs.readFile(authStateRepo.file(), "utf8")) === "{ damaged");
  } finally {
    process.chdir(repoRoot);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

main().then(() => {
  console.log(fail ? `${fail} FAILED` : "ALL PASSED");
  process.exit(fail ? 1 : 0);
});
