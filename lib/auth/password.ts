import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "crypto";

// One password per user, stored only as a scrypt hash in an environment variable
// (AUTH_HASH_AMONA, AUTH_HASH_BAHA), never in the code or in Git.
//
// Production (NODE_ENV=production): every user needs a valid hash and
// SESSION_SECRET must be set; otherwise the server refuses to start
// (instrumentation.ts) and sign-in refuses too. There is no default password.
// Development: a user without a hash can still sign in with LOCAL_PASSWORD
// (or the old local default "studio"), a temporary and insecure shortcut so
// nobody is locked out while hashes are set up. A warning is printed on every such
// attempt and shown on the sign-in page. It is never used in production and never
// as a fallback when a hash exists.

export const USER_IDS = ["amona", "baha"] as const;
export type UserId = (typeof USER_IDS)[number];
export const MIN_PASSWORD_LENGTH = 12;

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

const scrypt = (pw: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, keylen, opts, (e, k) => (e ? rej(e) : res(k))));

export const hashEnvName = (id: string) => `AUTH_HASH_${id.toUpperCase()}`;

/**
 * "scrypt:N:r:p:salt:hash", salt and hash in base64url. A new random salt every time.
 * Colons, not "$": Next.js expands "$NAME" inside .env values, which would corrupt the hash.
 */
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64url")}:${key.toString("base64url")}`;
}

function parse(stored: string) {
  // The older "$" separator is still read (it works when set directly in a host's environment settings).
  const m = /^scrypt([:$])(\d+)\1(\d+)\1(\d+)\1([A-Za-z0-9_-]{16,})\1([A-Za-z0-9_-]{32,})$/.exec(stored.trim());
  if (!m) return null;
  const [n, r, p] = [Number(m[2]), Number(m[3]), Number(m[4])];
  // Bounds keep a tampered value from asking for absurd work or memory.
  if (n < 1024 || n > 1 << 20 || (n & (n - 1)) !== 0 || r < 1 || r > 32 || p < 1 || p > 16) return null;
  const salt = Buffer.from(m[5], "base64url");
  const key = Buffer.from(m[6], "base64url");
  // Exact sizes only: a shortened key would still match, since scrypt's shorter output is a prefix of the longer one.
  if (salt.length !== 16 || key.length !== KEYLEN) return null;
  return { n, r, p, salt, key };
}

export const isValidHash = (stored: string | undefined) => !!stored && !!parse(stored);

/** Constant-time check of a password against a stored hash. A malformed hash never matches. */
export async function verifyPassword(pw: string, stored: string) {
  const h = parse(stored);
  if (!h) return false;
  const key = await scrypt(pw, h.salt, h.key.length, { N: h.n, r: h.r, p: h.p, maxmem: 256 * h.n * h.r + 1024 * 1024 });
  return key.length === h.key.length && timingSafeEqual(key, h.key);
}

type Env = Record<string, string | undefined>;
const isProd = (env: Env) => env.NODE_ENV === "production";

/** What is missing for production sign-in. Names only, never values. Empty means ready. */
export function productionAuthProblems(env: Env = process.env) {
  const problems: string[] = [];
  if (!env.SESSION_SECRET) problems.push("SESSION_SECRET is not set");
  else if (env.SESSION_SECRET.length < 32) problems.push("SESSION_SECRET is shorter than 32 characters");
  for (const id of USER_IDS) {
    const name = hashEnvName(id);
    if (!env[name]) problems.push(`${name} is not set`);
    else if (!isValidHash(env[name])) problems.push(`${name} is not a valid password hash (create one with npm run set-password)`);
  }
  return problems;
}

/**
 * Accounts that would sign in with the shared development password: only outside
 * production, and only accounts without a hash. Always empty in production.
 */
export function devSharedPasswordUsers(env: Env = process.env): UserId[] {
  if (isProd(env)) return [];
  return USER_IDS.filter((id) => !env[hashEnvName(id)]);
}

/** "ok", "bad" (wrong password) or "config" (sign-in is not set up; never falls back in production). */
export async function checkPassword(userId: string, pw: string, env: Env = process.env): Promise<"ok" | "bad" | "config"> {
  if (!(USER_IDS as readonly string[]).includes(userId)) return "bad";
  const stored = env[hashEnvName(userId)];
  if (isProd(env)) {
    if (productionAuthProblems(env).length) return "config";
    return (await verifyPassword(pw, stored!)) ? "ok" : "bad";
  }
  if (stored) {
    if (!isValidHash(stored)) return "config";
    return (await verifyPassword(pw, stored)) ? "ok" : "bad";
  }
  // Development only (production returned above), and only for an account without
  // a hash. Not a fallback for a failed or misconfigured sign-in: an account with a
  // hash, even an invalid one, never reaches this line.
  console.warn(`INSECURE, development only: ${userId} signed in with the shared temporary password because ${hashEnvName(userId)} is not set. Run npm run set-password -- ${userId}. This password is refused in production.`);
  const shared = Buffer.from(env.LOCAL_PASSWORD ?? "studio");
  const given = Buffer.from(pw);
  return given.length === shared.length && timingSafeEqual(given, shared) ? "ok" : "bad";
}
