import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "./db";
import { sessionSecret, verifySession } from "./session-token";

export const SESSION_COOKIE = "studio_uid";

/** The signed-in user, only when the cookie carries a valid signed token for an existing account. */
export async function currentUser() {
  const id = verifySession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret());
  return id ? getUser(id) : undefined;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
