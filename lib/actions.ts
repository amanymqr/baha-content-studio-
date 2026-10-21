"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser, updateSettings, type ContentLanguage, type Locale, type User, type UserSettings } from "./db";
import { SESSION_COOKIE, requireUser } from "./session";
import { SESSION_MAX_AGE_S, sessionSecret, signSession } from "./session-token";

// Version 1 uses one shared local password. Real accounts move to Supabase Auth later.
const LOCAL_PASSWORD = process.env.LOCAL_PASSWORD ?? "studio";

export async function signIn(_: unknown, form: FormData) {
  const id = String(form.get("user"));
  const user = await getUser(id);
  if (!user || form.get("password") !== LOCAL_PASSWORD) return { error: "credentials" as const };
  const secret = sessionSecret();
  if (!secret) return { error: "config" as const };
  (await cookies()).set(SESSION_COOKIE, signSession(user.id, secret), { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_S });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setInterfaceLanguage(locale: Locale, userId?: User["id"]) {
  const me = await requireUser();
  await updateSettings(userId ?? me.id, { interfaceLanguage: locale });
  revalidatePath("/", "layout");
}

export async function setContentLanguage(lang: ContentLanguage) {
  const me = await requireUser();
  await updateSettings(me.id, { contentLanguage: lang });
  revalidatePath("/", "layout");
}

export async function saveSettings(patch: Pick<UserSettings, "contentLanguage" | "notifications" | "explanations">, languages: Partial<Record<User["id"], Locale>>) {
  const me = await requireUser();
  await updateSettings(me.id, patch);
  for (const [id, locale] of Object.entries(languages)) {
    if (locale) await updateSettings(id as User["id"], { interfaceLanguage: locale });
  }
  revalidatePath("/", "layout");
}
