import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "./db";

export const SESSION_COOKIE = "studio_uid";

export async function currentUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUser(id);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
