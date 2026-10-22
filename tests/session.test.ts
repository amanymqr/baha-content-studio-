// Session token checks. Secrets are random per run; no real account or session is used.
import { createHmac, randomBytes } from "crypto";
import { SESSION_MAX_AGE_S, sessionSecret, signSession, verifySession } from "../lib/session-token";

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => { if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, ok ? "" : detail); };

const secret = randomBytes(32).toString("base64url");
const other = randomBytes(32).toString("base64url");
const now = Date.UTC(2026, 9, 20, 12);
const token = signSession("amona", secret, now);
const [, exp, sig] = token.split(".");

// A correct sign-in keeps working
check("a signed token is accepted", verifySession(token, secret, now) === "amona");
check("it stays valid until it expires", verifySession(token, secret, now + (SESSION_MAX_AGE_S - 60) * 1000) === "amona");

// Forged cookies are rejected
check("the old bare user id is rejected", verifySession("baha", secret, now) === null && verifySession("amona", secret, now) === null);
check("switching the user id keeps no access", verifySession(`baha.${exp}.${sig}`, secret, now) === null);
check("extending the expiry breaks the signature", verifySession(`amona.${Number(exp) + 999999}.${sig}`, secret, now) === null);
check("a changed signature is rejected", verifySession(`amona.${exp}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`, secret, now) === null);
check("a token signed with another secret is rejected", verifySession(signSession("baha", other, now), secret, now) === null);
const forged = `baha.${exp}`;
check("a token signed without a secret is rejected", verifySession(`${forged}.${createHmac("sha256", "").update(forged).digest("base64url")}`, secret, now) === null);

// Invalid sessions are treated as signed out
check("an expired token is rejected", verifySession(token, secret, now + SESSION_MAX_AGE_S * 1000) === null);
check("missing or empty cookie is rejected", verifySession(undefined, secret, now) === null && verifySession("", secret, now) === null);
check("malformed tokens are rejected", ["a.b", "a.b.c.d", "amona.notanumber." + sig, "AMONA." + exp + "." + sig, `amona.${exp}.`].every((x) => verifySession(x, secret, now) === null));
check("no secret means no session", verifySession(token, null, now) === null);
let threw = false;
try { signSession("bad id.x", secret, now); } catch { threw = true; }
check("signing refuses an id that could break the format", threw);

// Secret configuration
const env = process.env as Record<string, string | undefined>;
const saved = { s: env.SESSION_SECRET, n: env.NODE_ENV };
const quiet = console.error, warn = console.warn;
console.error = console.warn = () => {};
try {
  env.SESSION_SECRET = secret;
  check("SESSION_SECRET is used when set", sessionSecret() === secret);
  env.SESSION_SECRET = "short";
  check("a short SESSION_SECRET disables sign-in", sessionSecret() === null);
  delete env.SESSION_SECRET;
  env.NODE_ENV = "production";
  check("production without SESSION_SECRET disables sign-in", sessionSecret() === null);
  env.NODE_ENV = "development";
  const a = sessionSecret();
  check("development without SESSION_SECRET uses one random secret per process", !!a && a.length >= 32 && sessionSecret() === a);
} finally {
  console.error = quiet;
  console.warn = warn;
  if (saved.s === undefined) delete env.SESSION_SECRET; else env.SESSION_SECRET = saved.s;
  if (saved.n === undefined) delete env.NODE_ENV; else env.NODE_ENV = saved.n;
}

console.log(fail ? `${fail} FAILED` : "ALL PASSED");
process.exit(fail ? 1 : 0);
