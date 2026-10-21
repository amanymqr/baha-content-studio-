import "server-only";
import { authStateRepo } from "../storage/repositories";

// Failed sign-in limit, kept on the server in data/auth-state.json:
// MAX_FAILURES wrong passwords for one account within WINDOW_MS lock that account
// for LOCK_MS. The file holds only times per account (no passwords, no IP
// addresses), so a lock survives a server restart and expired entries are ignored.
// If the file can't be read, these functions throw and sign-in stays closed;
// deleting data/auth-state.json by hand resets every lock.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60_000;
export const LOCK_MS = 15 * 60_000;

/** When the account is locked, the time the lock ends; otherwise null. */
export async function lockedUntil(id: string, now = Date.now()) {
  const until = (await authStateRepo.read()).accounts[id]?.lockedUntil;
  return until && Date.parse(until) > now ? until : null;
}

/** Records a wrong password. Returns the lock end time when this failure locks the account. */
export async function recordFailure(id: string, now = Date.now()) {
  return authStateRepo.update((s) => {
    const a = s.accounts[id] ?? { failures: [] };
    a.failures = a.failures.filter((t) => now - Date.parse(t) < WINDOW_MS);
    a.failures.push(new Date(now).toISOString());
    if (a.failures.length >= MAX_FAILURES) {
      a.lockedUntil = new Date(now + LOCK_MS).toISOString();
      a.failures = [];
    }
    s.accounts[id] = a;
    return a.lockedUntil && Date.parse(a.lockedUntil) > now ? a.lockedUntil : null;
  });
}

/** Clears the account's failures after a correct password. Writes only when there is something to clear. */
export async function recordSuccess(id: string) {
  if (!(await authStateRepo.read()).accounts[id]) return;
  await authStateRepo.update((s) => {
    delete s.accounts[id];
  });
}
