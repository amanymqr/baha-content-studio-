import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Signed session tokens. The cookie used to hold the bare user id, so anyone
// could set it by hand and be signed in as that user. A token is now
// "<user id>.<expiry>.<signature>", where the signature is an HMAC-SHA256 of the
// first two parts with a server secret. Changing any part breaks the signature.
//
// The secret comes from SESSION_SECRET (at least 32 characters). In development
// only, when it isn't set, a random secret is made for this server process, so
// sessions end when the server restarts. In production a missing secret means
// nobody can sign in, rather than signing with a guessable value.

export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;
const MIN_SECRET = 32;
const ID = /^[a-z0-9_-]{1,64}$/;

const g = globalThis as { __studioDevSecret?: string; __studioSecretWarned?: boolean };

/** The signing secret, or null when the server isn't configured for sessions. */
export function sessionSecret(): string | null {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= MIN_SECRET) return env;
  if (env) console.error(`SESSION_SECRET is shorter than ${MIN_SECRET} characters; sign-in is disabled.`);
  if (env || process.env.NODE_ENV === "production") {
    if (!env) console.error("SESSION_SECRET is not set; sign-in is disabled. Add it to .env.local and restart.");
    return null;
  }
  if (!g.__studioSecretWarned) {
    console.warn("SESSION_SECRET is not set; using a temporary secret for this development server. Sessions end when it restarts.");
    g.__studioSecretWarned = true;
  }
  return (g.__studioDevSecret ??= randomBytes(32).toString("base64url"));
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function signSession(userId: string, secret: string, now = Date.now()): string {
  if (!ID.test(userId)) throw new Error("invalid user id");
  const payload = `${userId}.${Math.floor(now / 1000) + SESSION_MAX_AGE_S}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the user id of a valid, unexpired token signed with this secret, otherwise null. */
export function verifySession(token: string | undefined, secret: string | null, now = Date.now()): string | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!ID.test(userId) || !/^\d{1,12}$/.test(exp)) return null;
  const expected = Buffer.from(sign(`${userId}.${exp}`, secret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) * 1000 <= now) return null;
  return userId;
}
